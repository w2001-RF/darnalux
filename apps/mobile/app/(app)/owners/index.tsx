import { useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { OWNER_STATUSES, OWNER_STATUS_LABELS, OWNER_STATUS_TONES, PERMISSIONS, personFullName } from '@darnalux/core';
import { listOwners } from '@darnalux/data/owners';
import { AsyncList, Chips, ListRow, SearchBar } from '../../../src/components/ui';
import { Guard } from '../../../src/features/auth/Guard';
import { useAsync } from '../../../src/lib/useAsync';
import { useDebounced } from '../../../src/lib/useDebounced';

const FILTERS = [{ id: 'ALL', label: 'Tous' }, ...OWNER_STATUSES.map((s) => ({ id: s, label: OWNER_STATUS_LABELS[s] }))] as const;

export default function OwnersScreen() {
  return (
    <Guard anyOf={[PERMISSIONS.OWNERS_VIEW]}>
      <OwnersList />
    </Guard>
  );
}

function OwnersList() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('ALL');
  const term = useDebounced(search);
  const state = useAsync(() => listOwners(term, status === 'ALL' ? '' : status), [term, status]);

  return (
    <>
      <Stack.Screen options={{ title: 'Propriétaires' }} />
      <AsyncList
        insetBottom
        state={state}
        data={state.data ?? []}
        keyExtractor={(o) => o.id}
        emptyTitle="Aucun propriétaire"
        header={
          <>
            <SearchBar value={search} onChangeText={setSearch} placeholder="Nom, e-mail, téléphone, ville…" />
            <Chips options={FILTERS} value={status} onChange={setStatus} />
          </>
        }
        renderItem={({ item: o }) => (
          <ListRow
            title={personFullName(o.first_name, o.last_name)}
            subtitle={[o.email, o.phone].filter(Boolean).join(' · ')}
            meta={`${o.property_owners.length} bien(s)${o.city ? ` · ${o.city}` : ''}`}
            badge={{ label: OWNER_STATUS_LABELS[o.status], tone: OWNER_STATUS_TONES[o.status] }}
            onPress={() => router.push(`/owners/${o.id}`)}
          />
        )}
      />
    </>
  );
}
