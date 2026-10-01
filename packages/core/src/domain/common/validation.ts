// Field-level validation result shared by every input validator. Messages
// are French end-user strings so Web and Mobile render them as-is.

export type FieldErrors<Field extends string = string> = Partial<Record<Field, string>>;

export interface ValidationResult<Field extends string = string> {
  valid: boolean;
  errors: FieldErrors<Field>;
}

export function toResult<Field extends string>(errors: FieldErrors<Field>): ValidationResult<Field> {
  return { valid: Object.keys(errors).length === 0, errors };
}

export function isBlank(value: string | null | undefined): boolean {
  return value === null || value === undefined || value.trim() === '';
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

export function isPhone(value: string): boolean {
  return /^\+?[0-9][0-9\s().-]{5,19}$/.test(value.trim());
}

export function isNonNegativeNumber(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

export function isPercent(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 100;
}

export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'gold';
