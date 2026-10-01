import type { Tone, ValidationResult } from '../common/validation';
import { isBlank, toResult } from '../common/validation';

export type SupportCategory = 'TECHNICAL' | 'OPERATIONS' | 'BILLING' | 'OTHER';
export type SupportPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type SupportStatus = 'OPEN' | 'PENDING' | 'RESOLVED' | 'CLOSED';

export const SUPPORT_CATEGORIES: readonly SupportCategory[] = ['TECHNICAL', 'OPERATIONS', 'BILLING', 'OTHER'];
export const SUPPORT_PRIORITIES: readonly SupportPriority[] = ['LOW', 'MEDIUM', 'HIGH'];
export const SUPPORT_STATUSES: readonly SupportStatus[] = ['OPEN', 'PENDING', 'RESOLVED', 'CLOSED'];

export const SUPPORT_CATEGORY_LABELS: Record<SupportCategory, string> = {
  TECHNICAL: 'Technique',
  OPERATIONS: 'Opérations',
  BILLING: 'Facturation',
  OTHER: 'Autre',
};

export const SUPPORT_PRIORITY_LABELS: Record<SupportPriority, string> = {
  LOW: 'Basse',
  MEDIUM: 'Moyenne',
  HIGH: 'Haute',
};

export const SUPPORT_PRIORITY_TONES: Record<SupportPriority, Tone> = {
  LOW: 'neutral',
  MEDIUM: 'info',
  HIGH: 'danger',
};

export const SUPPORT_STATUS_LABELS: Record<SupportStatus, string> = {
  OPEN: 'Ouvert',
  PENDING: 'En attente',
  RESOLVED: 'Résolu',
  CLOSED: 'Fermé',
};

export const SUPPORT_STATUS_TONES: Record<SupportStatus, Tone> = {
  OPEN: 'success',
  PENDING: 'warning',
  RESOLVED: 'info',
  CLOSED: 'neutral',
};

export interface SupportTicketInput {
  subject: string;
  category: SupportCategory;
  priority: SupportPriority;
  message: string;
}

export type SupportTicketField = keyof SupportTicketInput;

export function validateSupportTicket(input: SupportTicketInput): ValidationResult<SupportTicketField> {
  const errors: Partial<Record<SupportTicketField, string>> = {};
  if (isBlank(input.subject)) errors.subject = 'Le sujet est obligatoire.';
  else if (input.subject.trim().length > 140) errors.subject = '140 caractères maximum.';
  if (isBlank(input.message)) errors.message = 'Décrivez votre demande.';
  else if (input.message.length > 5000) errors.message = '5000 caractères maximum.';
  return toResult(errors);
}

export function validateSupportMessage(body: string): string | null {
  if (isBlank(body)) return 'Le message est vide.';
  if (body.length > 5000) return '5000 caractères maximum.';
  return null;
}
