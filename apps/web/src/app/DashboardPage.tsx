import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Building2, CalendarCheck, ClipboardList, KeyRound, LifeBuoy, LogIn, LogOut, Plus, TrendingUp, Wallet } from 'lucide-react';
import {
  PERMISSIONS,
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_TONES,
  addDays,
  compareTasks,
  computePeriodPerformance,
  formatMoney,
  formatPercent,
  hasPermission,
  isBlockingReservationStatus,
  isTaskOverdue,
  personFullName,
  startOfMonth,
  startOfNextMonth,
  toLocalISODate,
} from '@darnalux/core';
import { useAuth } from '../features/auth/AuthContext';
import { loadDashboardCounts } from '../features/dashboard/api';
import { listReservationsBetween, listReservationsForPeriod } from '../features/reservations/api';
import { listExpenses } from '../features/finance/api';
import { listTasks } from '../features/tasks/api';
import { AUDIT_ACTION_LABELS, AUDIT_ENTITY_LABELS, listAudit } from '../features/audit/api';
import { useAsync } from '../lib/useAsync';
import { formatDateTime, formatRelative, formatShortDay } from '../lib/format';
import { Badge, EmptyState, Section, StatCard } from '../components/ui';
import { ErrorAlert, Loading } from '../components/Feedback';

export default function DashboardPage() {
  const { user } = useAuth();
  const now = new Date();
  const today = toLocalISODate(now);
  const monthStart = startOfMonth(now.getFullYear(), now.getMonth());
  const monthEnd = startOfNextMonth(now.getFullYear(), now.getMonth());
  const can = (p: string) => hasPermission(user, p);

  const counts = useAsync(() => loadDashboardCounts(today, `${monthStart}T00:00:00`), [today, monthStart]);
  const month = useAsync(async () => {
    if (!can(PERMISSIONS.FINANCE_VIEW) && !can(PERMISSIONS.RESERVATIONS_VIEW)) return null;
    const [reservations, expenses] = await Promise.all([
      listReservationsForPeriod(monthStart, monthEnd),
      can(PERMISSIONS.FINANCE_VIEW) ? listExpenses(monthStart, monthEnd) : Promise.resolve([]),
    ]);
    return { reservations, expenses };
  }, [monthStart, monthEnd]);
  const upcoming = useAsync(
    () => (can(PERMISSIONS.RESERVATIONS_VIEW) ? listReservationsBetween(addDays(today, -28), addDays(today, 8)) : Promise.resolve([])),
    [today],
  );
  const tasks = useAsync(
    () => (can(PERMISSIONS.TASKS_VIEW) || can(PERMISSIONS.TASKS_EXECUTE) ? listTasks({ openOnly: true, limit: 50 }) : Promise.resolve([])),
    [],
  );
  const activity = useAsync(() => (can(PERMISSIONS.AUDIT_VIEW) ? listAudit({ limit: 8 }) : Promise.resolve([])), []);

  const perf = useMemo(() => {
    if (!month.data || counts.data?.activeProperties == null) return null;
    return computePeriodPerformance({
      periodStart: monthStart,
      periodEnd: monthEnd,
      propertyCount: counts.data.activeProperties,
      reservations: month.data.reservations.map((r) => ({
        propertyId: r.property_id,
        checkIn: r.check_in,
        checkOut: r.check_out,
        status: r.status,
        grossAmount: Number(r.gross_amount),
        commissionRate: Number(r.commission_rate),
        platformFees: Number(r.platform_fees),
      })),
      expenses: month.data.expenses.map((e) => ({ propertyId: e.property_id, amount: Number(e.amount), incurredOn: e.incurred_on, chargedToOwner: e.charged_to_owner })),
    });
  }, [month.data, counts.data, monthStart, monthEnd]);

  const stays = (upcoming.data ?? []).filter((r) => isBlockingReservationStatus(r.status));
  const nextArrivals = stays.filter((r) => r.check_in >= today && r.check_in <= addDays(today, 7)).sort((a, b) => a.check_in.localeCompare(b.check_in)).slice(0, 8);
  const days = Array.from({ length: 28 }, (_, i) => addDays(today, i - 27));
  const checkinsPerDay = days.map((day) => stays.filter((r) => r.check_in === day).length);
  const maxCheckins = Math.max(1, ...checkinsPerDay);
  const priorityTasks = [...(tasks.data ?? [])]
    .sort((a, b) => compareTasks({ ...a, dueAt: a.due_at }, { ...b, dueAt: b.due_at }))
    .filter((t) => t.priority === 'URGENT' || t.priority === 'HIGH' || isTaskOverdue({ ...t, dueAt: t.due_at }, now))
    .slice(0, 6);
  const c = counts.data;

  return (
    <div className="page-stack">
      {counts.error && <ErrorAlert>{counts.error}</ErrorAlert>}
      {counts.loading && <Loading />}
      {c && (
        <div className="kpis">
          {can(PERMISSIONS.PROPERTIES_VIEW) && c.activeProperties !== null && (
            <StatCard icon={Building2} label="Biens actifs" value={c.activeProperties} note={`${c.properties ?? 0} au total`} />
          )}
          {can(PERMISSIONS.RESERVATIONS_VIEW) && c.openReservations !== null && (
            <StatCard icon={CalendarCheck} label="Réservations en cours / à venir" value={c.openReservations} />
          )}
          {can(PERMISSIONS.RESERVATIONS_VIEW) && c.checkInsToday !== null && <StatCard icon={LogIn} label="Check-ins du jour" value={c.checkInsToday} />}
          {can(PERMISSIONS.RESERVATIONS_VIEW) && c.checkOutsToday !== null && <StatCard icon={LogOut} label="Check-outs du jour" value={c.checkOutsToday} />}
          {(can(PERMISSIONS.TASKS_VIEW) || can(PERMISSIONS.TASKS_EXECUTE)) && c.openTasks !== null && (
            <StatCard
              icon={ClipboardList}
              label={can(PERMISSIONS.TASKS_VIEW) ? 'Tâches en attente' : 'Mes tâches en attente'}
              value={c.openTasks}
              note={c.urgentTasks ? `${c.urgentTasks} urgente(s)` : 'Aucune urgence'}
              tone={c.urgentTasks ? 'danger' : undefined}
            />
          )}
          {can(PERMISSIONS.CHECKINS_VIEW) && c.pendingVerifications !== null && (
            <StatCard icon={KeyRound} label="Vérifications à valider" value={c.pendingVerifications} tone={c.pendingVerifications ? 'danger' : undefined} />
          )}
          {perf && can(PERMISSIONS.RESERVATIONS_VIEW) && (
            <StatCard icon={TrendingUp} label="Occupation du mois" value={formatPercent(perf.occupancyRate)} note={`${perf.nightsBooked} nuits réservées`} />
          )}
          {perf && can(PERMISSIONS.FINANCE_VIEW) && <StatCard icon={Wallet} label="Revenus du mois" value={formatMoney(perf.revenue)} note={`Commissions ${formatMoney(perf.commissions)}`} />}
          {can(PERMISSIONS.CHECKINS_VIEW) && c.incidents !== null && (
            <StatCard icon={AlertTriangle} label="Incidents (mois)" value={c.incidents} tone={c.incidents ? 'danger' : undefined} />
          )}
        </div>
      )}

      <div className="quick-actions">
        {can(PERMISSIONS.PROPERTIES_MANAGE) && <Link className="btn btn-primary btn-sm" to="/app/properties/new"><Plus size={14} aria-hidden="true" /> Ajouter un bien</Link>}
        {can(PERMISSIONS.RESERVATIONS_MANAGE) && <Link className="btn btn-ghost btn-sm" to="/app/reservations/new"><Plus size={14} aria-hidden="true" /> Réservation</Link>}
        {can(PERMISSIONS.TASKS_MANAGE) && <Link className="btn btn-ghost btn-sm" to="/app/tasks/new"><Plus size={14} aria-hidden="true" /> Tâche</Link>}
        <Link className="btn btn-link btn-sm" to="/app/support"><LifeBuoy size={14} aria-hidden="true" /> Support</Link>
      </div>

      {can(PERMISSIONS.RESERVATIONS_VIEW) && (
        <Section title="Check-ins des 4 dernières semaines">
          <div className="bar-chart bar-chart-dense" role="img" aria-label="Arrivées par jour sur 28 jours">
            {days.map((day, i) => (
              <div key={day} className="bar-col" title={`${formatShortDay(day)} : ${checkinsPerDay[i]} arrivée(s)`}>
                <div className="bar" style={{ height: `${(checkinsPerDay[i] / maxCheckins) * 100}%` }} />
                <span>{i % 7 === 0 ? day.slice(8, 10) + '/' + day.slice(5, 7) : ''}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      <div className="app-grid">
        {can(PERMISSIONS.RESERVATIONS_VIEW) && (
          <Section title="Prochains check-ins (7 jours)">
            {upcoming.loading && <Loading />}
            {!upcoming.loading && nextArrivals.length === 0 && <EmptyState title="Aucune arrivée prévue" />}
            {nextArrivals.map((r) => (
              <Link key={r.id} to={`/app/reservations/${r.id}`} className="booking">
                <span>
                  <b>{r.properties?.name}</b>
                  <small className="dim cell-sub">{r.guests ? personFullName(r.guests.first_name, r.guests.last_name) : r.reference}</small>
                </span>
                <span>{formatShortDay(r.check_in)}</span>
              </Link>
            ))}
          </Section>
        )}
        {(can(PERMISSIONS.TASKS_VIEW) || can(PERMISSIONS.TASKS_EXECUTE)) && (
          <Section title="Tâches prioritaires" actions={<Link className="btn btn-link btn-sm" to="/app/tasks">Voir tout</Link>}>
            {!tasks.loading && priorityTasks.length === 0 && <EmptyState title="Rien d'urgent" />}
            {priorityTasks.map((t) => (
              <Link key={t.id} to={`/app/tasks/${t.id}`} className="row">
                <i />
                <div>
                  <b>{t.title}</b>
                  <small>
                    {t.properties?.name} · {formatDateTime(t.due_at)}{' '}
                    <Badge tone={TASK_PRIORITY_TONES[t.priority]}>{TASK_PRIORITY_LABELS[t.priority]}</Badge>
                  </small>
                </div>
              </Link>
            ))}
          </Section>
        )}
      </div>

      {can(PERMISSIONS.AUDIT_VIEW) && (
        <Section title="Activité récente" actions={<Link className="btn btn-link btn-sm" to="/app/audit">Voir tout</Link>}>
          {activity.data && activity.data.length === 0 && <EmptyState title="Aucune activité récente" />}
          {(activity.data ?? []).map((entry) => (
            <div className="row" key={entry.id}>
              <i />
              <div>
                <b>
                  {AUDIT_ACTION_LABELS[entry.action]} · {AUDIT_ENTITY_LABELS[entry.entity] ?? entry.entity}
                  {' '}
                  {String((entry.new_data ?? entry.old_data)?.reference ?? (entry.new_data ?? entry.old_data)?.name ?? (entry.new_data ?? entry.old_data)?.title ?? '')}
                </b>
                <small>{formatRelative(entry.created_at)}</small>
              </div>
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}
