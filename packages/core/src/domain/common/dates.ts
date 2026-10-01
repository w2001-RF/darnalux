// Calendar-date helpers working on ISO dates ('YYYY-MM-DD').
// Reservations are date-based (not instant-based), so all arithmetic is done
// in UTC to stay independent from the device time zone.

export type ISODate = string;

const DAY_MS = 86_400_000;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isISODate(value: unknown): value is ISODate {
  if (typeof value !== 'string') return false;
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const [, y, m, d] = match;
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  return date.getUTCFullYear() === Number(y) && date.getUTCMonth() === Number(m) - 1 && date.getUTCDate() === Number(d);
}

export function parseISODate(value: ISODate): Date {
  if (!isISODate(value)) throw new RangeError(`Invalid ISO date: ${value}`);
  const [y, m, d] = value.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function toISODate(date: Date): ISODate {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Local calendar date of an instant (what the user sees on their wall clock).
export function toLocalISODate(date: Date): ISODate {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(value: ISODate, days: number): ISODate {
  return toISODate(new Date(parseISODate(value).getTime() + days * DAY_MS));
}

export function daysBetween(from: ISODate, to: ISODate): number {
  return Math.round((parseISODate(to).getTime() - parseISODate(from).getTime()) / DAY_MS);
}

export function nightsBetween(checkIn: ISODate, checkOut: ISODate): number {
  return Math.max(0, daysBetween(checkIn, checkOut));
}

// Half-open ranges [start, end): a stay ending on day X does not overlap a
// stay starting on day X (same-day turnover is allowed).
export function rangesOverlap(aStart: ISODate, aEnd: ISODate, bStart: ISODate, bEnd: ISODate): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function overlapNights(aStart: ISODate, aEnd: ISODate, bStart: ISODate, bEnd: ISODate): number {
  const start = aStart > bStart ? aStart : bStart;
  const end = aEnd < bEnd ? aEnd : bEnd;
  return start < end ? daysBetween(start, end) : 0;
}

export function eachDay(start: ISODate, endExclusive: ISODate): ISODate[] {
  const days: ISODate[] = [];
  for (let day = start; day < endExclusive; day = addDays(day, 1)) days.push(day);
  return days;
}

export function startOfMonth(year: number, monthIndex: number): ISODate {
  return toISODate(new Date(Date.UTC(year, monthIndex, 1)));
}

export function startOfNextMonth(year: number, monthIndex: number): ISODate {
  return toISODate(new Date(Date.UTC(year, monthIndex + 1, 1)));
}
