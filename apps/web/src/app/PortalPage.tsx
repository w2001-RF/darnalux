import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Building2, CalendarCheck, FileText, TrendingUp, Wallet } from 'lucide-react';
import {
  PERMISSIONS,
  PROPERTY_STATUS_LABELS,
  PROPERTY_STATUS_TONES,
  RESERVATION_STATUS_LABELS,
  RESERVATION_STATUS_TONES,
  TASK_STATUS_LABELS,
  TASK_STATUS_TONES,
  TASK_TYPE_LABELS,
  computePeriodPerformance,
  formatMoney,
  formatPercent,
  isBlockingReservationStatus,
  nightsBetween,
  startOfMonth,
  startOfNextMonth,
  toLocalISODate,
} from '@darnalux/core';
import { RequirePermission } from '../features/auth/RequirePermission';
import { listProperties } from '../features/properties/api';
import { listReservations, listReservationsForPeriod } from '../features/reservations/api';
import { listExpenses } from '../features/finance/api';
import { listTasks } from '../features/tasks/api';
import { listDocuments } from '../features/documents/api';
import { useAsync } from '../lib/useAsync';
import { formatDate, formatDateTime } from '../lib/format';
import { Badge, EmptyState, PageHeader, Section, StatCard } from '../components/ui';
import { ErrorAlert, InfoAlert, Loading } from '../components/Feedback';

// Owner portal home: every query is scoped to the owner's properties by RLS.
function Portal() {
  const now = new Date();
  const today = toLocalISODate(now);
  const from = startOfMonth(now.getFullYear(), now.getMonth());
  const to = startOfNextMonth(now.getFullYear(), now.getMonth());

  const data = useAsync(async () => {
    const [properties, monthReservations, expenses, upcoming, tasks, documents] = await Promise.all([
      listProperties(),
      listReservationsForPeriod(from, to),
      listExpenses(from, to),
      listReservations({ from: today, limit: 10 }, true),
      listTasks({ limit: 8 }),
      listDocuments({}, true),
    ]);
    return { properties, monthReservations, expenses, upcoming, tasks, documents };
  }, [from, to, today]);

  const perf = useMemo(() => {
    if (!data.data) return null;
    return computePeriodPerformance({
      periodStart: from,
      periodEnd: to,
      propertyCount: data.data.properties.filter((p) => p.status === 'ACTIVE').length,
      reservations: data.data.monthReservations.map((r) => ({
        propertyId: r.property_id,
        checkIn: r.check_in,
        checkOut: r.check_out,
        status: r.status,
        grossAmount: Number(r.gross_amount),
        commissionRate: Number(r.commission_rate),
        platformFees: Number(r.platform_fees),
      })),
      expenses: data.data.expenses.map((e) => ({ propertyId: e.property_id, amount: Number(e.amount), incurredOn: e.incurred_on, chargedToOwner: e.charged_to_owner })),
    });
  }, [data.data, from, to]);

  if (data.loading) return <Loading />;
  if (data.error) return <ErrorAlert>{data.error}</ErrorAlert>;
  if (!data.data) return null;
  const { properties, upcoming, tasks, documents } = data.data;

  return (
    <div className="page-stack">
      <PageHeader title="Mon espace propriétaire" subtitle="Vos biens, réservations, revenus et documents en un coup d'œil." />
      {properties.length === 0 && (
        <InfoAlert>Aucun bien n'est encore associé à votre compte. Contactez DarnaLux pour finaliser l'activation de votre espace.</InfoAlert>
      )}
      {perf && (
        <div className="kpis">
          <StatCard icon={Building2} label="Mes biens" value={properties.length} />
          <StatCard icon={TrendingUp} label="Occupation du mois" value={formatPercent(perf.occupancyRate)} note={`${perf.nightsBooked} nuits`} />
          <StatCard icon={Wallet} label="Revenus bruts du mois" value={formatMoney(perf.revenue)} />
          <StatCard icon={Wallet} label="Net propriétaire (mois)" value={formatMoney(perf.ownerNet)} tone="success" note="Après commission, frais et dépenses" />
        </div>
      )}
      <div className="app-grid">
        <Section title="Prochains séjours" actions={<Link className="btn btn-link btn-sm" to="/app/reservations">Tout voir</Link>}>
          {upcoming.filter((r) => isBlockingReservationStatus(r.status)).length === 0 && <EmptyState icon={CalendarCheck} title="Aucun séjour à venir" />}
          {upcoming
            .filter((r) => isBlockingReservationStatus(r.status))
            .map((r) => (
              <Link key={r.id} to={`/app/reservations/${r.id}`} className="booking">
                <span>
                  <b>{r.properties?.name}</b>
                  <small className="dim cell-sub">{formatDate(r.check_in)} → {formatDate(r.check_out)} · {nightsBetween(r.check_in, r.check_out)} nuit(s)</small>
                </span>
                <Badge tone={RESERVATION_STATUS_TONES[r.status]}>{RESERVATION_STATUS_LABELS[r.status]}</Badge>
              </Link>
            ))}
        </Section>
        <Section title="Mes biens" actions={<Link className="btn btn-link btn-sm" to="/app/properties">Tout voir</Link>}>
          {properties.map((p) => (
            <Link key={p.id} to={`/app/properties/${p.id}`} className="booking">
              <span>
                <b>{p.name}</b>
                <small className="dim cell-sub">{p.city}</small>
              </span>
              <Badge tone={PROPERTY_STATUS_TONES[p.status]}>{PROPERTY_STATUS_LABELS[p.status]}</Badge>
            </Link>
          ))}
        </Section>
      </div>
      <div className="app-grid">
        <Section title="Interventions récentes" actions={<Link className="btn btn-link btn-sm" to="/app/tasks">Tout voir</Link>}>
          {tasks.length === 0 && <EmptyState title="Aucune intervention" />}
          {tasks.map((t) => (
            <div className="row" key={t.id}>
              <i />
              <div>
                <b>{TASK_TYPE_LABELS[t.type]} · {t.properties?.name}</b>
                <small>{formatDateTime(t.due_at)} <Badge tone={TASK_STATUS_TONES[t.status]}>{TASK_STATUS_LABELS[t.status]}</Badge></small>
              </div>
            </div>
          ))}
        </Section>
        <Section title="Documents partagés" actions={<Link className="btn btn-link btn-sm" to="/app/documents">Tout voir</Link>}>
          {documents.length === 0 && <EmptyState icon={FileText} title="Aucun document" />}
          {documents.slice(0, 6).map((d) => (
            <div className="row" key={d.id}>
              <i />
              <div>
                <b>{d.title}</b>
                <small>{formatDate(d.created_at)}</small>
              </div>
            </div>
          ))}
        </Section>
      </div>
    </div>
  );
}

export default function PortalPage() {
  return (
    <RequirePermission permission={PERMISSIONS.OWNER_PORTAL}>
      <Portal />
    </RequirePermission>
  );
}
