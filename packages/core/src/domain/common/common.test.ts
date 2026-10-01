import { describe, expect, it } from 'vitest';
import {
  addDays,
  daysBetween,
  eachDay,
  isISODate,
  nightsBetween,
  overlapNights,
  parseISODate,
  rangesOverlap,
} from './dates';
import { formatPercent, percentOf, roundMoney } from './money';
import { sanitizeSearchTerm } from './search';
import { isEmail, isPhone } from './validation';

describe('ISO dates', () => {
  it('validates real calendar dates only', () => {
    expect(isISODate('2026-02-28')).toBe(true);
    expect(isISODate('2026-02-30')).toBe(false);
    expect(isISODate('2026-2-3')).toBe(false);
    expect(isISODate(20260101)).toBe(false);
    expect(() => parseISODate('nope')).toThrow(RangeError);
  });

  it('adds days across months and leap years', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('counts nights and never returns negative values', () => {
    expect(nightsBetween('2026-04-11', '2026-04-18')).toBe(7);
    expect(nightsBetween('2026-04-18', '2026-04-11')).toBe(0);
    expect(daysBetween('2026-04-18', '2026-04-11')).toBe(-7);
  });

  it('treats ranges as half-open so same-day turnovers do not overlap', () => {
    expect(rangesOverlap('2026-04-01', '2026-04-05', '2026-04-05', '2026-04-08')).toBe(false);
    expect(rangesOverlap('2026-04-01', '2026-04-06', '2026-04-05', '2026-04-08')).toBe(true);
    expect(overlapNights('2026-03-28', '2026-04-03', '2026-04-01', '2026-05-01')).toBe(2);
    expect(overlapNights('2026-03-01', '2026-03-05', '2026-04-01', '2026-05-01')).toBe(0);
  });

  it('lists each day of a range', () => {
    expect(eachDay('2026-04-29', '2026-05-02')).toEqual(['2026-04-29', '2026-04-30', '2026-05-01']);
  });
});

describe('money', () => {
  it('rounds to cents and computes percentages', () => {
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
    expect(percentOf(1234.5, 20)).toBe(246.9);
    expect(formatPercent(null)).toBe('—');
    expect(formatPercent(87.25)).toBe('87,3 %');
  });
});

describe('validation helpers', () => {
  it('checks emails and phones', () => {
    expect(isEmail('contact@darnalux.ma')).toBe(true);
    expect(isEmail('contact@darnalux')).toBe(false);
    expect(isPhone('+212 6 12 34 56 78')).toBe(true);
    expect(isPhone('abc')).toBe(false);
  });
});

describe('sanitizeSearchTerm', () => {
  it('removes characters that would alter a PostgREST filter', () => {
    expect(sanitizeSearchTerm('  Villa, (Atlas)%* ')).toBe('Villa Atlas');
    expect(sanitizeSearchTerm('a'.repeat(100))).toHaveLength(60);
  });
});
