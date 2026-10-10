// Display helpers. Dates are formatted by hand so the output does not depend on the device's Intl data.

const pad = (n: number) => String(n).padStart(2, '0');

/** ISO calendar date ('2026-04-11') → '11/04/2026'. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const [y, m, d] = value.slice(0, 10).split('-');
  return y && m && d ? `${d}/${m}/${y}` : '—';
}

/** ISO instant → '11/04/2026 14:30' in the device's local time. */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const SHORT_DAYS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];

/** ISO calendar date → 'lun. 11/04'. */
export function formatShortDay(value: string): string {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return '—';
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${SHORT_DAYS[weekday]} ${pad(d)}/${pad(m)}`;
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

/** 12500 → '12 500 MAD' (no Intl currency formatting, which varies between devices). */
export function formatMad(value: number): string {
  const rounded = Math.round(value);
  const sign = rounded < 0 ? '-' : '';
  const digits = String(Math.abs(rounded)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${sign}${digits} MAD`;
}
