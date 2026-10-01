import { describe, expect, it } from 'vitest';
import { buildMonthGrid, shiftMonth, stayDayRole } from './calendar';
import { buildStoragePath, sanitizeFileName, validateUpload } from './document';
import { assessGuestRisk } from './guest';
import { computeCampaignKpis, sumMetrics, validateCampaignInput } from './marketing';
import { validateOwnerInput, emptyOwnerInput } from './owner';
import { emptyPropertyInput, validatePropertyInput } from './property';

describe('calendar', () => {
  it('builds Monday-first weeks covering April 2026', () => {
    const weeks = buildMonthGrid(2026, 3);
    expect(weeks[0][0]).toEqual({ date: '2026-03-30', inMonth: false });
    expect(weeks[0][2]).toEqual({ date: '2026-04-01', inMonth: true });
    expect(weeks.at(-1)?.at(-1)?.date).toBe('2026-05-03');
    expect(weeks.every((week) => week.length === 7)).toBe(true);
  });

  it('classifies days of a stay and shifts months across years', () => {
    const stay = { checkIn: '2026-04-11', checkOut: '2026-04-14' };
    expect(stayDayRole(stay, '2026-04-11')).toBe('CHECK_IN');
    expect(stayDayRole(stay, '2026-04-12')).toBe('STAY');
    expect(stayDayRole(stay, '2026-04-14')).toBe('CHECK_OUT');
    expect(stayDayRole(stay, '2026-04-15')).toBeNull();
    expect(shiftMonth(2026, 0, -1)).toEqual({ year: 2025, monthIndex: 11 });
    expect(shiftMonth(2026, 11, 1)).toEqual({ year: 2027, monthIndex: 0 });
  });
});

describe('documents', () => {
  it('sanitizes file names and prevents path traversal', () => {
    expect(sanitizeFileName('../../Contrat été 2026.pdf')).toBe('Contrat-ete-2026.pdf');
    expect(buildStoragePath(['owners', '../x'], 'a b.pdf', 'id1')).toBe('owners/x/id1-a-b.pdf');
  });

  it('validates size and type', () => {
    expect(validateUpload({ type: 'application/pdf', size: 1000 })).toBeNull();
    expect(validateUpload({ type: 'application/x-msdownload', size: 1000 })).not.toBeNull();
    expect(validateUpload({ type: 'application/pdf', size: 11 * 1024 * 1024 })).not.toBeNull();
  });
});

describe('guest risk', () => {
  it('flags blacklisted guests with their reason', () => {
    expect(assessGuestRisk(null).blocked).toBe(false);
    expect(assessGuestRisk({ isBlacklisted: true, blacklistReason: 'Dégradations' })).toEqual({
      blocked: true,
      message: 'Voyageur en liste noire : Dégradations',
    });
  });
});

describe('marketing KPIs', () => {
  it('computes CTR, CPC, CPM, ROAS and CAC', () => {
    const kpis = computeCampaignKpis({ spend: 1000, impressions: 50000, reach: 30000, clicks: 500, leads: 20, bookings: 4, revenue: 12000 });
    expect(kpis).toEqual({ ctr: 1, cpc: 2, cpm: 20, roas: 12, cac: 250, costPerBooking: 250, costPerLead: 50 });
  });

  it('returns null instead of dividing by zero', () => {
    const kpis = computeCampaignKpis({ spend: 0, impressions: 0, reach: 0, clicks: 0, leads: 0, bookings: 0, revenue: 0 });
    expect(Object.values(kpis).every((value) => value === null)).toBe(true);
  });

  it('sums metrics and validates campaigns', () => {
    const one = { spend: 10.1, impressions: 1, reach: 1, clicks: 1, leads: 0, bookings: 0, revenue: 0.2 };
    expect(sumMetrics([one, one]).spend).toBe(20.2);
    const invalid = validateCampaignInput({
      name: '',
      propertyId: null,
      objective: 'BOOKINGS',
      channel: 'META',
      budget: -1,
      startsOn: '2026-05-01',
      endsOn: '2026-04-01',
      audience: '',
      landingUrl: 'http://insecure.example',
      status: 'DRAFT',
    });
    expect(Object.keys(invalid.errors).sort()).toEqual(['budget', 'endsOn', 'landingUrl', 'name']);
  });
});

describe('owner and property validation', () => {
  it('requires a contact channel for owners', () => {
    const result = validateOwnerInput({ ...emptyOwnerInput(), firstName: 'A', lastName: 'B' });
    expect(result.errors.phone).toBeDefined();
  });

  it('requires coherent GPS coordinates', () => {
    const result = validatePropertyInput({ ...emptyPropertyInput(), name: 'Villa', city: 'Rabat', latitude: 34, longitude: null });
    expect(result.errors.longitude).toBeDefined();
    expect(validatePropertyInput({ ...emptyPropertyInput(), name: 'Villa', city: 'Rabat', latitude: 34, longitude: -6.8 }).valid).toBe(true);
  });
});
