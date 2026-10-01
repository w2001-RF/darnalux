import { Link } from 'react-router-dom';
import { KeyRound, LogIn, LogOut } from 'lucide-react';
import {
  CHECKIN_STATUS_LABELS,
  CHECKIN_STATUS_TONES,
  PERMISSIONS,
  addDays,
  isBlockingReservationStatus,
  personFullName,
  toLocalISODate,
} from '@darnalux/core';
import { RequirePermission } from '../../features/auth/RequirePermission';
import { listCheckinsByStatus } from '../../features/checkins/api';
import type { ReservationListRow } from '../../features/reservations/api';
import { listReservationsBetween } from '../../features/reservations/api';
import { useAsync } from '../../lib/useAsync';
import { formatDate, formatDateTime } from '../../lib/format';
import { Badge, EmptyState, PageHeader, Section, StatCard } from '../../components/ui';
import { ErrorAlert, Loading } from '../../components/Feedback';

function StayList({ rows, empty }: { rows: ReservationListRow[]; empty: string }) {
  if (rows.length === 0) return <EmptyState title={empty} />;
  return (
    <ul className="stay-list">
      {rows.map((r) => (
        <li key={r.id}>
          <Link to={`/app/reservations/${r.id}`}>
            <strong>{r.properties?.name}</strong>
            <span className="dim">
              {r.guests ? personFullName(r.guests.first_name, r.guests.last_name) : r.reference} · {r.guests_count} pers.
            </span>
          </Link>
          {r.checkins ? (
            <Badge tone={CHECKIN_STATUS_TONES[r.checkins.status]}>{CHECKIN_STATUS_LABELS[r.checkins.status]}</Badge>
          ) : (
            <Badge>—</Badge>
          )}
        </li>
      ))}
    </ul>
  );
}

function Checkins() {
  const today = toLocalISODate(new Date());
  const tomorrow = addDays(today, 1);
  const stays = useAsync(() => listReservationsBetween(addDays(today, -1), addDays(today, 2)), [today]);
  const queue = useAsync(() => listCheckinsByStatus(['SUBMITTED']), []);
  const pending = useAsync(() => listCheckinsByStatus(['PENDING', 'IN_PROGRESS', 'REJECTED']), []);

  const active = (stays.data ?? []).filter((r) => isBlockingReservationStatus(r.status));
  const arrivalsToday = active.filter((r) => r.check_in === today);
  const departuresToday = active.filter((r) => r.check_out === today);
  const arrivalsTomorrow = active.filter((r) => r.check_in === tomorrow);
  const upcomingUnverified = (pending.data ?? []).filter((c) => c.reservations && c.reservations.check_in >= today && c.reservations.check_in <= addDays(today, 7));

  return (
    <div className="page-stack">
      <PageHeader title="Check-in / Check-out" subtitle="Arrivées, départs et vérifications d'identité à traiter." />
      {(stays.error || queue.error) && <ErrorAlert>{stays.error ?? queue.error}</ErrorAlert>}
      <div className="kpis">
        <StatCard icon={LogIn} label="Arrivées aujourd'hui" value={arrivalsToday.length} />
        <StatCard icon={LogOut} label="Départs aujourd'hui" value={departuresToday.length} />
        <StatCard icon={KeyRound} label="Vérifications à traiter" value={queue.data?.length ?? '…'} tone={queue.data?.length ? 'danger' : undefined} note={queue.data?.length ? 'En attente de validation' : 'Rien en attente'} />
        <StatCard label="Arrivées J+7 non vérifiées" value={upcomingUnverified.length} tone={upcomingUnverified.length ? 'danger' : undefined} />
      </div>
      {stays.loading ? (
        <Loading />
      ) : (
        <div className="three-col">
          <Section title={`Arrivées · ${formatDate(today)}`}><StayList rows={arrivalsToday} empty="Aucune arrivée" /></Section>
          <Section title={`Départs · ${formatDate(today)}`}><StayList rows={departuresToday} empty="Aucun départ" /></Section>
          <Section title={`Arrivées · ${formatDate(tomorrow)}`}><StayList rows={arrivalsTomorrow} empty="Aucune arrivée" /></Section>
        </div>
      )}
      <Section title="Vérifications à valider" flush>
        {queue.loading && <Loading />}
        {queue.data && queue.data.length === 0 && <EmptyState title="Aucune vérification en attente" />}
        {queue.data && queue.data.length > 0 && (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Réservation</th>
                  <th>Voyageur déclaré</th>
                  <th>Bien</th>
                  <th>Arrivée</th>
                  <th>Soumis le</th>
                </tr>
              </thead>
              <tbody>
                {queue.data.map((c) => (
                  <tr key={c.id}>
                    <td><Link className="cell-title" to={`/app/reservations/${c.reservation_id}`}>{c.reservations?.reference}</Link></td>
                    <td>{c.guest_full_name ?? '—'}</td>
                    <td>{c.reservations?.properties?.name ?? '—'}</td>
                    <td>{formatDate(c.reservations?.check_in)}</td>
                    <td>{formatDateTime(c.submitted_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
      {upcomingUnverified.length > 0 && (
        <Section title="Arrivées des 7 prochains jours sans vérification" flush>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Réservation</th>
                  <th>Bien</th>
                  <th>Arrivée</th>
                  <th>Statut du lien</th>
                </tr>
              </thead>
              <tbody>
                {upcomingUnverified.map((c) => (
                  <tr key={c.id}>
                    <td><Link className="cell-title" to={`/app/reservations/${c.reservation_id}`}>{c.reservations?.reference}</Link></td>
                    <td>{c.reservations?.properties?.name ?? '—'}</td>
                    <td>{formatDate(c.reservations?.check_in)}</td>
                    <td><Badge tone={CHECKIN_STATUS_TONES[c.status]}>{CHECKIN_STATUS_LABELS[c.status]}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}
    </div>
  );
}

export default function CheckinsPage() {
  return (
    <RequirePermission permission={PERMISSIONS.CHECKINS_VIEW}>
      <Checkins />
    </RequirePermission>
  );
}
