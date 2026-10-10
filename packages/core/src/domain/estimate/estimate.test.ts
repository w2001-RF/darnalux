import { describe, expect, it } from 'vitest';
import { ESTIMATE_RATES, bedroomFactor, estimateRevenue } from './index';

describe('estimateRevenue', () => {
  it('returns an ordered range for a known zone', () => {
    const r = estimateRevenue({ kind: 'APARTMENT', zoneId: 'AGDAL', bedrooms: 2, standing: 'COMFORT' });
    expect(r).not.toBeNull();
    expect(r!.nightlyLow).toBeLessThan(r!.nightlyHigh);
    expect(r!.monthlyLow).toBeLessThan(r!.monthlyHigh);
  });

  it('computes the documented example', () => {
    // 500 * 1.0 * 1.15 * 1.35 = 776.25 nightly; spread ±15%; occupancy 55%-75%; 30 days.
    const r = estimateRevenue({ kind: 'APARTMENT', zoneId: 'AGDAL', bedrooms: 2, standing: 'COMFORT' })!;
    expect(r.nightlyLow).toBe(660);
    expect(r.nightlyHigh).toBe(890);
    expect(r.monthlyLow).toBe(10900);
    expect(r.monthlyHigh).toBe(20100);
  });

  it('gives no automatic estimate for an unknown or custom zone', () => {
    expect(estimateRevenue({ kind: 'VILLA', zoneId: 'OTHER', bedrooms: 3, standing: 'PREMIUM' })).toBeNull();
    expect(estimateRevenue({ kind: 'VILLA', zoneId: 'NOWHERE', bedrooms: 3, standing: 'PREMIUM' })).toBeNull();
  });

  it('scales with standing and bedrooms', () => {
    const base = { kind: 'APARTMENT' as const, zoneId: 'AGDAL', bedrooms: 1 };
    const standard = estimateRevenue({ ...base, standing: 'STANDARD' })!;
    const premium = estimateRevenue({ ...base, standing: 'PREMIUM' })!;
    expect(premium.monthlyLow).toBeGreaterThan(standard.monthlyLow);
    const bigger = estimateRevenue({ ...base, bedrooms: 3, standing: 'STANDARD' })!;
    expect(bigger.monthlyLow).toBeGreaterThan(standard.monthlyLow);
  });

  it('ignores bedrooms for a studio', () => {
    expect(bedroomFactor('STUDIO', 4)).toBe(1);
    expect(bedroomFactor('APARTMENT', 4)).toBe(2);
  });

  it('accepts a custom rate table', () => {
    const rates = { ...ESTIMATE_RATES, occupancyLow: 1, occupancyHigh: 1, nightlySpread: 0 };
    const r = estimateRevenue({ kind: 'STUDIO', zoneId: 'KENITRA', bedrooms: 0, standing: 'COMFORT' }, rates)!;
    expect(r.monthlyLow).toBe(r.monthlyHigh);
  });
});
