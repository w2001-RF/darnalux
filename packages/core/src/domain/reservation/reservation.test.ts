import { describe, expect, it } from 'vitest';
import type { ReservationInput, ReservationSlot } from './index';
import {
  canTransitionReservation,
  findReservationConflicts,
  isBlockingReservationStatus,
  nextReservationStatuses,
  stayPhase,
  validateReservationInput,
} from './index';

function input(overrides: Partial<ReservationInput> = {}): ReservationInput {
  return {
    propertyId: 'p1',
    guestId: null,
    source: 'DIRECT',
    externalReference: '',
    checkIn: '2026-04-11',
    checkOut: '2026-04-18',
    guestsCount: 2,
    grossAmount: 7000,
    commissionRate: 20,
    platformFees: 0,
    smartLockCode: '',
    notes: '',
    ...overrides,
  };
}

describe('reservation status machine', () => {
  it('follows the operational lifecycle', () => {
    expect(canTransitionReservation('PENDING', 'CONFIRMED')).toBe(true);
    expect(canTransitionReservation('CONFIRMED', 'CHECK_IN')).toBe(true);
    expect(canTransitionReservation('CHECK_OUT', 'COMPLETED')).toBe(true);
  });

  it('forbids skipping steps or leaving terminal states', () => {
    expect(canTransitionReservation('PENDING', 'COMPLETED')).toBe(false);
    expect(canTransitionReservation('CANCELLED', 'CONFIRMED')).toBe(false);
    expect(nextReservationStatuses('COMPLETED')).toEqual([]);
  });

  it('only cancelled and no-show stays free the calendar', () => {
    expect(isBlockingReservationStatus('CANCELLED')).toBe(false);
    expect(isBlockingReservationStatus('NO_SHOW')).toBe(false);
    expect(isBlockingReservationStatus('PENDING')).toBe(true);
  });
});

describe('validateReservationInput', () => {
  it('accepts a valid reservation', () => {
    expect(validateReservationInput(input(), { capacity: 4 }).valid).toBe(true);
  });

  it('rejects inverted or empty stays', () => {
    expect(validateReservationInput(input({ checkOut: '2026-04-11' })).errors.checkOut).toBeDefined();
    expect(validateReservationInput(input({ checkIn: '2026-13-01' })).errors.checkIn).toBeDefined();
  });

  it('enforces the property capacity', () => {
    const result = validateReservationInput(input({ guestsCount: 6 }), { capacity: 4 });
    expect(result.errors.guestsCount).toContain('4');
  });

  it('rejects fees above the gross amount and invalid commissions', () => {
    const result = validateReservationInput(input({ platformFees: 8000, commissionRate: 120 }));
    expect(result.errors.platformFees).toBeDefined();
    expect(result.errors.commissionRate).toBeDefined();
  });
});

describe('findReservationConflicts', () => {
  const existing: ReservationSlot[] = [
    { id: 'a', propertyId: 'p1', checkIn: '2026-04-01', checkOut: '2026-04-11', status: 'CONFIRMED' },
    { id: 'b', propertyId: 'p1', checkIn: '2026-04-15', checkOut: '2026-04-20', status: 'CANCELLED' },
    { id: 'c', propertyId: 'p2', checkIn: '2026-04-12', checkOut: '2026-04-14', status: 'CONFIRMED' },
    { id: 'd', propertyId: 'p1', checkIn: '2026-04-17', checkOut: '2026-04-22', status: 'PENDING' },
  ];

  it('detects overlaps on the same property, ignoring cancelled stays', () => {
    const conflicts = findReservationConflicts({ propertyId: 'p1', checkIn: '2026-04-11', checkOut: '2026-04-18' }, existing);
    expect(conflicts.map((c) => c.id)).toEqual(['d']);
  });

  it('ignores the reservation being edited', () => {
    const conflicts = findReservationConflicts({ id: 'd', propertyId: 'p1', checkIn: '2026-04-17', checkOut: '2026-04-21' }, existing);
    expect(conflicts).toEqual([]);
  });
});

describe('stayPhase', () => {
  it('classifies a stay relative to today', () => {
    expect(stayPhase('2026-04-11', '2026-04-18', '2026-04-10')).toBe('UPCOMING');
    expect(stayPhase('2026-04-11', '2026-04-18', '2026-04-11')).toBe('ARRIVING');
    expect(stayPhase('2026-04-11', '2026-04-18', '2026-04-15')).toBe('IN_HOUSE');
    expect(stayPhase('2026-04-11', '2026-04-18', '2026-04-18')).toBe('DEPARTING');
    expect(stayPhase('2026-04-11', '2026-04-18', '2026-04-19')).toBe('PAST');
  });
});
