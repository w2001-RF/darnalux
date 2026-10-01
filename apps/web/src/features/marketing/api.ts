import type { CampaignChannel, CampaignInput, CampaignMetrics, CampaignObjective, CampaignStatus } from '@darnalux/core';
import { supabase } from '../../lib/supabaseClient';
import { unwrap } from '../../lib/errors';

export interface CampaignRow {
  id: string;
  name: string;
  property_id: string | null;
  objective: CampaignObjective;
  channel: CampaignChannel;
  budget: number;
  starts_on: string | null;
  ends_on: string | null;
  audience: string | null;
  landing_url: string | null;
  status: CampaignStatus;
  created_at: string;
  properties: { name: string } | null;
}

export interface MetricRow extends CampaignMetrics {
  id: string;
  campaign_id: string;
  metric_date: string;
}

export type CampaignWithMetrics = CampaignRow & { marketing_metrics: MetricRow[] };

export async function listCampaigns(): Promise<CampaignWithMetrics[]> {
  return (
    unwrap(
      await supabase
        .from('marketing_campaigns')
        .select('*, properties(name), marketing_metrics(*)')
        .order('created_at', { ascending: false })
        .returns<CampaignWithMetrics[]>(),
    ) ?? []
  );
}

export async function getCampaign(id: string): Promise<CampaignWithMetrics> {
  return unwrap(
    await supabase
      .from('marketing_campaigns')
      .select('*, properties(name), marketing_metrics(*)')
      .eq('id', id)
      .order('metric_date', { referencedTable: 'marketing_metrics', ascending: false })
      .single<CampaignWithMetrics>(),
  );
}

function toRow(input: CampaignInput) {
  return {
    name: input.name.trim(),
    property_id: input.propertyId,
    objective: input.objective,
    channel: input.channel,
    budget: input.budget,
    starts_on: input.startsOn || null,
    ends_on: input.endsOn || null,
    audience: input.audience.trim() || null,
    landing_url: input.landingUrl.trim() || null,
    status: input.status,
  };
}

export function toCampaignInput(row: CampaignRow): CampaignInput {
  return {
    name: row.name,
    propertyId: row.property_id,
    objective: row.objective,
    channel: row.channel,
    budget: Number(row.budget),
    startsOn: row.starts_on ?? '',
    endsOn: row.ends_on ?? '',
    audience: row.audience ?? '',
    landingUrl: row.landing_url ?? '',
    status: row.status,
  };
}

export async function createCampaign(input: CampaignInput): Promise<string> {
  return unwrap(await supabase.from('marketing_campaigns').insert(toRow(input)).select('id').single<{ id: string }>()).id;
}

export async function updateCampaign(id: string, input: CampaignInput): Promise<void> {
  unwrap(await supabase.from('marketing_campaigns').update(toRow(input)).eq('id', id));
}

export async function deleteCampaign(id: string): Promise<void> {
  unwrap(await supabase.from('marketing_campaigns').delete().eq('id', id));
}

export async function upsertMetric(campaignId: string, date: string, metrics: CampaignMetrics): Promise<void> {
  unwrap(
    await supabase
      .from('marketing_metrics')
      .upsert({ campaign_id: campaignId, metric_date: date, ...metrics }, { onConflict: 'campaign_id,metric_date' }),
  );
}

export async function deleteMetric(id: string): Promise<void> {
  unwrap(await supabase.from('marketing_metrics').delete().eq('id', id));
}

export function metricsOf(rows: readonly MetricRow[]): CampaignMetrics[] {
  return rows.map((row) => ({
    spend: Number(row.spend),
    impressions: row.impressions,
    reach: row.reach,
    clicks: row.clicks,
    leads: row.leads,
    bookings: row.bookings,
    revenue: Number(row.revenue),
  }));
}
