import { roundMoney } from '../common/money';
import type { Tone, ValidationResult } from '../common/validation';
import { isBlank, isNonNegativeNumber, toResult } from '../common/validation';

export type CampaignObjective = 'BOOKINGS' | 'LEADS' | 'TRAFFIC' | 'AWARENESS' | 'MESSAGES';
export type CampaignChannel = 'META' | 'GOOGLE' | 'TIKTOK' | 'INSTAGRAM' | 'OTHER';
export type CampaignStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED';

export const CAMPAIGN_OBJECTIVES: readonly CampaignObjective[] = ['BOOKINGS', 'LEADS', 'TRAFFIC', 'AWARENESS', 'MESSAGES'];
export const CAMPAIGN_CHANNELS: readonly CampaignChannel[] = ['META', 'GOOGLE', 'TIKTOK', 'INSTAGRAM', 'OTHER'];
export const CAMPAIGN_STATUSES: readonly CampaignStatus[] = ['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED'];

export const CAMPAIGN_OBJECTIVE_LABELS: Record<CampaignObjective, string> = {
  BOOKINGS: 'Réservations',
  LEADS: 'Leads',
  TRAFFIC: 'Trafic',
  AWARENESS: 'Notoriété',
  MESSAGES: 'Messages',
};

export const CAMPAIGN_CHANNEL_LABELS: Record<CampaignChannel, string> = {
  META: 'Meta Ads',
  GOOGLE: 'Google Ads',
  TIKTOK: 'TikTok Ads',
  INSTAGRAM: 'Instagram (organique)',
  OTHER: 'Autre',
};

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  DRAFT: 'Brouillon',
  ACTIVE: 'Active',
  PAUSED: 'En pause',
  COMPLETED: 'Terminée',
};

export const CAMPAIGN_STATUS_TONES: Record<CampaignStatus, Tone> = {
  DRAFT: 'neutral',
  ACTIVE: 'success',
  PAUSED: 'warning',
  COMPLETED: 'info',
};

export interface CampaignInput {
  name: string;
  propertyId: string | null;
  objective: CampaignObjective;
  channel: CampaignChannel;
  budget: number;
  startsOn: string;
  endsOn: string;
  audience: string;
  landingUrl: string;
  status: CampaignStatus;
}

export type CampaignField = keyof CampaignInput;

export function validateCampaignInput(input: CampaignInput): ValidationResult<CampaignField> {
  const errors: Partial<Record<CampaignField, string>> = {};
  if (isBlank(input.name)) errors.name = 'Le nom est obligatoire.';
  if (!isNonNegativeNumber(input.budget)) errors.budget = 'Budget invalide.';
  if (input.startsOn && input.endsOn && input.endsOn < input.startsOn) errors.endsOn = 'La fin doit être après le début.';
  if (!isBlank(input.landingUrl) && !/^https:\/\/\S+$/i.test(input.landingUrl.trim())) {
    errors.landingUrl = "L'URL doit commencer par https://";
  }
  return toResult(errors);
}

export interface CampaignMetrics {
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  leads: number;
  bookings: number;
  revenue: number;
}

export interface CampaignKpis {
  ctr: number | null;
  cpc: number | null;
  cpm: number | null;
  roas: number | null;
  cac: number | null;
  costPerBooking: number | null;
  costPerLead: number | null;
}

function ratio(numerator: number, denominator: number): number | null {
  return denominator > 0 ? numerator / denominator : null;
}

function money(value: number | null): number | null {
  return value === null ? null : roundMoney(value);
}

// ROAS = revenue / spend; CAC = spend / acquired customers (bookings);
// cost per booking = spend / attributed bookings.
export function computeCampaignKpis(m: CampaignMetrics): CampaignKpis {
  const ctr = ratio(m.clicks, m.impressions);
  return {
    ctr: ctr === null ? null : ctr * 100,
    cpc: money(ratio(m.spend, m.clicks)),
    cpm: money(ratio(m.spend * 1000, m.impressions)),
    roas: ratio(m.revenue, m.spend),
    cac: money(ratio(m.spend, m.bookings)),
    costPerBooking: money(ratio(m.spend, m.bookings)),
    costPerLead: money(ratio(m.spend, m.leads)),
  };
}

export function sumMetrics(rows: readonly CampaignMetrics[]): CampaignMetrics {
  return rows.reduce<CampaignMetrics>(
    (total, row) => ({
      spend: roundMoney(total.spend + row.spend),
      impressions: total.impressions + row.impressions,
      reach: total.reach + row.reach,
      clicks: total.clicks + row.clicks,
      leads: total.leads + row.leads,
      bookings: total.bookings + row.bookings,
      revenue: roundMoney(total.revenue + row.revenue),
    }),
    { spend: 0, impressions: 0, reach: 0, clicks: 0, leads: 0, bookings: 0, revenue: 0 },
  );
}
