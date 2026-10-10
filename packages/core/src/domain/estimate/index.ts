// Public revenue estimator for the landing page.
// IMPORTANT: every number in ESTIMATE_RATES is a placeholder assumption, not market data.
// Calibrate the table with real DarnaLux results before relying on the output.

export const PROPERTY_KINDS = ['STUDIO', 'APARTMENT', 'DUPLEX', 'VILLA', 'VILLA_FLOOR'] as const;
export type PropertyKind = (typeof PROPERTY_KINDS)[number];

export const PROPERTY_KIND_LABELS: Record<PropertyKind, string> = {
  STUDIO: 'Studio',
  APARTMENT: 'Appartement',
  DUPLEX: 'Duplex',
  VILLA: 'Villa',
  VILLA_FLOOR: 'Étage de villa',
};

export const STANDINGS = ['STANDARD', 'COMFORT', 'PREMIUM'] as const;
export type Standing = (typeof STANDINGS)[number];

export const STANDING_LABELS: Record<Standing, string> = {
  STANDARD: 'Standard',
  COMFORT: 'Confort',
  PREMIUM: 'Premium',
};

export interface EstimateZone {
  id: string;
  label: string;
  group: string;
  /** Price multiplier for the zone. `null` means no automatic estimate (custom quote only). */
  factor: number | null;
}

export const ESTIMATE_ZONES: readonly EstimateZone[] = [
  { id: 'AGDAL', label: 'Agdal', group: 'Rabat', factor: 1.15 },
  { id: 'HAY_RIAD', label: 'Hay Riad', group: 'Rabat', factor: 1.2 },
  { id: 'HASSAN_OCEAN', label: 'Hassan / Océan / Kasbah', group: 'Rabat', factor: 1.1 },
  { id: 'SOUISSI', label: 'Souissi / Aviation', group: 'Rabat', factor: 1.25 },
  { id: 'RABAT_OTHER', label: 'Autre quartier de Rabat', group: 'Rabat', factor: 0.95 },
  { id: 'SALE_TEMARA', label: 'Salé / Témara', group: 'Alentours', factor: 0.8 },
  { id: 'BOUZNIKA', label: 'Bouznika', group: 'Alentours', factor: 0.9 },
  { id: 'KENITRA', label: 'Kénitra', group: 'Alentours', factor: 0.75 },
  { id: 'OTHER', label: 'Autre zone', group: 'Autre', factor: null },
];

export interface EstimateRates {
  /** Nightly rate in MAD for a 1-bedroom, comfort-standing property in a zone with factor 1. */
  baseNightly: Record<PropertyKind, number>;
  standing: Record<Standing, number>;
  /** Spread applied around the nightly rate (0.15 = ±15%). */
  nightlySpread: number;
  occupancyLow: number;
  occupancyHigh: number;
  daysPerMonth: number;
}

export const ESTIMATE_RATES: EstimateRates = {
  baseNightly: { STUDIO: 350, APARTMENT: 500, DUPLEX: 650, VILLA: 1200, VILLA_FLOOR: 700 },
  standing: { STANDARD: 0.9, COMFORT: 1, PREMIUM: 1.3 },
  nightlySpread: 0.15,
  occupancyLow: 0.55,
  occupancyHigh: 0.75,
  daysPerMonth: 30,
};

export interface EstimateInput {
  kind: PropertyKind;
  zoneId: string;
  bedrooms: number;
  standing: Standing;
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
  return 2;
}

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/** Indicative gross monthly revenue range, or `null` when the zone requires a custom quote. */
export function estimateRevenue(input: EstimateInput, rates: EstimateRates = ESTIMATE_RATES): RevenueEstimate | null {
  const zone = ESTIMATE_ZONES.find((z) => z.id === input.zoneId);
  if (!zone || zone.factor === null) return null;

  const nightly = rates.baseNightly[input.kind] * rates.standing[input.standing] * zone.factor * bedroomFactor(input.kind, input.bedrooms);
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
