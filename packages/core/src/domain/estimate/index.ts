// Public revenue estimator for the landing page.
// IMPORTANT: every number in ESTIMATE_RATES is a placeholder assumption, not market data.
// Calibrate the table with real DarnaLux results before relying on the output.

export const PROPERTY_KINDS = ['STUDIO', 'APARTMENT', 'VILLA'] as const;
export type PropertyKind = (typeof PROPERTY_KINDS)[number];

export const PROPERTY_KIND_LABELS: Record<PropertyKind, string> = {
  STUDIO: 'Studio',
  APARTMENT: 'Appartement',
  VILLA: 'Villa',
};

export interface PropertyConfig {
  id: string;
  label: string;
  /** `null` means a custom configuration: no automatic estimate. */
  kind: PropertyKind | null;
  bedrooms: number;
}

export const PROPERTY_CONFIGS: readonly PropertyConfig[] = [
  { id: 'STUDIO', label: 'Studio', kind: 'STUDIO', bedrooms: 0 },
  { id: 'APARTMENT_1', label: 'Appartement · 1 chambre', kind: 'APARTMENT', bedrooms: 1 },
  { id: 'APARTMENT_2', label: 'Appartement · 2 chambres', kind: 'APARTMENT', bedrooms: 2 },
  { id: 'APARTMENT_3', label: 'Appartement · 3 chambres', kind: 'APARTMENT', bedrooms: 3 },
  { id: 'APARTMENT_4', label: 'Appartement · 4 chambres', kind: 'APARTMENT', bedrooms: 4 },
  { id: 'APARTMENT_5', label: 'Appartement · 5+ chambres', kind: 'APARTMENT', bedrooms: 5 },
  { id: 'VILLA_2', label: 'Villa · 2 chambres', kind: 'VILLA', bedrooms: 2 },
  { id: 'VILLA_3', label: 'Villa · 3 chambres', kind: 'VILLA', bedrooms: 3 },
  { id: 'VILLA_4', label: 'Villa · 4 chambres', kind: 'VILLA', bedrooms: 4 },
  { id: 'VILLA_5', label: 'Villa · 5+ chambres', kind: 'VILLA', bedrooms: 5 },
  { id: 'OTHER', label: 'Autre configuration', kind: null, bedrooms: 0 },
];

export interface EstimateZone {
  id: string;
  label: string;
  /** Price multiplier for the zone. `null` means no automatic estimate (local analysis by the team). */
  factor: number | null;
}

export const ESTIMATE_ZONES: readonly EstimateZone[] = [
  { id: 'RABAT_SALE_KENITRA', label: 'Rabat-Salé-Kénitra', factor: 1 },
  { id: 'TANGER', label: 'Tanger', factor: null },
  { id: 'MARRAKECH', label: 'Marrakech', factor: null },
  { id: 'AGADIR', label: 'Agadir', factor: null },
];

export interface EstimateRates {
  /** Nightly rate in MAD for a 1-bedroom property in a zone with factor 1. */
  baseNightly: Record<PropertyKind, number>;
  /** Spread applied around the nightly rate (0.15 = ±15%). */
  nightlySpread: number;
  occupancyLow: number;
  occupancyHigh: number;
  daysPerMonth: number;
}

export const ESTIMATE_RATES: EstimateRates = {
  baseNightly: { STUDIO: 350, APARTMENT: 500, VILLA: 1200 },
  nightlySpread: 0.15,
  occupancyLow: 0.55,
  occupancyHigh: 0.75,
  daysPerMonth: 30,
};

export interface EstimateInput {
  zoneId: string;
  configId: string;
}

export interface RevenueEstimate {
  nightlyLow: number;
  nightlyHigh: number;
  monthlyLow: number;
  monthlyHigh: number;
  occupancyLow: number;
  occupancyHigh: number;
}

export function bedroomFactor(kind: PropertyKind, bedrooms: number): number {
  if (kind === 'STUDIO' || bedrooms <= 1) return 1;
  if (bedrooms === 2) return 1.35;
  if (bedrooms === 3) return 1.7;
  if (bedrooms === 4) return 2;
  return 2.4;
}

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/** Indicative gross monthly revenue range, or `null` when the zone or configuration needs the team's analysis. */
export function estimateRevenue(input: EstimateInput, rates: EstimateRates = ESTIMATE_RATES): RevenueEstimate | null {
  const zone = ESTIMATE_ZONES.find((z) => z.id === input.zoneId);
  const config = PROPERTY_CONFIGS.find((c) => c.id === input.configId);
  if (!zone || zone.factor === null || !config || config.kind === null) return null;

  const nightly = rates.baseNightly[config.kind] * zone.factor * bedroomFactor(config.kind, config.bedrooms);
  const nightlyLow = nightly * (1 - rates.nightlySpread);
  const nightlyHigh = nightly * (1 + rates.nightlySpread);

  return {
    nightlyLow: roundTo(nightlyLow, 10),
    nightlyHigh: roundTo(nightlyHigh, 10),
    monthlyLow: roundTo(nightlyLow * rates.occupancyLow * rates.daysPerMonth, 100),
    monthlyHigh: roundTo(nightlyHigh * rates.occupancyHigh * rates.daysPerMonth, 100),
    occupancyLow: rates.occupancyLow,
    occupancyHigh: rates.occupancyHigh,
  };
}
