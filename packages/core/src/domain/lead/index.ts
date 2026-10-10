import type { Tone, ValidationResult } from '../common/validation';
import { isBlank, toResult } from '../common/validation';

// Landing-page requests (free estimates, quote requests, contact messages)
// and the reply helpers staff use to answer them by e-mail or WhatsApp.

export type LeadKind = 'QUOTE' | 'CONTACT';
export type LeadStatus = 'NEW' | 'IN_PROGRESS' | 'QUOTED' | 'CLOSED';
export type LeadTab = 'ESTIMATES' | 'QUOTES' | 'MESSAGES' | 'ARCHIVE';

export const LEAD_STATUSES: readonly LeadStatus[] = ['NEW', 'IN_PROGRESS', 'QUOTED', 'CLOSED'];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: 'Nouvelle',
  IN_PROGRESS: 'En cours',
  QUOTED: 'Devis envoyé',
  CLOSED: 'Clôturée',
};

export const LEAD_STATUS_TONES: Record<LeadStatus, Tone> = {
  NEW: 'gold',
  IN_PROGRESS: 'info',
  QUOTED: 'success',
  CLOSED: 'neutral',
};

export const LEAD_KIND_LABELS: Record<LeadKind, string> = {
  QUOTE: 'Estimation',
  CONTACT: 'Message',
};

export const LEAD_TABS: readonly LeadTab[] = ['ESTIMATES', 'QUOTES', 'MESSAGES', 'ARCHIVE'];

export const LEAD_TAB_LABELS: Record<LeadTab, string> = {
  ESTIMATES: 'Estimations',
  QUOTES: 'Devis',
  MESSAGES: 'Messages',
  ARCHIVE: 'Archives',
};

/** Which tab a request belongs to: closed requests go to the archive whatever their kind. */
export function leadTab(lead: { kind: LeadKind; status: LeadStatus }): LeadTab {
  if (lead.status === 'CLOSED') return 'ARCHIVE';
  if (lead.kind === 'CONTACT') return 'MESSAGES';
  return lead.status === 'QUOTED' ? 'QUOTES' : 'ESTIMATES';
}

export function countLeadsByTab(leads: readonly { kind: LeadKind; status: LeadStatus }[]): Record<LeadTab, number> {
  const counts: Record<LeadTab, number> = { ESTIMATES: 0, QUOTES: 0, MESSAGES: 0, ARCHIVE: 0 };
  for (const lead of leads) counts[leadTab(lead)] += 1;
  return counts;
}

// --- Reply channels --------------------------------------------------------

/**
 * Digits-only international number for wa.me links, or null when it cannot be one.
 * National numbers starting with 0 are read as Moroccan (+212) by default.
 */
export function normalizeWhatsappNumber(phone: string | null | undefined, defaultCountryCode = '212'): string | null {
  if (!phone) return null;
  const trimmed = phone.trim();
  let digits = trimmed.replace(/\D/g, '');
  if (digits === '') return null;
  if (trimmed.startsWith('+')) {
    // already international
  } else if (digits.startsWith('00')) {
    digits = digits.slice(2);
  } else if (digits.startsWith('0')) {
    digits = defaultCountryCode + digits.slice(1);
  }
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

export function buildWhatsappUrl(phone: string | null | undefined, text: string): string | null {
  const number = normalizeWhatsappNumber(phone);
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(text)}` : null;
}

export function buildMailtoUrl(email: string, subject: string, body: string): string {
  return `mailto:${email.trim()}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// --- Reply templates -------------------------------------------------------

export const REPLY_TEMPLATE_VARIABLES = [
  { key: 'prenom', label: 'Prénom du contact' },
  { key: 'nom_complet', label: 'Nom complet du contact' },
  { key: 'zone', label: 'Zone du bien' },
  { key: 'adresse', label: 'Adresse ou quartier' },
  { key: 'configuration', label: 'Configuration du bien' },
  { key: 'estimation', label: 'Fourchette affichée au visiteur' },
  { key: 'equipe', label: 'Signature (DarnaLux)' },
] as const;

export interface LeadForTemplate {
  full_name: string;
  zone_label: string | null;
  address: string | null;
  config_label: string | null;
  estimate_low: number | null;
  estimate_high: number | null;
}

const MAD = new Intl.NumberFormat('fr-FR');

export function leadTemplateValues(lead: LeadForTemplate): Record<string, string> {
  const fullName = lead.full_name.trim();
  const estimate =
    lead.estimate_low !== null && lead.estimate_high !== null
      ? `${MAD.format(lead.estimate_low)} – ${MAD.format(lead.estimate_high)} MAD par mois (estimation indicative)`
      : '';
  return {
    prenom: fullName.split(/\s+/)[0] ?? '',
    nom_complet: fullName,
    zone: lead.zone_label ?? '',
    adresse: lead.address ?? '',
    configuration: lead.config_label ?? '',
    estimation: estimate,
    equipe: "L'équipe DarnaLux",
  };
}

/** Replaces {{key}} placeholders. Unknown keys are left visible so staff notice them. */
export function fillTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (match, key: string) => (key in values ? values[key] : match));
}

export interface ReplyTemplateInput {
  name: string;
  subject: string;
  body: string;
  applies_to: 'ALL' | LeadKind;
}

export type ReplyTemplateField = keyof ReplyTemplateInput;

export function validateReplyTemplate(input: ReplyTemplateInput): ValidationResult<ReplyTemplateField> {
  const errors: Partial<Record<ReplyTemplateField, string>> = {};
  if (isBlank(input.name)) errors.name = 'Donnez un nom au modèle.';
  else if (input.name.length > 80) errors.name = '80 caractères maximum.';
  if (input.subject.length > 160) errors.subject = '160 caractères maximum.';
  if (isBlank(input.body)) errors.body = 'Le texte du modèle est requis.';
  else if (input.body.length > 4000) errors.body = '4000 caractères maximum.';
  return toResult(errors);
}
