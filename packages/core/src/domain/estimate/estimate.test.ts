import { describe, expect, it } from 'vitest';
import { ESTIMATE_RATES, PROPERTY_CONFIGS, bedroomFactor, estimateRevenue } from './index';

const ZONE = 'RABAT_SALE_KENITRA';

describe('estimateRevenue', () => {
  it('returns an ordered range for the covered zone', () => {
    const r = estimateRevenue({ zoneId: ZONE, configId: 'APARTMENT_2' });
    expect(r).not.toBeNull();
    expect(r!.nightlyLow).toBeLessThan(r!.nightlyHigh);
    expect(r!.monthlyLow).toBeLessThan(r!.monthlyHigh);
  });

  it('computes the documented example', () => {
    // 500 * 1 * 1.35 = 675 nightly; spread ±15%; occupancy 55%-75%; 30 days.
    const r = estimateRevenue({ zoneId: ZONE, configId: 'APARTMENT_2' })!;
    expect(r.nightlyLow).toBe(570);
    expect(r.nightlyHigh).toBe(780);
    expect(r.monthlyLow).toBe(9500);
    expect(r.monthlyHigh).toBe(17500);
  });

  it('gives no automatic estimate for other zones, unknown ids or custom configurations', () => {
    expect(estimateRevenue({ zoneId: 'MARRAKECH', configId: 'VILLA_3' })).toBeNull();
    expect(estimateRevenue({ zoneId: 'NOWHERE', configId: 'VILLA_3' })).toBeNull();
    expect(estimateRevenue({ zoneId: ZONE, configId: 'OTHER' })).toBeNull();
    expect(estimateRevenue({ zoneId: ZONE, configId: 'UNKNOWN' })).toBeNull();
  });

  it('scales with the number of bedrooms and the property kind', () => {
    const small = estimateRevenue({ zoneId: ZONE, configId: 'APARTMENT_1' })!;
    const big = estimateRevenue({ zoneId: ZONE, configId: 'APARTMENT_4' })!;
    expect(big.monthlyLow).toBeGreaterThan(small.monthlyLow);
    const villa = estimateRevenue({ zoneId: ZONE, configId: 'VILLA_2' })!;
    const apartment = estimateRevenue({ zoneId: ZONE, configId: 'APARTMENT_2' })!;
    expect(villa.monthlyLow).toBeGreaterThan(apartment.monthlyLow);
  });

  it('ignores bedrooms for a studio', () => {
    expect(bedroomFactor('STUDIO', 4)).toBe(1);
    expect(bedroomFactor('APARTMENT', 5)).toBe(2.4);
  });

  it('accepts a custom rate table', () => {
    const rates = { ...ESTIMATE_RATES, occupancyLow: 1, occupancyHigh: 1, nightlySpread: 0 };
    const r = estimateRevenue({ zoneId: ZONE, configId: 'STUDIO' }, rates)!;
    expect(r.monthlyLow).toBe(r.monthlyHigh);
  });

  it('lists unique configuration ids', () => {
    expect(new Set(PROPERTY_CONFIGS.map((c) => c.id)).size).toBe(PROPERTY_CONFIGS.length);
  });
});
