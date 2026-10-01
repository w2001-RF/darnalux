import type { Tone, ValidationResult } from '../common/validation';
import { isBlank, isEmail, isPhone, toResult } from '../common/validation';

export type GuestVerificationStatus = 'NOT_STARTED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
export type IdentityDocumentType = 'ID_CARD' | 'PASSPORT' | 'DRIVING_LICENSE';

export const IDENTITY_DOCUMENT_TYPES: readonly IdentityDocumentType[] = ['ID_CARD', 'PASSPORT', 'DRIVING_LICENSE'];

export const IDENTITY_DOCUMENT_LABELS: Record<IdentityDocumentType, string> = {
  ID_CARD: "Carte d'identité",
  PASSPORT: 'Passeport',
  DRIVING_LICENSE: 'Permis de conduire',
};

export const GUEST_VERIFICATION_LABELS: Record<GuestVerificationStatus, string> = {
  NOT_STARTED: 'Non vérifié',
  PENDING: 'En attente',
  VERIFIED: 'Vérifié',
  REJECTED: 'Refusé',
};

export const GUEST_VERIFICATION_TONES: Record<GuestVerificationStatus, Tone> = {
  NOT_STARTED: 'neutral',
  PENDING: 'warning',
  VERIFIED: 'success',
  REJECTED: 'danger',
};

export interface GuestInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  nationality: string;
  internalNotes: string;
}

export type GuestField = keyof GuestInput;

export function emptyGuestInput(): GuestInput {
  return { firstName: '', lastName: '', email: '', phone: '', nationality: '', internalNotes: '' };
}

export function validateGuestInput(input: GuestInput): ValidationResult<GuestField> {
  const errors: Partial<Record<GuestField, string>> = {};
  if (isBlank(input.firstName)) errors.firstName = 'Le prénom est obligatoire.';
  if (isBlank(input.lastName)) errors.lastName = 'Le nom est obligatoire.';
  if (!isBlank(input.email) && !isEmail(input.email)) errors.email = 'Adresse email invalide.';
  if (!isBlank(input.phone) && !isPhone(input.phone)) errors.phone = 'Numéro de téléphone invalide.';
  return toResult(errors);
}

export interface BlacklistState {
  isBlacklisted: boolean;
  blacklistReason: string | null;
}

export interface GuestRiskAssessment {
  blocked: boolean;
  message: string | null;
}

export function assessGuestRisk(guest: BlacklistState | null | undefined): GuestRiskAssessment {
  if (!guest || !guest.isBlacklisted) return { blocked: false, message: null };
  const reason = guest.blacklistReason?.trim();
  return {
    blocked: true,
    message: reason ? `Voyageur en liste noire : ${reason}` : 'Voyageur en liste noire.',
  };
}

export function validateBlacklistReason(reason: string): string | null {
  if (isBlank(reason)) return 'Indiquez le motif de la mise en liste noire.';
  if (reason.trim().length < 5) return 'Le motif doit contenir au moins 5 caractères.';
  return null;
}
