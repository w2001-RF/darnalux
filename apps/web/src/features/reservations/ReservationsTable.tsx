import { Link, useNavigate } from 'react-router-dom';
import {
  BOOKING_CHANNEL_LABELS,
  CHECKIN_STATUS_LABELS,
  CHECKIN_STATUS_TONES,
  RESERVATION_STATUS_LABELS,
  RESERVATION_STATUS_TONES,
  formatMoney,
  nightsBetween,
  personFullName,
} from '@darnalux/core';
import type { ReservationListRow } from './api';
import { Badge } from '../../components/ui';
import { formatDate } from '../../lib/format';

export function ReservationsTable({
  rows,
  showProperty = true,
  showGuest = true,
}: {
  rows: readonly ReservationListRow[];
  showProperty?: boolean;
  showGuest?: boolean;
}) {
  const navigate = useNavigate();
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Réf.</th>
            {showProperty && <th>Bien</th>}
            {showGuest && <th>Voyageur</th>}
            <th>Séjour</th>
            <th>Source</th>
            <th>Statut</th>
            {showGuest && <th>Check-in</th>}
            <th className="num">Montant</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="row-link" onClick={() => navigate(`/app/reservations/${r.id}`)}>
              <td>
                <Link className="cell-title" to={`/app/reservations/${r.id}`} onClick={(e) => e.stopPropagation()}>
                  {r.reference}
                </Link>
              </td>
              {showProperty && <td>{r.properties?.name ?? '—'}</td>}
              {showGuest && (
                <td>
                  {r.guests ? personFullName(r.guests.first_name, r.guests.last_name) : <span className="dim">—</span>}
                  {r.guests?.is_blacklisted && <> <Badge tone="danger">Liste noire</Badge></>}
                </td>
              )}
              <td>
                {formatDate(r.check_in)} → {formatDate(r.check_out)}
                <small className="dim cell-sub">{nightsBetween(r.check_in, r.check_out)} nuit(s) · {r.guests_count} pers.</small>
              </td>
              <td>{BOOKING_CHANNEL_LABELS[r.source]}</td>
              <td><Badge tone={RESERVATION_STATUS_TONES[r.status]}>{RESERVATION_STATUS_LABELS[r.status]}</Badge></td>
              {showGuest && (
                <td>
                  {r.checkins ? (
                    <Badge tone={CHECKIN_STATUS_TONES[r.checkins.status]}>{CHECKIN_STATUS_LABELS[r.checkins.status]}</Badge>
                  ) : (
                    <span className="dim">—</span>
                  )}
                </td>
              )}
              <td className="num">{formatMoney(Number(r.gross_amount), r.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
