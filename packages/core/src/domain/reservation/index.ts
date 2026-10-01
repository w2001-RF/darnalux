import type { ISODate } from '../common/dates';
import { isISODate, nightsBetween, rangesOverlap } from '../common/dates';
import type { Tone, ValidationResult } from '../common/validation';
import { isNonNegativeNumber, isPercent, toResult } from '../common/validation';
import type { BookingChannel } from '../property';
import { BOOKING_CHANNELS } from '../property';

export type ReservationStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CHECK_IN'
  | 'IN_PROGRESS'
  | 'CHECK_OUT'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export const RESERVATION_STATUSES: readonly ReservationStatus[] = [
  'PENDING',
  'CONFIRMED',
  'CHECK_IN',
  'IN_PROGRESS',
  'CHECK_OUT',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
];

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  PENDING: 'En attente',
  CONFIRMED: 'Confirmée',
  CHECK_IN: 'Check-in',
  IN_PROGRESS: 'En séjour',
  CHECK_OUT: 'Check-out',
  COMPLETED: 'Terminée',
  CANCELLED: 'Annulée',
  NO_SHOW: 'No-show',
};

export const RESERVATION_STATUS_TONES: Record<ReservationStatus, Tone> = {
  PENDING: 'warning',
  CONFIRMED: 'info',
  CHECK_IN: 'gold',
  IN_PROGRESS: 'gold',
  CHECK_OUT: 'gold',
  COMPLETED: 'success',
  CANCELLED: 'danger',
  NO_SHOW: 'danger',
};

const TRANSITIONS: Record<ReservationStatus, readonly ReservationStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['CHECK_IN', 'CANCELLED', 'NO_SHOW'],
  CHECK_IN: ['IN_PROGRESS', 'CHECK_OUT'],
  IN_PROGRESS: ['CHECK_OUT'],
  CHECK_OUT: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

export function nextReservationStatuses(from: ReservationStatus): readonly ReservationStatus[] {
  return TRANSITIONS[from];
}

export function canTransitionReservation(from: ReservationStatus, to: ReservationStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

// Statuses that occupy the property on the calendar and count as revenue.
export function isBlockingReservationStatus(status: ReservationStatus): boolean {
  return status !== 'CANCELLED' && status !== 'NO_SHOW';
}

export function isOpenReservationStatus(status: ReservationStatus): boolean {
  return status !== 'CANCELLED' && status !== 'NO_SHOW' && status !== 'COMPLETED';
}

export interface ReservationInput {
  propertyId: string;
  guestId: string | null;
  source: BookingChannel;
  externalReference: string;
  checkIn: ISODate;
  checkOut: ISODate;
  guestsCount: number;
  grossAmount: number;
  commissionRate: number;
  platformFees: number;
  smartLockCode: string;
  notes: string;
}

export type ReservationField = keyof ReservationInput;

export const MAX_STAY_NIGHTS = 365;

export function validateReservationInput(
  input: ReservationInput,
  context: { capacity?: number | null } = {},
): ValidationResult<ReservationField> {
  const errors: Partial<Record<ReservationField, string>> = {};
  if (!input.propertyId) errors.propertyId = 'Choisissez un bien.';
  if (!BOOKING_CHANNELS.includes(input.source)) errors.source = 'Source invalide.';
  if (!isISODate(input.checkIn)) errors.checkIn = "Date d'arrivée invalide.";
  if (!isISODate(input.checkOut)) errors.checkOut = 'Date de départ invalide.';
  if (!errors.checkIn && !errors.checkOut) {
    const nights = nightsBetween(input.checkIn, input.checkOut);
    if (nights < 1) errors.checkOut = "Le départ doit être après l'arrivée.";
    else if (nights > MAX_STAY_NIGHTS) errors.checkOut = `Un séjour ne peut pas dépasser ${MAX_STAY_NIGHTS} nuits.`;
  }
  if (!Number.isInteger(input.guestsCount) || input.guestsCount < 1) {
    errors.guestsCount = 'Au moins 1 voyageur.';
  } else if (context.capacity && input.guestsCount > context.capacity) {
    errors.guestsCount = `Ce bien accueille au maximum ${context.capacity} voyageur(s).`;
  }
  if (!isNonNegativeNumber(input.grossAmount)) errors.grossAmount = 'Montant invalide.';
  if (!isPercent(input.commissionRate)) errors.commissionRate = 'Commission entre 0 et 100 %.';
  if (!isNonNegativeNumber(input.platformFees)) errors.platformFees = 'Frais invalides.';
  else if (isNonNegativeNumber(input.grossAmount) && input.platformFees > input.grossAmount) {
    errors.platformFees = 'Les frais ne peuvent pas dépasser le montant brut.';
  }
  return toResult(errors);
}

export interface ReservationSlot {
  id?: string | null;
  propertyId: string;
  checkIn: ISODate;
  checkOut: ISODate;
  status: ReservationStatus;
}

// Mirrors the reservations_no_overlap exclusion constraint so the UI can warn
// before saving; the database remains the authority.
export function findReservationConflicts<T extends ReservationSlot>(
  candidate: Omit<ReservationSlot, 'status'>,
  existing: readonly T[],
): T[] {
  return existing.filter(
    (other) =>
      other.propertyId === candidate.propertyId &&
      (candidate.id == null || other.id !== candidate.id) &&
      isBlockingReservationStatus(other.status) &&
      rangesOverlap(candidate.checkIn, candidate.checkOut, other.checkIn, other.checkOut),
  );
}

export type StayPhase = 'UPCOMING' | 'ARRIVING' | 'IN_HOUSE' | 'DEPARTING' | 'PAST';

export function stayPhase(checkIn: ISODate, checkOut: ISODate, today: ISODate): StayPhase {
  if (today < checkIn) return 'UPCOMING';
  if (today === checkIn) return 'ARRIVING';
  if (today < checkOut) return 'IN_HOUSE';
  if (today === checkOut) return 'DEPARTING';
  return 'PAST';
}
