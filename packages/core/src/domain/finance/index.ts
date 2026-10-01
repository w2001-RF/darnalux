import type { ISODate } from '../common/dates';
import { daysBetween, nightsBetween, overlapNights } from '../common/dates';
import { percentOf, roundMoney } from '../common/money';
import type { Tone } from '../common/validation';
import type { ReservationStatus } from '../reservation';
import { isBlockingReservationStatus } from '../reservation';

export type ExpenseCategory = 'CLEANING' | 'MAINTENANCE' | 'SUPPLIES' | 'UTILITIES' | 'TAX' | 'OTHER';

export const EXPENSE_CATEGORIES: readonly ExpenseCategory[] = ['CLEANING', 'MAINTENANCE', 'SUPPLIES', 'UTILITIES', 'TAX', 'OTHER'];

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  CLEANING: 'Ménage',
  MAINTENANCE: 'Maintenance',
  SUPPLIES: 'Fournitures',
  UTILITIES: 'Charges (eau, électricité…)',
  TAX: 'Taxes',
  OTHER: 'Autre',
};

export const EXPENSE_CATEGORY_TONES: Record<ExpenseCategory, Tone> = {
  CLEANING: 'info',
  MAINTENANCE: 'warning',
  SUPPLIES: 'neutral',
  UTILITIES: 'neutral',
  TAX: 'gold',
  OTHER: 'neutral',
};

export interface ReservationFinanceInput {
  grossAmount: number;
  commissionRate: number;
  platformFees: number;
  expenses?: number;
}

export interface ReservationFinance {
  gross: number;
  commission: number;
  platformFees: number;
  expenses: number;
  ownerNet: number;
}

// Revenu brut − Commission DarnaLux − Frais − Dépenses = Revenu net propriétaire.
// The commission is computed on the gross amount.
export function computeReservationFinance(input: ReservationFinanceInput): ReservationFinance {
  const gross = roundMoney(input.grossAmount);
  const commission = percentOf(gross, input.commissionRate);
  const platformFees = roundMoney(input.platformFees);
  const expenses = roundMoney(input.expenses ?? 0);
  return {
    gross,
    commission,
    platformFees,
    expenses,
    ownerNet: roundMoney(gross - commission - platformFees - expenses),
  };
}

export interface PerformanceReservation {
  propertyId: string;
  checkIn: ISODate;
  checkOut: ISODate;
  status: ReservationStatus;
  grossAmount: number;
  commissionRate: number;
  platformFees: number;
}

export interface PerformanceExpense {
  propertyId: string;
  amount: number;
  incurredOn: ISODate;
  chargedToOwner: boolean;
}

export interface PeriodPerformance {
  nightsAvailable: number;
  nightsBooked: number;
  occupancyRate: number | null;
  revenue: number;
  commissions: number;
  platformFees: number;
  expenses: number;
  ownerNet: number;
  adr: number | null;
  revpar: number | null;
  reservations: number;
  cancellations: number;
}

export interface PeriodInput {
  periodStart: ISODate;
  periodEnd: ISODate;
  propertyCount: number;
  reservations: readonly PerformanceReservation[];
  expenses: readonly PerformanceExpense[];
}

// Revenue is pro-rated by the nights that fall inside the period, so a stay
// spanning two months is split between them. Cancelled/no-show stays are
// counted separately and generate no revenue.
export function computePeriodPerformance(input: PeriodInput): PeriodPerformance {
  const periodDays = Math.max(0, daysBetween(input.periodStart, input.periodEnd));
  const nightsAvailable = periodDays * Math.max(0, input.propertyCount);
  let nightsBooked = 0;
  let revenue = 0;
  let commissions = 0;
  let platformFees = 0;
  let reservations = 0;
  let cancellations = 0;

  for (const stay of input.reservations) {
    const inPeriod = overlapNights(stay.checkIn, stay.checkOut, input.periodStart, input.periodEnd);
    if (inPeriod === 0) continue;
    if (!isBlockingReservationStatus(stay.status)) {
      cancellations += 1;
      continue;
    }
    reservations += 1;
    const share = inPeriod / Math.max(1, nightsBetween(stay.checkIn, stay.checkOut));
    const finance = computeReservationFinance(stay);
    nightsBooked += inPeriod;
    revenue += finance.gross * share;
    commissions += finance.commission * share;
    platformFees += finance.platformFees * share;
  }

  const expenses = input.expenses
    .filter((e) => e.chargedToOwner && e.incurredOn >= input.periodStart && e.incurredOn < input.periodEnd)
    .reduce((sum, e) => sum + e.amount, 0);

  revenue = roundMoney(revenue);
  commissions = roundMoney(commissions);
  platformFees = roundMoney(platformFees);

  return {
    nightsAvailable,
    nightsBooked,
    occupancyRate: nightsAvailable > 0 ? (nightsBooked / nightsAvailable) * 100 : null,
    revenue,
    commissions,
    platformFees,
    expenses: roundMoney(expenses),
    ownerNet: roundMoney(revenue - commissions - platformFees - expenses),
    adr: nightsBooked > 0 ? roundMoney(revenue / nightsBooked) : null,
    revpar: nightsAvailable > 0 ? roundMoney(revenue / nightsAvailable) : null,
    reservations,
    cancellations,
  };
}

export function performanceByProperty(
  propertyIds: readonly string[],
  input: Omit<PeriodInput, 'propertyCount'>,
): Map<string, PeriodPerformance> {
  const result = new Map<string, PeriodPerformance>();
  for (const propertyId of propertyIds) {
    result.set(
      propertyId,
      computePeriodPerformance({
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        propertyCount: 1,
        reservations: input.reservations.filter((r) => r.propertyId === propertyId),
        expenses: input.expenses.filter((e) => e.propertyId === propertyId),
      }),
    );
  }
  return result;
}
