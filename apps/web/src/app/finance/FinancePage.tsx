import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Download, Plus, Trash2 } from 'lucide-react';
import type { ExpenseCategory } from '@darnalux/core';
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_CATEGORY_TONES,
  MONTH_LABELS,
  PERMISSIONS,
  computePeriodPerformance,
  formatMoney,
  formatPercent,
  hasPermission,
  performanceByProperty,
  personFullName,
  shiftMonth,
  startOfMonth,
  startOfNextMonth,
  toLocalISODate,
} from '@darnalux/core';
import { useAuth } from '../../features/auth/AuthContext';
import { isPortalUser } from '../../features/auth/portal';
import { listPropertyOptions } from '../../features/properties/api';
import { listReservationsForPeriod } from '../../features/reservations/api';
import type { ExpenseRow } from '../../features/finance/api';
import { createExpense, deleteExpense, listExpenses, listPropertyOwnerLinks } from '../../features/finance/api';
import { useAsync } from '../../lib/useAsync';
import { toUserMessage } from '../../lib/errors';
import { downloadCsv } from '../../lib/files';
import { formatDate } from '../../lib/format';
import { Badge, EmptyState, Modal, PageHeader, Section, SelectField, StatCard, TextField, optionsFrom } from '../../components/ui';
import { ErrorAlert, Loading } from '../../components/Feedback';

function toPerformanceInput(rows: Awaited<ReturnType<typeof listReservationsForPeriod>>, expenses: ExpenseRow[]) {
  return {
    reservations: rows.map((r) => ({
      propertyId: r.property_id,
      checkIn: r.check_in,
      checkOut: r.check_out,
      status: r.status,
      grossAmount: Number(r.gross_amount),
      commissionRate: Number(r.commission_rate),
      platformFees: Number(r.platform_fees),
    })),
    expenses: expenses.map((e) => ({ propertyId: e.property_id, amount: Number(e.amount), incurredOn: e.incurred_on, chargedToOwner: e.charged_to_owner })),
  };
}

export default function FinancePage() {
  const { user } = useAuth();
  const portal = isPortalUser(user);
  const canManage = hasPermission(user, PERMISSIONS.FINANCE_MANAGE);
  const canExport = hasPermission(user, PERMISSIONS.REPORTS_EXPORT) || portal;
  const now = new Date();
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const year = Number(month.slice(0, 4));
  const monthIndex = Number(month.slice(5, 7)) - 1;
  const from = startOfMonth(year, monthIndex);
  const to = startOfNextMonth(year, monthIndex);
  const trendStart = (() => {
    const start = shiftMonth(year, monthIndex, -11);
    return startOfMonth(start.year, start.monthIndex);
  })();

  const properties = useAsync(listPropertyOptions, []);
  const data = useAsync(async () => {
    const [reservations, expenses, links] = await Promise.all([
      listReservationsForPeriod(trendStart, to),
      listExpenses(trendStart, to),
      portal ? Promise.resolve([]) : listPropertyOwnerLinks().catch(() => []),
    ]);
    return { reservations, expenses, links };
  }, [trendStart, to, portal]);

  const computed = useMemo(() => {
    if (!data.data || !properties.data) return null;
    const activeProperties = properties.data.filter((p) => p.status === 'ACTIVE');
    const input = toPerformanceInput(data.data.reservations, data.data.expenses);
    const total = computePeriodPerformance({ periodStart: from, periodEnd: to, propertyCount: activeProperties.length, ...input });
    const perProperty = performanceByProperty(properties.data.map((p) => p.id), { periodStart: from, periodEnd: to, ...input });
    const trend = Array.from({ length: 12 }, (_, i) => {
      const m = shiftMonth(year, monthIndex, i - 11);
      const perf = computePeriodPerformance({
        periodStart: startOfMonth(m.year, m.monthIndex),
        periodEnd: startOfNextMonth(m.year, m.monthIndex),
        propertyCount: activeProperties.length,
        ...input,
      });
      return { label: MONTH_LABELS[m.monthIndex].slice(0, 3), revenue: perf.revenue, commissions: perf.commissions };
    });
    const owners = new Map<string, { name: string; gross: number; net: number }>();
    for (const link of data.data.links) {
      const perf = perProperty.get(link.property_id);
      if (!perf) continue;
      const share = Number(link.share_percent) / 100;
      const current = owners.get(link.owner_id) ?? { name: link.owners ? personFullName(link.owners.first_name, link.owners.last_name) : '—', gross: 0, net: 0 };
      current.gross += perf.revenue * share;
      current.net += perf.ownerNet * share;
      owners.set(link.owner_id, current);
    }
    return { total, perProperty, trend, owners: [...owners.entries()].sort((a, b) => b[1].net - a[1].net) };
  }, [data.data, properties.data, from, to, year, monthIndex]);

  const monthExpenses = (data.data?.expenses ?? []).filter((e) => e.incurred_on >= from && e.incurred_on < to);
  const maxTrend = Math.max(1, ...(computed?.trend.map((t) => t.revenue) ?? [1]));

  function exportCsv() {
    if (!computed || !properties.data) return;
    downloadCsv(`finances-${month}.csv`, [
      ['Bien', 'Nuits', 'Occupation (%)', 'Revenu brut', 'Commission', 'Frais', 'Dépenses', 'Net propriétaire', 'ADR', 'RevPAR'],
      ...properties.data.map((p) => {
        const perf = computed.perProperty.get(p.id)!;
        return [
          p.name,
          perf.nightsBooked,
          perf.occupancyRate === null ? null : Number(perf.occupancyRate.toFixed(1)),
          perf.revenue,
          perf.commissions,
          perf.platformFees,
          perf.expenses,
          perf.ownerNet,
          perf.adr,
          perf.revpar,
        ];
      }),
    ]);
  }

  async function removeExpense(expense: ExpenseRow) {
    if (!window.confirm('Supprimer cette dépense ?')) return;
    try {
      await deleteExpense(expense.id);
      data.reload();
    } catch (err) {
      window.alert(toUserMessage(err));
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        title={portal ? 'Mes revenus' : 'Revenus & finances'}
        subtitle="Revenu brut − commission DarnaLux − frais − dépenses = net propriétaire."
        actions={
          <>
            <input type="month" aria-label="Mois" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
            {canExport && (
              <button type="button" className="btn btn-ghost" onClick={exportCsv} disabled={!computed}>
                <Download size={16} aria-hidden="true" /> CSV
              </button>
            )}
            {canManage && (
              <button type="button" className="btn btn-primary" onClick={() => setExpenseOpen(true)}>
                <Plus size={16} aria-hidden="true" /> Dépense
              </button>
            )}
          </>
        }
      />
      {(data.loading || properties.loading) && <Loading />}
      {(data.error || properties.error) && <ErrorAlert>{data.error ?? properties.error}</ErrorAlert>}
      {computed && (
        <>
          <div className="kpis">
            <StatCard label="Revenu brut" value={formatMoney(computed.total.revenue)} note={`${computed.total.reservations} séjour(s)`} />
            <StatCard label="Commissions DarnaLux" value={formatMoney(computed.total.commissions)} />
            <StatCard label="Frais & dépenses" value={formatMoney(computed.total.platformFees + computed.total.expenses)} />
            <StatCard label="Net propriétaires" value={formatMoney(computed.total.ownerNet)} tone="success" />
            <StatCard label="Taux d'occupation" value={formatPercent(computed.total.occupancyRate)} note={`${computed.total.nightsBooked} nuits réservées`} />
            <StatCard label="ADR" value={computed.total.adr === null ? '—' : formatMoney(computed.total.adr)} note="Prix moyen par nuit" />
            <StatCard label="RevPAR" value={computed.total.revpar === null ? '—' : formatMoney(computed.total.revpar)} note="Revenu par nuit disponible" />
            <StatCard label="Annulations" value={computed.total.cancellations} />
          </div>

          <Section title="Revenus des 12 derniers mois">
            <div className="bar-chart" role="img" aria-label="Revenus mensuels">
              {computed.trend.map((t) => (
                <div key={t.label} className="bar-col" title={`${t.label} : ${formatMoney(t.revenue)}`}>
                  <div className="bar" style={{ height: `${(t.revenue / maxTrend) * 100}%` }}>
                    <div className="bar-inner" style={{ height: `${t.revenue ? (t.commissions / t.revenue) * 100 : 0}%` }} />
                  </div>
                  <span>{t.label}</span>
                </div>
              ))}
            </div>
            <p className="dim small legend"><span className="legend-dot legend-revenue" /> Revenu brut <span className="legend-dot legend-commission" /> Commission</p>
          </Section>

          <Section title={`Par bien — ${MONTH_LABELS[monthIndex]} ${year}`} flush>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Bien</th>
                    <th className="num">Occupation</th>
                    <th className="num">Brut</th>
                    <th className="num">Commission</th>
                    <th className="num">Frais + dépenses</th>
                    <th className="num">Net propriétaire</th>
                  </tr>
                </thead>
                <tbody>
                  {(properties.data ?? []).map((p) => {
                    const perf = computed.perProperty.get(p.id)!;
                    return (
                      <tr key={p.id}>
                        <td>{p.name}</td>
                        <td className="num">{formatPercent(perf.occupancyRate)}</td>
                        <td className="num">{formatMoney(perf.revenue)}</td>
                        <td className="num">{formatMoney(perf.commissions)}</td>
                        <td className="num">{formatMoney(perf.platformFees + perf.expenses)}</td>
                        <td className="num"><strong>{formatMoney(perf.ownerNet)}</strong></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Section>

          {!portal && computed.owners.length > 0 && (
            <Section title="Par propriétaire (selon quotes-parts)" flush>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Propriétaire</th>
                      <th className="num">Revenu brut</th>
                      <th className="num">Net à reverser</th>
                    </tr>
                  </thead>
                  <tbody>
                    {computed.owners.map(([ownerId, o]) => (
                      <tr key={ownerId}>
                        <td>{o.name}</td>
                        <td className="num">{formatMoney(Math.round(o.gross * 100) / 100)}</td>
                        <td className="num"><strong>{formatMoney(Math.round(o.net * 100) / 100)}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          <Section title="Dépenses du mois" flush>
            {monthExpenses.length === 0 ? (
              <EmptyState title="Aucune dépense ce mois-ci" />
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Bien</th>
                      <th>Catégorie</th>
                      <th>Description</th>
                      <th>Imputée</th>
                      <th className="num">Montant</th>
                      {canManage && <th><span className="sr-only">Actions</span></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {monthExpenses.map((e) => (
                      <tr key={e.id}>
                        <td>{formatDate(e.incurred_on)}</td>
                        <td>{e.properties?.name ?? '—'}</td>
                        <td><Badge tone={EXPENSE_CATEGORY_TONES[e.category]}>{EXPENSE_CATEGORY_LABELS[e.category]}</Badge></td>
                        <td>{e.description ?? '—'}</td>
                        <td>{e.charged_to_owner ? 'Propriétaire' : 'DarnaLux'}</td>
                        <td className="num">{formatMoney(Number(e.amount))}</td>
                        {canManage && (
                          <td className="cell-actions">
                            <button type="button" className="icon-btn" aria-label="Supprimer la dépense" onClick={() => removeExpense(e)}>
                              <Trash2 size={15} aria-hidden="true" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </>
      )}
      {canManage && (
        <ExpenseModal
          open={expenseOpen}
          properties={properties.data ?? []}
          onClose={() => setExpenseOpen(false)}
          onSaved={() => {
            setExpenseOpen(false);
            data.reload();
          }}
        />
      )}
    </div>
  );
}

function ExpenseModal({
  open,
  properties,
  onClose,
  onSaved,
}: {
  open: boolean;
  properties: { id: string; name: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [propertyId, setPropertyId] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('CLEANING');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(toLocalISODate(new Date()));
  const [description, setDescription] = useState('');
  const [chargedToOwner, setChargedToOwner] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = Number(amount.replace(',', '.'));
    if (!propertyId) return setError('Choisissez un bien.');
    if (!Number.isFinite(value) || value <= 0) return setError('Montant invalide.');
    try {
      await createExpense({ propertyId, reservationId: null, category, description, amount: value, incurredOn: date, chargedToOwner });
      setAmount('');
      setDescription('');
      onSaved();
    } catch (err) {
      setError(toUserMessage(err));
    }
  }

  return (
    <Modal open={open} title="Nouvelle dépense" onClose={onClose}>
      <form className="form-stack" onSubmit={handleSubmit}>
        {error && <ErrorAlert>{error}</ErrorAlert>}
        <SelectField label="Bien" value={propertyId} placeholder="— Choisir —" options={properties.map((p) => ({ value: p.id, label: p.name }))} onChange={(e) => setPropertyId(e.target.value)} />
        <div className="form-grid">
          <SelectField label="Catégorie" value={category} options={optionsFrom(EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS)} onChange={(e) => setCategory(e.target.value as ExpenseCategory)} />
          <TextField label="Montant (MAD)" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <TextField label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <TextField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <label className="checkbox-line">
          <input type="checkbox" checked={chargedToOwner} onChange={(e) => setChargedToOwner(e.target.checked)} />
          Imputer au propriétaire (déduite de son net)
        </label>
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Annuler</button>
          <button type="submit" className="btn btn-primary">Enregistrer</button>
        </div>
      </form>
    </Modal>
  );
}
