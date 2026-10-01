import type { ISODate } from '../common/dates';
import { addDays, parseISODate, startOfMonth, startOfNextMonth } from '../common/dates';

export interface CalendarDay {
  date: ISODate;
  inMonth: boolean;
}

export const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'] as const;

export const MONTH_LABELS = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
] as const;

// Monday-first weeks covering the whole month (leading/trailing days of the
// neighbouring months are included with inMonth = false).
export function buildMonthGrid(year: number, monthIndex: number): CalendarDay[][] {
  const first = startOfMonth(year, monthIndex);
  const next = startOfNextMonth(year, monthIndex);
  const mondayOffset = (parseISODate(first).getUTCDay() + 6) % 7;
  let cursor = addDays(first, -mondayOffset);
  const weeks: CalendarDay[][] = [];
  while (cursor < next) {
    const week: CalendarDay[] = [];
    for (let i = 0; i < 7; i += 1) {
      week.push({ date: cursor, inMonth: cursor >= first && cursor < next });
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
  }
  return weeks;
}

export type StayDayRole = 'CHECK_IN' | 'STAY' | 'CHECK_OUT';

export function stayDayRole(stay: { checkIn: ISODate; checkOut: ISODate }, day: ISODate): StayDayRole | null {
  if (day === stay.checkIn) return 'CHECK_IN';
  if (day === stay.checkOut) return 'CHECK_OUT';
  if (day > stay.checkIn && day < stay.checkOut) return 'STAY';
  return null;
}

export function shiftMonth(year: number, monthIndex: number, delta: number): { year: number; monthIndex: number } {
  const total = year * 12 + monthIndex + delta;
  return { year: Math.floor(total / 12), monthIndex: ((total % 12) + 12) % 12 };
}
