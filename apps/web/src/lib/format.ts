import { parseISODate } from '@darnalux/core';

const dateFormatter = new Intl.DateTimeFormat('fr-MA', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
const longDateFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const dateTimeFormatter = new Intl.DateTimeFormat('fr-MA', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});
const numberFormatter = new Intl.NumberFormat('fr-MA');

// ISO calendar date ('2026-04-11') → '11/04/2026'.
export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  try {
    return dateFormatter.format(parseISODate(value.slice(0, 10)));
  } catch {
    return '—';
  }
}

export function formatShortDay(value: string): string {
  try {
    return longDateFormatter.format(parseISODate(value));
  } catch {
    return value;
  }
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : dateTimeFormatter.format(date);
}

export function formatNumber(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : numberFormatter.format(value);
}

export function formatRelative(value: string): string {
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 30) return `il y a ${days} j`;
  return formatDateTime(value);
}

// 'YYYY-MM-DD' + 'HH:mm' in the user's local time → ISO instant for timestamptz.
export function localDateTimeToIso(date: string, time: string): string {
  return new Date(`${date}T${time}`).toISOString();
}

// ISO instant → value for <input type="datetime-local">.
export function isoToLocalInput(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function localInputToIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
