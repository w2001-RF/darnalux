import { useState } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { GUEST_VERIFICATION_LABELS, GUEST_VERIFICATION_TONES, PERMISSIONS, personFullName } from '@darnalux/core';
import { listGuests } from '@darnalux/data/guests';
import { AsyncList, Chips, ListRow, SearchBar } from '../../../src/components/ui';
import { Guard } from '../../../src/features/auth/Guard';
import { useAsync } from '../../../src/lib/useAsync';
import { useDebounced } from '../../../src/lib/useDebounced';

type Filter = 'ALL' | 'BLACKLIST';

const FILTERS: readonly { id: Filter; label: string }[] = [
  { id: 'ALL', label: 'Tous' },
  { id: 'BLACKLIST', label: 'Liste noire' },
];

export default function GuestsScreen() {
  return (
    <Guard anyOf={[PERMISSIONS.GUESTS_VIEW]}>
      <GuestsList />
    </Guard>
  );
}

function GuestsList() {
  const router = useRouter();
  const { blacklist } = useLocalSearchParams<{ blacklist?: string }>();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>(blacklist ? 'BLACKLIST' : 'ALL');
  const term = useDebounced(search);
  const state = useAsync(() => listGuests({ search: term, blacklistedOnly: filter === 'BLACKLIST' }), [term, filter]);

  return (
    <>
      <Stack.Screen options={{ title: 'Voyageurs' }} />
      <AsyncList
        insetBottom
        state={state}
        data={state.data ?? []}
        keyExtractor={(g) => g.id}
        emptyTitle="Aucun voyageur"
        header={
          <>
            <SearchBar value={search} onChangeText={setSearch} placeholder="Nom, e-mail, téléphone…" />
            <Chips options={FILTERS} value={filter} onChange={setFilter} />
          </>
        }
        renderItem={({ item: g }) => (
          <ListRow
            title={personFullName(g.first_name, g.last_name)}
            subtitle={[g.email, g.phone].filter(Boolean).join(' · ')}
            meta={`${g.reservations.length} séjour(s)${g.nationality ? ` · ${g.nationality}` : ''}`}
            badge={
              g.is_blacklisted
                ? { label: 'Liste noire', tone: 'danger' }
                : { label: GUEST_VERIFICATION_LABELS[g.verification_status], tone: GUEST_VERIFICATION_TONES[g.verification_status] }
            }
            onPress={() => router.push(`/guests/${g.id}`)}
          />
        )}
      />
    </>
  );
}
