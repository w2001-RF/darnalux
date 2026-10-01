import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, LogIn, LogOut } from 'lucide-react';
import type { ReservationStatus } from '@darnalux/core';
import {
  MONTH_LABELS,
  PERMISSIONS,
  RESERVATION_STATUS_TONES,
  WEEKDAY_LABELS,
  addDays,
  buildMonthGrid,
  computePeriodPerformance,
  formatPercent,
  hasPermission,
  isBlockingReservationStatus,
  nightsBetween,
  personFullName,
  shiftMonth,
  startOfMonth,
  startOfNextMonth,
  stayDayRole,
  toLocalISODate,
} from '@darnalux/core';
import { useAuth } from '../../features/auth/AuthContext';
import { listReservationsBetween } from '../../features/reservations/api';
import { listPropertyOptions } from '../../features/properties/api';
import { listTasks } from '../../features/tasks/api';
import { useAsync } from '../../lib/useAsync';
import { PageHeader, Section } from '../../components/ui';
import { ErrorAlert, Loading } from '../../components/Feedback';

type StatusFilter = 'ALL' | 'CONFIRMED' | 'PENDING' | 'CHECK_IN' | 'CHECK_OUT' | 'CANCELLED';

const STATUS_FILTERS: { id: StatusFilter; label: string; match: (s: ReservationStatus) => boolean }[] = [
  { id: 'ALL', label: 'Tous', match: (s) => isBlockingReservationStatus(s) },
  { id: 'CONFIRMED', label: 'Confirmés', match: (s) => s === 'CONFIRMED' },
  { id: 'PENDING', label: 'En attente', match: (s) => s === 'PENDING' },
  { id: 'CHECK_IN', label: 'En séjour', match: (s) => s === 'CHECK_IN' || s === 'IN_PROGRESS' },
  { id: 'CHECK_OUT', label: 'Partis', match: (s) => s === 'CHECK_OUT' || s === 'COMPLETED' },
  { id: 'CANCELLED', label: 'Annulés', match: (s) => s === 'CANCELLED' || s === 'NO_SHOW' },
];

function OccupancyRing({ value }: { value: number | null }) {
  const pct = value === null ? 0 : Math.min(100, Math.max(0, value));
  const circumference = 2 * Math.PI * 52;
  return (
    <svg className="ring" viewBox="0 0 120 120" role="img" aria-label={`Taux d'occupation ${formatPercent(value)}`}>
      <circle cx="60" cy="60" r="52" className="ring-track" />
      <circle cx="60" cy="60" r="52" className="ring-value" strokeDasharray={`${(pct / 100) * circumference} ${circumference}`} transform="rotate(-90 60 60)" />
      <text x="60" y="64" textAnchor="middle" className="ring-label">{value === null ? '—' : `${Math.round(pct)}%`}</text>
    </svg>
  );
}

export default function CalendarPage() {
  const { user } = useAuth();
  const canSeeTasks = hasPermission(user, PERMISSIONS.TASKS_VIEW);
  const today = toLocalISODate(new Date());
  const [cursor, setCursor] = useState(() => ({ year: Number(today.slice(0, 4)), monthIndex: Number(today.slice(5, 7)) - 1 }));
  const [propertyId, setPropertyId] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('ALL');

  const weeks = useMemo(() => buildMonthGrid(cursor.year, cursor.monthIndex), [cursor]);
  const gridStart = weeks[0][0].date;
  const gridEnd = weeks[weeks.length - 1][6].date;
  const monthStart = startOfMonth(cursor.year, cursor.monthIndex);
  const monthEnd = startOfNextMonth(cursor.year, cursor.monthIndex);

  const properties = useAsync(listPropertyOptions, []);
  const reservations = useAsync(() => listReservationsBetween(gridStart, addDays(gridEnd, 1), propertyId || undefined), [gridStart, gridEnd, propertyId]);
  const tasks = useAsync(
    () => (canSeeTasks ? listTasks({ propertyId: propertyId || undefined, openOnly: true, limit: 500 }) : Promise.resolve([])),
    [propertyId, canSeeTasks],
  );

  const matcher = STATUS_FILTERS.find((f) => f.id === filter)!.match;
  const visible = (reservations.data ?? []).filter((r) => matcher(r.status));

  const stats = useMemo(() => {
    const rows = reservations.data ?? [];
    const propertyCount = propertyId ? 1 : (properties.data ?? []).filter((p) => p.status === 'ACTIVE').length;
    const perf = computePeriodPerformance({
      periodStart: monthStart,
      periodEnd: monthEnd,
      propertyCount,
      reservations: rows.map((r) => ({
        propertyId: r.property_id,
        checkIn: r.check_in,
        checkOut: r.check_out,
        status: r.status,
        grossAmount: Number(r.gross_amount),
        commissionRate: Number(r.commission_rate),
        platformFees: Number(r.platform_fees),
      })),
      expenses: [],
    });
    const inMonth = rows.filter((r) => r.check_in < monthEnd && r.check_out > monthStart && isBlockingReservationStatus(r.status));
    const withCheckin = inMonth.filter((r) => r.checkins);
    const verified = withCheckin.filter((r) => r.checkins?.status === 'VERIFIED').length;
    const avgStay = inMonth.length ? inMonth.reduce((sum, r) => sum + nightsBetween(r.check_in, r.check_out), 0) / inMonth.length : null;
    const upcoming = inMonth.filter((r) => r.check_in >= today).length;
    return { perf, count: inMonth.length, verification: withCheckin.length ? (verified / withCheckin.length) * 100 : null, avgStay, upcoming };
  }, [reservations.data, properties.data, propertyId, monthStart, monthEnd, today]);

  function tasksOn(day: string) {
    return (tasks.data ?? []).filter((t) => t.due_at && toLocalISODate(new Date(t.due_at)) === day).length;
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="Calendrier"
        subtitle="Réservations, arrivées, départs et interventions."
        actions={
          <div className="month-nav">
            <button type="button" className="icon-btn" aria-label="Mois précédent" onClick={() => setCursor((c) => shiftMonth(c.year, c.monthIndex, -1))}>
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <strong>{MONTH_LABELS[cursor.monthIndex]} {cursor.year}</strong>
            <button type="button" className="icon-btn" aria-label="Mois suivant" onClick={() => setCursor((c) => shiftMonth(c.year, c.monthIndex, 1))}>
              <ChevronRight size={18} aria-hidden="true" />
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCursor({ year: Number(today.slice(0, 4)), monthIndex: Number(today.slice(5, 7)) - 1 })}>
              Aujourd'hui
            </button>
          </div>
        }
      />
      <div className="filters">
        <div className="chip-filters" role="group" aria-label="Filtrer par statut">
          {STATUS_FILTERS.map((f) => (
            <button key={f.id} type="button" className={'chip-filter' + (filter === f.id ? ' active' : '')} aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
              {f.label}
            </button>
          ))}
        </div>
        <select aria-label="Bien" value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
          <option value="">Tous les biens</option>
          {(properties.data ?? []).map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>
      {reservations.error && <ErrorAlert>{reservations.error}</ErrorAlert>}
      <div className="calendar-layout">
        <section className="panel calendar-panel">
          {reservations.loading && <Loading />}
          <div className="calendar" role="grid" aria-label={`${MONTH_LABELS[cursor.monthIndex]} ${cursor.year}`}>
            <div className="calendar-row calendar-head" role="row">
              {WEEKDAY_LABELS.map((d) => (
                <div key={d} role="columnheader">{d}</div>
              ))}
            </div>
            {weeks.map((week) => (
              <div className="calendar-row" role="row" key={week[0].date}>
                {week.map((day) => {
                  const events = visible
                    .map((r) => ({ r, role: stayDayRole({ checkIn: r.check_in, checkOut: r.check_out }, day.date) }))
                    .filter((e) => e.role !== null);
                  const taskCount = tasksOn(day.date);
                  return (
                    <div
                      key={day.date}
                      role="gridcell"
                      className={'calendar-cell' + (day.inMonth ? '' : ' outside') + (day.date === today ? ' today' : '')}
                    >
                      <span className="calendar-day">{Number(day.date.slice(8, 10))}</span>
                      <div className="calendar-events">
                        {events.slice(0, 3).map(({ r, role }) => (
                          <Link
                            key={r.id}
                            to={`/app/reservations/${r.id}`}
                            className={`cal-event cal-${RESERVATION_STATUS_TONES[r.status]} cal-${role?.toLowerCase()}`}
                            title={`${r.reference} · ${r.properties?.name ?? ''}`}
                          >
                            {role === 'CHECK_IN' && <LogIn size={11} aria-label="Arrivée" />}
                            {role === 'CHECK_OUT' && <LogOut size={11} aria-label="Départ" />}
                            <span>{r.guests ? personFullName(r.guests.first_name, r.guests.last_name) : r.properties?.name ?? r.reference}</span>
                          </Link>
                        ))}
                        {events.length > 3 && <span className="cal-more">+{events.length - 3}</span>}
                        {taskCount > 0 && <span className="cal-tasks">{taskCount} tâche(s)</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </section>
        <aside className="calendar-side">
          <Section title={`Occupation — ${MONTH_LABELS[cursor.monthIndex]}`}>
            <div className="ring-wrap">
              <OccupancyRing value={stats.perf.occupancyRate} />
              <p className="dim small">{stats.perf.nightsBooked} nuits / {stats.perf.nightsAvailable}</p>
            </div>
          </Section>
          <div className="mini-stats">
            <div><span>Réservations</span><b>{stats.count}</b></div>
            <div><span>Vérifications complétées</span><b>{formatPercent(stats.verification, 0)}</b></div>
            <div><span>Durée moyenne du séjour</span><b>{stats.avgStay === null ? '—' : `${stats.avgStay.toFixed(1).replace('.', ',')} nuits`}</b></div>
            <div><span>Arrivées à venir</span><b>{stats.upcoming}</b></div>
          </div>
        </aside>
      </div>
    </div>
  );
}
