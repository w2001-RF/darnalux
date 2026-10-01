import type { Tone, ValidationResult } from '../common/validation';
import { isBlank, isEmail, isPhone, toResult } from '../common/validation';

export type OwnerStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

export const OWNER_STATUSES: readonly OwnerStatus[] = ['ACTIVE', 'INACTIVE', 'ARCHIVED'];

export const OWNER_STATUS_LABELS: Record<OwnerStatus, string> = {
  ACTIVE: 'Actif',
  INACTIVE: 'Inactif',
  ARCHIVED: 'Archivé',
};

export const OWNER_STATUS_TONES: Record<OwnerStatus, Tone> = {
  ACTIVE: 'success',
  INACTIVE: 'neutral',
  ARCHIVED: 'neutral',
};

export interface OwnerInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  status: OwnerStatus;
  internalNotes: string;
}

export type OwnerField = keyof OwnerInput;

export function emptyOwnerInput(): OwnerInput {
  return { firstName: '', lastName: '', email: '', phone: '', address: '', city: '', status: 'ACTIVE', internalNotes: '' };
}

export function validateOwnerInput(input: OwnerInput): ValidationResult<OwnerField> {
  const errors: Partial<Record<OwnerField, string>> = {};
  if (isBlank(input.firstName)) errors.firstName = 'Le prénom est obligatoire.';
  if (isBlank(input.lastName)) errors.lastName = 'Le nom est obligatoire.';
  if (!isBlank(input.email) && !isEmail(input.email)) errors.email = 'Adresse email invalide.';
  if (!isBlank(input.phone) && !isPhone(input.phone)) errors.phone = 'Numéro de téléphone invalide.';
  if (isBlank(input.email) && isBlank(input.phone)) {
    errors.phone = errors.phone ?? 'Renseignez au moins un email ou un téléphone.';
  }
  if (!OWNER_STATUSES.includes(input.status)) errors.status = 'Statut invalide.';
  return toResult(errors);
}

export function personFullName(firstName: string | null | undefined, lastName: string | null | undefined): string {
  return [firstName, lastName].filter((part) => part && part.trim()).join(' ').trim();
}
