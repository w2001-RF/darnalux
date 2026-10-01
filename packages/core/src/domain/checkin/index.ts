import type { Tone, ValidationResult } from '../common/validation';
import { isBlank, isEmail, isPhone, toResult } from '../common/validation';
import type { IdentityDocumentType } from '../guest';
import { IDENTITY_DOCUMENT_TYPES } from '../guest';

export type CheckinStatus = 'PENDING' | 'IN_PROGRESS' | 'SUBMITTED' | 'VERIFIED' | 'REJECTED';

export const CHECKIN_STATUS_LABELS: Record<CheckinStatus, string> = {
  PENDING: 'Lien envoyé',
  IN_PROGRESS: 'En cours',
  SUBMITTED: 'À vérifier',
  VERIFIED: 'Vérifié',
  REJECTED: 'Refusé',
};

export const CHECKIN_STATUS_TONES: Record<CheckinStatus, Tone> = {
  PENDING: 'neutral',
  IN_PROGRESS: 'info',
  SUBMITTED: 'warning',
  VERIFIED: 'success',
  REJECTED: 'danger',
};

export interface CheckinSettings {
  documentStep: boolean;
  selfieStep: boolean;
  contractStep: boolean;
  documentNumberRequired: boolean;
  welcomeMessage: string;
}

export const DEFAULT_CHECKIN_SETTINGS: CheckinSettings = {
  documentStep: true,
  selfieStep: true,
  contractStep: true,
  documentNumberRequired: false,
  welcomeMessage: '',
};

export type CheckinStep = 'INFO' | 'DOCUMENT' | 'SELFIE' | 'CONTRACT' | 'DONE';

export const CHECKIN_STEP_LABELS: Record<CheckinStep, string> = {
  INFO: 'Informations',
  DOCUMENT: "Pièce d'identité",
  SELFIE: 'Selfie',
  CONTRACT: 'Contrat',
  DONE: 'Terminé',
};

export function checkinSteps(settings: CheckinSettings): CheckinStep[] {
  const steps: CheckinStep[] = ['INFO'];
  if (settings.documentStep) steps.push('DOCUMENT');
  if (settings.selfieStep) steps.push('SELFIE');
  if (settings.contractStep) steps.push('CONTRACT');
  steps.push('DONE');
  return steps;
}

export interface CheckinImpact {
  steps: number;
  estimatedMinutes: string;
  securityLevel: 'Faible' | 'Moyen' | 'Élevé';
}

// Summary shown next to the verification settings (time and security trade-off).
export function checkinImpact(settings: CheckinSettings): CheckinImpact {
  const enabled = [settings.documentStep, settings.selfieStep, settings.contractStep].filter(Boolean).length;
  const minutes = 1 + (settings.documentStep ? 1 : 0) + (settings.selfieStep ? 1 : 0) + (settings.contractStep ? 1 : 0);
  const securityLevel = settings.documentStep && settings.selfieStep ? 'Élevé' : settings.documentStep ? 'Moyen' : 'Faible';
  return { steps: enabled, estimatedMinutes: `${minutes}-${minutes + 1} min`, securityLevel };
}

export function isCheckinLinkUsable(status: CheckinStatus, expiresAt: string, now: Date): boolean {
  if (status === 'VERIFIED') return false;
  return new Date(expiresAt).getTime() > now.getTime();
}

export interface GuestCheckinInfo {
  fullName: string;
  email: string;
  phone: string;
  nationality: string;
  documentType: IdentityDocumentType | '';
  documentNumber: string;
}

export type GuestCheckinField = keyof GuestCheckinInfo;

export function validateGuestCheckinInfo(
  info: GuestCheckinInfo,
  settings: CheckinSettings,
): ValidationResult<GuestCheckinField> {
  const errors: Partial<Record<GuestCheckinField, string>> = {};
  if (isBlank(info.fullName) || info.fullName.trim().split(/\s+/).length < 2) {
    errors.fullName = 'Indiquez votre prénom et votre nom, comme sur votre pièce.';
  }
  if (!isBlank(info.email) && !isEmail(info.email)) errors.email = 'Adresse email invalide.';
  if (!isBlank(info.phone) && !isPhone(info.phone)) errors.phone = 'Numéro de téléphone invalide.';
  if (settings.documentStep && !IDENTITY_DOCUMENT_TYPES.includes(info.documentType as IdentityDocumentType)) {
    errors.documentType = 'Choisissez le type de document.';
  }
  if (settings.documentNumberRequired && isBlank(info.documentNumber)) {
    errors.documentNumber = 'Le numéro du document est obligatoire.';
  }
  return toResult(errors);
}

// ---- Contracts -------------------------------------------------------------

export const CONTRACT_PLACEHOLDERS = {
  guest_full_name: 'Nom du voyageur',
  guest_document_number: 'Numéro de pièce du voyageur',
  property_name: 'Nom du bien',
  property_address: 'Adresse du bien',
  property_city: 'Ville du bien',
  check_in: "Date d'arrivée",
  check_out: 'Date de départ',
  nights: 'Nombre de nuits',
  guests_count: 'Nombre de voyageurs',
  reservation_reference: 'Référence de réservation',
  today: 'Date du jour',
  company_name: 'Société gestionnaire',
} as const;

export type ContractPlaceholder = keyof typeof CONTRACT_PLACEHOLDERS;
export type ContractValues = Partial<Record<ContractPlaceholder, string | number | null>>;

export function renderContract(template: string, values: ContractValues): string {
  return template.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (match, key: string) => {
    if (!(key in CONTRACT_PLACEHOLDERS)) return match;
    const value = values[key as ContractPlaceholder];
    return value === null || value === undefined || value === '' ? '—' : String(value);
  });
}

export function unknownPlaceholders(template: string): string[] {
  const found = new Set<string>();
  for (const match of template.matchAll(/\{\{\s*([a-z_]+)\s*\}\}/g)) {
    if (!(match[1] in CONTRACT_PLACEHOLDERS)) found.add(match[1]);
  }
  return [...found];
}

export const DEFAULT_CONTRACT_TEMPLATE = `CONTRAT DE LOCATION SAISONNIÈRE

Référence : {{reservation_reference}}

1. Parties
Le présent contrat est conclu entre {{company_name}}, agissant pour le compte du propriétaire du logement, et {{guest_full_name}} (pièce n° {{guest_document_number}}), ci-après « le Locataire ».

2. Logement
{{property_name}}, {{property_address}}, {{property_city}}.

3. Durée du séjour
Du {{check_in}} au {{check_out}} ({{nights}} nuit(s)), pour {{guests_count}} voyageur(s) au maximum.

4. Obligations du Locataire
Le Locataire s'engage à :
• utiliser le logement paisiblement et le restituer dans l'état où il l'a reçu ;
• respecter le nombre maximal de voyageurs prévu à la réservation ;
• respecter le règlement intérieur du logement et la tranquillité du voisinage ;
• respecter les lois et règlements en vigueur au Maroc ;
• signaler sans délai tout dommage ou dysfonctionnement.

5. Responsabilité
Le Locataire est responsable des dégradations causées pendant le séjour. Le gestionnaire ne peut être tenu responsable des objets personnels perdus ou volés dans le logement.

6. Signature électronique
Le Locataire reconnaît que la signature électronique du présent contrat a la même valeur qu'une signature manuscrite. La date et l'heure de signature ainsi que les informations fournies lors de l'enregistrement sont conservées comme preuve.

Fait le {{today}}.`;

// ---- Check-out -------------------------------------------------------------

export type CheckoutCondition = 'GOOD' | 'MINOR_ISSUES' | 'DAMAGED';

export const CHECKOUT_CONDITIONS: readonly CheckoutCondition[] = ['GOOD', 'MINOR_ISSUES', 'DAMAGED'];

export const CHECKOUT_CONDITION_LABELS: Record<CheckoutCondition, string> = {
  GOOD: 'Bon état',
  MINOR_ISSUES: 'Problèmes mineurs',
  DAMAGED: 'Dommages constatés',
};

export const CHECKOUT_CONDITION_TONES: Record<CheckoutCondition, Tone> = {
  GOOD: 'success',
  MINOR_ISSUES: 'warning',
  DAMAGED: 'danger',
};
