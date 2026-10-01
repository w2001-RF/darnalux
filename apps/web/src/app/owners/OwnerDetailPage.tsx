import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Download, Pencil } from 'lucide-react';
import {
  OWNER_STATUS_LABELS,
  OWNER_STATUS_TONES,
  PERMISSIONS,
  PROPERTY_STATUS_LABELS,
  PROPERTY_STATUS_TONES,
  computePeriodPerformance,
  formatMoney,
  formatPercent,
  hasPermission,
  performanceByProperty,
  personFullName,
  startOfMonth,
  startOfNextMonth,
} from '@darnalux/core';
import { useAuth } from '../../features/auth/AuthContext';
import { RequirePermission } from '../../features/auth/RequirePermission';
import type { OwnerWithProperties } from '../../features/owners/api';
import { getOwner, linkOwnerAccount, listProfileOptions } from '../../features/owners/api';
import { listReservationsForPeriod } from '../../features/reservations/api';
import { listExpenses } from '../../features/finance/api';
import { DocumentsPanel } from '../../features/documents/DocumentsPanel';
import { useAsync } from '../../lib/useAsync';
import { toUserMessage } from '../../lib/errors';
import { downloadCsv } from '../../lib/files';
import { Badge, EmptyState, Facts, PageHeader, Section, StatCard, Tabs } from '../../components/ui';
import { ErrorAlert, InfoAlert, Loading } from '../../components/Feedback';

type TabId = 'overview' | 'statement' | 'documents';

function OwnerDetail() {
  const { id = '' } = useParams<{ id: string }>();
  const { user } = useAuth();
  const canManage = hasPermission(user, PERMISSIONS.OWNERS_MANAGE);
  const canFinance = hasPermission(user, PERMISSIONS.FINANCE_VIEW);
  const canDocs = hasPermission(user, PERMISSIONS.DOCUMENTS_VIEW);
  const [tab, setTab] = useState<TabId>('overview');
  const owner = useAsync(() => getOwner(id), [id]);

  if (owner.loading) return <Loading />;
  if (owner.error || !owner.data) return <ErrorAlert>{owner.error ?? 'Propriétaire introuvable.'}</ErrorAlert>;
  const o = owner.data;

  return (
    <div className="page-stack">
      <PageHeader
        back={{ to: '/app/owners', label: 'Propriétaires' }}
        title={personFullName(o.first_name, o.last_name)}
        subtitle={<Badge tone={OWNER_STATUS_TONES[o.status]}>{OWNER_STATUS_LABELS[o.status]}</Badge>}
        actions={
          canManage && (
            <Link className="btn btn-ghost" to={`/app/owners/${o.id}/edit`}>
              <Pencil size={15} aria-hidden="true" /> Modifier
            </Link>
          )
        }
      />
      <Tabs
        tabs={[
          { id: 'overview', label: 'Aperçu' },
          ...(canFinance ? [{ id: 'statement' as const, label: 'Relevé propriétaire' }] : []),
          ...(canDocs ? [{ id: 'documents' as const, label: 'Documents' }] : []),
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === 'overview' && <OwnerOverview owner={o} canManage={canManage} onChange={owner.reload} />}
      {tab === 'statement' && canFinance && <OwnerStatement owner={o} />}
      {tab === 'documents' && canDocs && <DocumentsPanel filters={{ ownerId: o.id }} defaults={{ ownerId: o.id, category: 'OWNER' }} />}
    </div>
  );
}

function OwnerOverview({ owner: o, canManage, onChange }: { owner: OwnerWithProperties; canManage: boolean; onChange: () => void }) {
  const { user } = useAuth();
  const canListUsers = canManage && hasPermission(user, PERMISSIONS.USERS_VIEW);
  const profiles = useAsync(() => (canListUsers ? listProfileOptions() : Promise.resolve([])), [canListUsers]);
  const [profileId, setProfileId] = useState(o.profile_id ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function saveLink() {
    setError(null);
    try {
      await linkOwnerAccount(o.id, profileId || null);
      setSaved(true);
      onChange();
    } catch (err) {
      setError(toUserMessage(err));
    }
  }

  return (
    <div className="page-stack">
      <div className="app-grid">
        <Section title="Contact">
          <Facts
            items={[
              { label: 'Email', value: o.email ?? '—' },
              { label: 'Téléphone', value: o.phone ?? '—' },
              { label: 'Adresse', value: [o.address, o.city].filter(Boolean).join(', ') || '—' },
              { label: 'Espace propriétaire', value: o.profile_id ? 'Activé' : 'Non lié' },
            ]}
          />
          {o.internal_notes && (
            <>
              <h3 className="section-title">Notes internes</h3>
              <p className="prose">{o.internal_notes}</p>
            </>
          )}
        </Section>
        <Section title="Accès à l'espace propriétaire">
          <p className="dim">
            Liez cette fiche au compte utilisateur du propriétaire (rôle « Propriétaire ») pour qu'il consulte ses biens,
            réservations, revenus et documents partagés. Les comptes sont créés par un administrateur dans Supabase Auth.
          </p>
          {error && <ErrorAlert>{error}</ErrorAlert>}
          {canListUsers ? (
            <div className="inline-form">
              <div className="field">
                <label htmlFor="owner-profile">Compte utilisateur</label>
                <select id="owner-profile" value={profileId} onChange={(e) => { setProfileId(e.target.value); setSaved(false); }}>
                  <option value="">— Aucun —</option>
                  {(profiles.data ?? []).map((p) => (
                    <option key={p.id} value={p.id}>{personFullName(p.first_name, p.last_name) || p.id.slice(0, 8)}</option>
                  ))}
                </select>
              </div>
              <button type="button" className="btn btn-primary btn-sm" onClick={saveLink}>Enregistrer</button>
              {saved && <span className="saved-note">Enregistré ✓</span>}
            </div>
          ) : (
            <InfoAlert>La liaison du compte nécessite la permission « Voir les utilisateurs ».</InfoAlert>
          )}
        </Section>
      </div>
      <Section title="Biens" flush>
        {o.property_owners.length === 0 ? (
          <EmptyState title="Aucun bien associé" text="Associez un bien depuis sa fiche (onglet Propriétaires)." />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Bien</th>
                  <th>Ville</th>
                  <th>Rôle</th>
                  <th>Quote-part</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {o.property_owners.map((link) => (
                  <tr key={link.property_id}>
                    <td><Link className="cell-title" to={`/app/properties/${link.property_id}`}>{link.properties?.name ?? 'Bien'}</Link></td>
                    <td>{link.properties?.city ?? '—'}</td>
                    <td>{link.is_primary ? <Badge tone="gold">Principal</Badge> : <Badge>Co-propriétaire</Badge>}</td>
                    <td>{Number(link.share_percent)} %</td>
                    <td>
                      {link.properties && (
                        <Badge tone={PROPERTY_STATUS_TONES[link.properties.status as keyof typeof PROPERTY_STATUS_TONES]}>
                          {PROPERTY_STATUS_LABELS[link.properties.status as keyof typeof PROPERTY_STATUS_LABELS]}
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}

function OwnerStatement({ owner }: { owner: OwnerWithProperties }) {
  const now = new Date();
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const year = Number(month.slice(0, 4));
  const monthIndex = Number(month.slice(5, 7)) - 1;
  const from = startOfMonth(year, monthIndex);
  const to = startOfNextMonth(year, monthIndex);
  const links = owner.property_owners;
  const propertyIds = links.map((l) => l.property_id);

  const data = useAsync(async () => {
    const [reservations, expenses] = await Promise.all([listReservationsForPeriod(from, to, propertyIds), listExpenses(from, to, propertyIds)]);
    const input = {
      periodStart: from,
      periodEnd: to,
      reservations: reservations.map((r) => ({
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
    return {
      total: computePeriodPerformance({ ...input, propertyCount: propertyIds.length }),
      perProperty: performanceByProperty(propertyIds, input),
    };
  }, [from, to, propertyIds.join(',')]);

  function exportCsv() {
    if (!data.data) return;
    const rows: (string | number | null)[][] = [
      ['Relevé propriétaire', personFullName(owner.first_name, owner.last_name), month],
      [],
      ['Bien', 'Quote-part (%)', 'Nuits', 'Occupation (%)', 'Revenu brut', 'Commission', 'Frais', 'Dépenses', 'Net bien', 'Net propriétaire (quote-part)'],
    ];
    for (const link of links) {
      const perf = data.data.perProperty.get(link.property_id);
      if (!perf) continue;
      const share = Number(link.share_percent) / 100;
      rows.push([
        link.properties?.name ?? link.property_id,
        Number(link.share_percent),
        perf.nightsBooked,
        perf.occupancyRate === null ? null : Number(perf.occupancyRate.toFixed(1)),
        perf.revenue,
        perf.commissions,
        perf.platformFees,
        perf.expenses,
        perf.ownerNet,
        Math.round(perf.ownerNet * share * 100) / 100,
      ]);
    }
    downloadCsv(`releve-${owner.last_name.toLowerCase()}-${month}.csv`, rows);
  }

  const ownerShareNet = data.data
    ? links.reduce((sum, link) => sum + (data.data!.perProperty.get(link.property_id)?.ownerNet ?? 0) * (Number(link.share_percent) / 100), 0)
    : 0;

  return (
    <div className="page-stack">
      <div className="filters">
        <input type="month" aria-label="Mois du relevé" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
        <button type="button" className="btn btn-ghost btn-sm" onClick={exportCsv} disabled={!data.data}>
          <Download size={15} aria-hidden="true" /> Exporter CSV
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => window.print()}>
          Imprimer / PDF
        </button>
      </div>
      {data.loading && <Loading />}
      {data.error && <ErrorAlert>{data.error}</ErrorAlert>}
      {data.data && (
        <>
          <div className="kpis">
            <StatCard label="Revenu brut" value={formatMoney(data.data.total.revenue)} note={`${data.data.total.reservations} séjour(s)`} />
            <StatCard label="Commission DarnaLux" value={formatMoney(data.data.total.commissions)} />
            <StatCard label="Dépenses & frais" value={formatMoney(data.data.total.expenses + data.data.total.platformFees)} />
            <StatCard label="Net propriétaire" value={formatMoney(Math.round(ownerShareNet * 100) / 100)} tone="success" note="Selon les quotes-parts" />
          </div>
          <Section title="Détail par bien" flush>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Bien</th>
                    <th className="num">Nuits</th>
                    <th className="num">Occupation</th>
                    <th className="num">Brut</th>
                    <th className="num">Commission</th>
                    <th className="num">Dépenses</th>
                    <th className="num">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {links.map((link) => {
                    const perf = data.data!.perProperty.get(link.property_id);
                    if (!perf) return null;
                    return (
                      <tr key={link.property_id}>
                        <td>{link.properties?.name ?? '—'}</td>
                        <td className="num">{perf.nightsBooked}</td>
                        <td className="num">{formatPercent(perf.occupancyRate)}</td>
                        <td className="num">{formatMoney(perf.revenue)}</td>
                        <td className="num">{formatMoney(perf.commissions)}</td>
                        <td className="num">{formatMoney(perf.expenses + perf.platformFees)}</td>
                        <td className="num"><strong>{formatMoney(perf.ownerNet)}</strong></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Section>
        </>
      )}
    </div>
  );
}

export default function OwnerDetailPage() {
  return (
    <RequirePermission permission={PERMISSIONS.OWNERS_VIEW}>
      <OwnerDetail />
    </RequirePermission>
  );
}
