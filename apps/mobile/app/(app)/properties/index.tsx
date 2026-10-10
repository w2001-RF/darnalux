import { useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { PERMISSIONS, PROPERTY_STATUSES, PROPERTY_STATUS_LABELS, PROPERTY_STATUS_TONES, PROPERTY_TYPE_LABELS } from '@darnalux/core';
import { listProperties } from '@darnalux/data/properties';
import { AsyncList, Chips, ListRow, SearchBar } from '../../../src/components/ui';
import { Guard } from '../../../src/features/auth/Guard';
import { useAsync } from '../../../src/lib/useAsync';
import { useDebounced } from '../../../src/lib/useDebounced';

const FILTERS = [{ id: 'ALL', label: 'Tous' }, ...PROPERTY_STATUSES.map((s) => ({ id: s, label: PROPERTY_STATUS_LABELS[s] }))] as const;

export default function PropertiesScreen() {
  return (
    <Guard anyOf={[PERMISSIONS.PROPERTIES_VIEW, PERMISSIONS.OWNER_PORTAL]}>
      <PropertiesList />
    </Guard>
  );
}

function PropertiesList() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('ALL');
  const term = useDebounced(search);
  const state = useAsync(() => listProperties({ search: term, status: status === 'ALL' ? '' : status }), [term, status]);

  return (
    <>
      <Stack.Screen options={{ title: 'Biens' }} />
      <AsyncList
        insetBottom
        state={state}
        data={state.data ?? []}
        keyExtractor={(p) => p.id}
        emptyTitle="Aucun bien"
        header={
          <>
            <SearchBar value={search} onChangeText={setSearch} placeholder="Nom, ville, adresse…" />
            <Chips options={FILTERS} value={status} onChange={setStatus} />
          </>
        }
        renderItem={({ item: p }) => (
          <ListRow
            title={p.name}
            subtitle={`${PROPERTY_TYPE_LABELS[p.type]} · ${p.city}`}
            meta={`${p.capacity} voyageur(s) · ${p.bedrooms} chambre(s)`}
            badge={{ label: PROPERTY_STATUS_LABELS[p.status], tone: PROPERTY_STATUS_TONES[p.status] }}
            onPress={() => router.push(`/properties/${p.id}`)}
          />
        )}
      />
    </>
  );
}
