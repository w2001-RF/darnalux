export const DEFAULT_CURRENCY = 'MAD';

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function percentOf(amount: number, rate: number): number {
  return roundMoney((amount * rate) / 100);
}

export function formatMoney(value: number, currency: string = DEFAULT_CURRENCY): string {
  return new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number | null, fractionDigits = 1): string {
  if (value === null || !Number.isFinite(value)) return '—';
  return `${value.toFixed(fractionDigits).replace('.', ',')} %`;
}
