import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  LEAD_KIND_LABELS,
  LEAD_STATUS_LABELS,
  LEAD_STATUS_TONES,
  LEAD_TABS,
  LEAD_TAB_LABELS,
  PERMISSIONS,
  countLeadsByTab,
  leadTab,
} from '@darnalux/core';
import type { LeadTab } from '@darnalux/core';
import { listLeads } from '@darnalux/data/leads';
import { AsyncList, Chips, ListRow, SearchBar } from '../../../src/components/ui';
import { Guard } from '../../../src/features/auth/Guard';
import { formatRelative } from '../../../src/lib/format';
import { useAsync } from '../../../src/lib/useAsync';

export default function LeadsTab() {
  return (
    <Guard anyOf={[PERMISSIONS.MARKETING_VIEW]}>
      <LeadsList />
    </Guard>
  );
}

function LeadsList() {
  const router = useRouter();
  const [tab, setTab] = useState<LeadTab>('ESTIMATES');
  const [search, setSearch] = useState('');
  const state = useAsync(listLeads, []);
  const rows = state.data ?? [];
  const counts = useMemo(() => countLeadsByTab(rows), [rows]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter(
      (r) =>
        leadTab(r) === tab &&
        (term === '' || [r.full_name, r.email, r.phone ?? '', r.address ?? '', r.zone_label ?? ''].some((v) => v.toLowerCase().includes(term))),
    );
  }, [rows, tab, search]);

  return (
    <AsyncList
      state={state}
      data={visible}
      keyExtractor={(r) => r.id}
      emptyTitle="Aucune demande"
      emptyText="Rien à afficher pour ce filtre."
      header={
        <>
          <Chips options={LEAD_TABS.map((id) => ({ id, label: `${LEAD_TAB_LABELS[id]} (${counts[id]})` }))} value={tab} onChange={setTab} />
          <SearchBar value={search} onChangeText={setSearch} placeholder="Nom, e-mail, téléphone, adresse…" />
        </>
      }
      renderItem={({ item: r }) => (
        <ListRow
          title={r.full_name}
          subtitle={r.kind === 'QUOTE' ? [r.config_label, r.address, r.zone_label].filter(Boolean).join(' · ') : (r.message ?? '')}
          meta={`${LEAD_KIND_LABELS[r.kind]} · ${formatRelative(r.created_at)}`}
          badge={{ label: LEAD_STATUS_LABELS[r.status], tone: LEAD_STATUS_TONES[r.status] }}
          onPress={() => router.push(`/leads/${r.id}`)}
        />
      )}
    />
  );
}
