import { useState } from 'react';
import { useRouter } from 'expo-router';
import {
  PERMISSIONS,
  RESERVATION_STATUSES,
  RESERVATION_STATUS_LABELS,
  RESERVATION_STATUS_TONES,
  isPortalUser,
  nightsBetween,
  personFullName,
} from '@darnalux/core';
import type { ReservationStatus } from '@darnalux/core';
import { listReservations } from '@darnalux/data/reservations';
import { AsyncList, Chips, ListRow, SearchBar } from '../../../src/components/ui';
import { Guard } from '../../../src/features/auth/Guard';
import { useAuth } from '../../../src/features/auth/AuthContext';
import { formatDate } from '../../../src/lib/format';
import { useAsync } from '../../../src/lib/useAsync';
import { useDebounced } from '../../../src/lib/useDebounced';

type Filter = 'ALL' | ReservationStatus;

const FILTERS: readonly { id: Filter; label: string }[] = [
  { id: 'ALL', label: 'Toutes' },
  ...RESERVATION_STATUSES.map((s) => ({ id: s, label: RESERVATION_STATUS_LABELS[s] })),
];

export default function ReservationsTab() {
  return (
    <Guard anyOf={[PERMISSIONS.RESERVATIONS_VIEW, PERMISSIONS.OWNER_PORTAL]}>
      <ReservationsList />
    </Guard>
  );
}

function ReservationsList() {
  const router = useRouter();
  const { user } = useAuth();
  const portal = isPortalUser(user);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');
  const term = useDebounced(search);
  const state = useAsync(() => listReservations({ search: term, status: filter === 'ALL' ? '' : filter, limit: 100 }, portal), [term, filter, portal]);

  return (
    <AsyncList
      state={state}
      data={state.data ?? []}
      keyExtractor={(r) => r.id}
      emptyTitle="Aucune réservation"
      emptyText="Aucun résultat pour ce filtre."
      header={
        <>
          <SearchBar value={search} onChangeText={setSearch} placeholder="Référence de réservation…" />
          <Chips options={FILTERS} value={filter} onChange={setFilter} />
        </>
      }
      renderItem={({ item: r }) => (
        <ListRow
          title={r.properties?.name ?? r.reference}
          subtitle={r.guests ? personFullName(r.guests.first_name, r.guests.last_name) : r.reference}
          meta={`${formatDate(r.check_in)} → ${formatDate(r.check_out)} · ${nightsBetween(r.check_in, r.check_out)} nuit(s)`}
          badge={{ label: RESERVATION_STATUS_LABELS[r.status], tone: RESERVATION_STATUS_TONES[r.status] }}
          onPress={() => router.push(`/reservations/${r.id}`)}
        />
      )}
    />
  );
}
