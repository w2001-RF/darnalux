import { describe, expect, it } from 'vitest';
import type { PerformanceReservation } from './index';
import { computePeriodPerformance, computeReservationFinance, performanceByProperty } from './index';

describe('computeReservationFinance', () => {
  it('applies gross − commission − fees − expenses', () => {
    expect(computeReservationFinance({ grossAmount: 10000, commissionRate: 20, platformFees: 300, expenses: 450 })).toEqual({
      gross: 10000,
      commission: 2000,
      platformFees: 300,
      expenses: 450,
      ownerNet: 7250,
    });
  });

  it('handles a zero commission and rounding', () => {
    const result = computeReservationFinance({ grossAmount: 999.99, commissionRate: 0, platformFees: 0.01 });
    expect(result.ownerNet).toBe(999.98);
  });
});

describe('computePeriodPerformance', () => {
  const stay = (overrides: Partial<PerformanceReservation>): PerformanceReservation => ({
    propertyId: 'p1',
    checkIn: '2026-04-01',
    checkOut: '2026-04-11',
    status: 'COMPLETED',
    grossAmount: 10000,
    commissionRate: 20,
    platformFees: 0,
    ...overrides,
  });

  it('computes occupancy, ADR and RevPAR for April (30 nights, 2 properties)', () => {
    const result = computePeriodPerformance({
      periodStart: '2026-04-01',
      periodEnd: '2026-05-01',
      propertyCount: 2,
      reservations: [stay({}), stay({ propertyId: 'p2', checkIn: '2026-04-20', checkOut: '2026-04-25', grossAmount: 5000 })],
      expenses: [{ propertyId: 'p1', amount: 500, incurredOn: '2026-04-12', chargedToOwner: true }],
    });
    expect(result.nightsAvailable).toBe(60);
    expect(result.nightsBooked).toBe(15);
    expect(result.occupancyRate).toBe(25);
    expect(result.revenue).toBe(15000);
    expect(result.commissions).toBe(3000);
    expect(result.expenses).toBe(500);
    expect(result.ownerNet).toBe(11500);
    expect(result.adr).toBe(1000);
    expect(result.revpar).toBe(250);
  });

  it('pro-rates stays spanning two periods and excludes cancellations from revenue', () => {
    const result = computePeriodPerformance({
      periodStart: '2026-04-01',
      periodEnd: '2026-05-01',
      propertyCount: 1,
      reservations: [
        stay({ checkIn: '2026-03-27', checkOut: '2026-04-06', grossAmount: 10000 }),
        stay({ checkIn: '2026-04-10', checkOut: '2026-04-12', status: 'CANCELLED' }),
      ],
      expenses: [{ propertyId: 'p1', amount: 999, incurredOn: '2026-05-02', chargedToOwner: true }],
    });
    expect(result.nightsBooked).toBe(5);
    expect(result.revenue).toBe(5000);
    expect(result.cancellations).toBe(1);
    expect(result.expenses).toBe(0);
  });

  it('returns null ratios when nothing is available', () => {
    const result = computePeriodPerformance({ periodStart: '2026-04-01', periodEnd: '2026-05-01', propertyCount: 0, reservations: [], expenses: [] });
    expect(result.occupancyRate).toBeNull();
    expect(result.adr).toBeNull();
    expect(result.revpar).toBeNull();
  });

  it('splits performance per property', () => {
    const map = performanceByProperty(['p1', 'p2'], {
      periodStart: '2026-04-01',
      periodEnd: '2026-05-01',
      reservations: [stay({})],
      expenses: [],
    });
    expect(map.get('p1')?.revenue).toBe(10000);
    expect(map.get('p2')?.revenue).toBe(0);
  });
});
