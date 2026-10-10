import { useState } from 'react';
import { Stack } from 'expo-router';
import {
  CAMPAIGN_CHANNEL_LABELS,
  CAMPAIGN_OBJECTIVE_LABELS,
  CAMPAIGN_STATUSES,
  CAMPAIGN_STATUS_LABELS,
  CAMPAIGN_STATUS_TONES,
  PERMISSIONS,
  computeCampaignKpis,
  sumMetrics,
} from '@darnalux/core';
import { listCampaigns, metricsOf } from '@darnalux/data/marketing';
import { AsyncList, Chips, ListRow } from '../../src/components/ui';
import { Guard } from '../../src/features/auth/Guard';
import { formatMad } from '../../src/lib/format';
import { useAsync } from '../../src/lib/useAsync';

const FILTERS = [{ id: 'ALL', label: 'Toutes' }, ...CAMPAIGN_STATUSES.map((s) => ({ id: s, label: CAMPAIGN_STATUS_LABELS[s] }))] as const;

export default function MarketingScreen() {
  return (
    <Guard anyOf={[PERMISSIONS.MARKETING_VIEW]}>
      <Campaigns />
    </Guard>
  );
}

function Campaigns() {
  const [status, setStatus] = useState<string>('ALL');
  const state = useAsync(listCampaigns, []);
  const rows = (state.data ?? []).filter((c) => status === 'ALL' || c.status === status);

  return (
    <>
      <Stack.Screen options={{ title: 'Campagnes & analytics' }} />
      <AsyncList
        insetBottom
        state={state}
        data={rows}
        keyExtractor={(c) => c.id}
        emptyTitle="Aucune campagne"
        header={<Chips options={FILTERS} value={status} onChange={setStatus} />}
        renderItem={({ item: c }) => {
          const totals = sumMetrics(metricsOf(c.marketing_metrics));
          const kpis = computeCampaignKpis(totals);
          return (
            <ListRow
              title={c.name}
              subtitle={`${CAMPAIGN_CHANNEL_LABELS[c.channel]} · ${CAMPAIGN_OBJECTIVE_LABELS[c.objective]}${c.properties ? ` · ${c.properties.name}` : ''}`}
              meta={`Dépensé ${formatMad(totals.spend)} · ${totals.leads} lead(s) · ${totals.bookings} réservation(s)${kpis.roas === null ? '' : ` · ROAS ${kpis.roas.toFixed(1).replace('.', ',')}`}`}
              badge={{ label: CAMPAIGN_STATUS_LABELS[c.status], tone: CAMPAIGN_STATUS_TONES[c.status] }}
            />
          );
        }}
      />
    </>
  );
}
