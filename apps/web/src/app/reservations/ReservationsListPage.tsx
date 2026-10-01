import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardCheck, Download, Eye, Plus } from 'lucide-react';
import {
  BOOKING_CHANNELS,
  BOOKING_CHANNEL_LABELS,
  CHECKIN_STATUS_LABELS,
  PERMISSIONS,
  RESERVATION_STATUSES,
  RESERVATION_STATUS_LABELS,
  hasPermission,
  nightsBetween,
  personFullName,
} from '@darnalux/core';
import type { CheckinStatus } from '@darnalux/core';
import { useAuth } from '../../features/auth/AuthContext';
import { isPortalUser } from '../../features/auth/portal';
import { listReservations } from '../../features/reservations/api';
import { listPropertyOptions } from '../../features/properties/api';
import { ReservationsTable } from '../../features/reservations/ReservationsTable';
import { useAsync } from '../../lib/useAsync';
import { downloadCsv } from '../../lib/files';
import { EmptyState, PageHeader, optionsFrom } from '../../components/ui';
import { ErrorAlert, Loading } from '../../components/Feedback';

const CHECKIN_STATUSES: CheckinStatus[] = ['PENDING', 'IN_PROGRESS', 'SUBMITTED', 'VERIFIED', 'REJECTED'];

export default function ReservationsListPage() {
  const { user } = useAuth();
  const portal = isPortalUser(user);
  const canManage = hasPermission(user, PERMISSIONS.RESERVATIONS_MANAGE);
  const canExport = hasPermission(user, PERMISSIONS.REPORTS_EXPORT);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [status, setStatus] = useState('');
  const [source, setSource] = useState('');
  const [checkinStatus, setCheckinStatus] = useState('');
  const [search, setSearch] = useState('');

  const properties = useAsync(listPropertyOptions, []);
  const reservations = useAsync(
    () => listReservations({ from, to, propertyId, status, source, checkinStatus, search }, portal),
    [from, to, propertyId, status, source, checkinStatus, search, portal],
  );

  function reset() {
    setFrom('');
    setTo('');
    setPropertyId('');
    setStatus('');
    setSource('');
    setCheckinStatus('');
    setSearch('');
  }

  function exportCsv() {
    if (!reservations.data) return;
    downloadCsv('reservations.csv', [
      ['Référence', 'Bien', 'Voyageur', 'Arrivée', 'Départ', 'Nuits', 'Voyageurs', 'Source', 'Statut', 'Montant brut', 'Commission (%)', 'Frais'],
      ...reservations.data.map((r) => [
        r.reference,
        r.properties?.name ?? '',
        r.guests ? personFullName(r.guests.first_name, r.guests.last_name) : '',
        r.check_in,
        r.check_out,
        nightsBetween(r.check_in, r.check_out),
        r.guests_count,
        BOOKING_CHANNEL_LABELS[r.source],
        RESERVATION_STATUS_LABELS[r.status],
        Number(r.gross_amount),
        Number(r.commission_rate),
        Number(r.platform_fees),
      ]),
    ]);
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="Réservations"
        subtitle="Gérez et suivez toutes les réservations, leur check-in et leurs finances."
        actions={
          <>
            {!portal && (
              <Link className="btn btn-ghost" to="/checkin/apercu" target="_blank" rel="noreferrer">
                <Eye size={16} aria-hidden="true" /> Aperçu du parcours voyageur
              </Link>
            )}
            {canExport && (
              <button type="button" className="btn btn-ghost" onClick={exportCsv} disabled={!reservations.data?.length}>
                <Download size={16} aria-hidden="true" /> Exporter
              </button>
            )}
            {canManage && (
              <Link className="btn btn-primary" to="/app/reservations/new">
                <Plus size={16} aria-hidden="true" /> Nouvelle réservation
              </Link>
            )}
          </>
        }
      />

      <div className="filters">
        <label className="filter-label">
          Du
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="filter-label">
          Au
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <select aria-label="Bien" value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
          <option value="">Tous les biens</option>
          {(properties.data ?? []).map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select aria-label="Statut" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tous les statuts</option>
          {optionsFrom(RESERVATION_STATUSES, RESERVATION_STATUS_LABELS).map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select aria-label="Source" value={source} onChange={(e) => setSource(e.target.value)}>
          <option value="">Toutes les sources</option>
          {optionsFrom(BOOKING_CHANNELS, BOOKING_CHANNEL_LABELS).map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {!portal && (
          <select aria-label="Vérification" value={checkinStatus} onChange={(e) => setCheckinStatus(e.target.value)}>
            <option value="">Toutes les vérifications</option>
            {CHECKIN_STATUSES.map((s) => (
              <option key={s} value={s}>{CHECKIN_STATUS_LABELS[s]}</option>
            ))}
          </select>
        )}
        <input type="search" placeholder="Référence…" aria-label="Référence" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button type="button" className="btn btn-link btn-sm" onClick={reset}>Réinitialiser</button>
      </div>

      {reservations.loading && <Loading label="Chargement des réservations…" />}
      {reservations.error && <ErrorAlert>{reservations.error}</ErrorAlert>}
      {reservations.data && reservations.data.length === 0 && (
        <EmptyState
          icon={ClipboardCheck}
          title="Aucune réservation"
          text="Aucune réservation ne correspond à ces critères."
          action={canManage && <Link className="btn btn-primary" to="/app/reservations/new">Créer une réservation</Link>}
        />
      )}
      {reservations.data && reservations.data.length > 0 && (
        <section className="panel panel-flush">
          <div className="panel-head">
            <h2>Liste des réservations</h2>
            <span className="panel-head-note">{reservations.data.length} réservation(s)</span>
          </div>
          <ReservationsTable rows={reservations.data} showGuest={!portal} />
        </section>
      )}
    </div>
  );
}
