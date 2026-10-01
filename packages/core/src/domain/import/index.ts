import { isISODate } from '../common/dates';
import type { OwnerInput, OwnerStatus } from '../owner';
import { OWNER_STATUSES, emptyOwnerInput, validateOwnerInput } from '../owner';
import type { BookingChannel, PropertyInput, PropertyStatus, PropertyType } from '../property';
import {
  BOOKING_CHANNELS,
  PROPERTY_STATUSES,
  PROPERTY_TYPES,
  PROPERTY_TYPE_LABELS,
  emptyPropertyInput,
  validatePropertyInput,
} from '../property';
import type { ReservationStatus } from '../reservation';
import { RESERVATION_STATUSES } from '../reservation';

export * from './csv';

export type ImportEntity = 'owners' | 'properties' | 'reservations';

export interface ImportIssue {
  line: number;
  message: string;
}

export interface ImportResult<T> {
  rows: { line: number; value: T }[];
  issues: ImportIssue[];
}

export const IMPORT_TEMPLATES: Record<ImportEntity, string[]> = {
  owners: ['prenom', 'nom', 'email', 'telephone', 'adresse', 'ville', 'statut', 'notes'],
  properties: ['nom', 'type', 'ville', 'adresse', 'capacite', 'chambres', 'lits', 'salles_de_bain', 'commission', 'statut', 'description'],
  reservations: ['bien', 'voyageur_prenom', 'voyageur_nom', 'voyageur_email', 'voyageur_telephone', 'arrivee', 'depart', 'voyageurs', 'montant', 'source', 'statut', 'reference_externe'],
};

function pick(record: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== '') return value;
  }
  return '';
}

function toNumber(value: string, fallback: number): number {
  if (value.trim() === '') return fallback;
  const parsed = Number(value.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function firstError(errors: Record<string, string | undefined>): string {
  return Object.values(errors).filter(Boolean).join(' ');
}

// Accepts either the code (VILLA) or the French label (Villa).
function matchEnum<T extends string>(value: string, allowed: readonly T[], labels?: Record<T, string>): T | null {
  const normalized = value.trim().toUpperCase();
  const direct = allowed.find((item) => item === normalized);
  if (direct) return direct;
  if (labels) {
    const byLabel = allowed.find((item) => labels[item].toUpperCase() === normalized);
    if (byLabel) return byLabel;
  }
  return null;
}

export function mapOwnerRecords(records: Record<string, string>[]): ImportResult<OwnerInput> {
  const result: ImportResult<OwnerInput> = { rows: [], issues: [] };
  records.forEach((record, index) => {
    const line = index + 2;
    const statusRaw = pick(record, 'statut', 'status');
    const status = statusRaw ? matchEnum<OwnerStatus>(statusRaw, OWNER_STATUSES) : 'ACTIVE';
    const value: OwnerInput = {
      ...emptyOwnerInput(),
      firstName: pick(record, 'prenom', 'first_name', 'firstname'),
      lastName: pick(record, 'nom', 'last_name', 'lastname'),
      email: pick(record, 'email', 'e_mail'),
      phone: pick(record, 'telephone', 'phone', 'tel'),
      address: pick(record, 'adresse', 'address'),
      city: pick(record, 'ville', 'city'),
      status: status ?? 'ACTIVE',
      internalNotes: pick(record, 'notes', 'note'),
    };
    const validation = validateOwnerInput(value);
    if (!status) result.issues.push({ line, message: `Statut inconnu « ${statusRaw} ».` });
    else if (!validation.valid) result.issues.push({ line, message: firstError(validation.errors) });
    else result.rows.push({ line, value });
  });
  return result;
}

export function mapPropertyRecords(records: Record<string, string>[]): ImportResult<PropertyInput> {
  const result: ImportResult<PropertyInput> = { rows: [], issues: [] };
  records.forEach((record, index) => {
    const line = index + 2;
    const base = emptyPropertyInput();
    const typeRaw = pick(record, 'type');
    const statusRaw = pick(record, 'statut', 'status');
    const type = typeRaw ? matchEnum<PropertyType>(typeRaw, PROPERTY_TYPES, PROPERTY_TYPE_LABELS) : base.type;
    const status = statusRaw ? matchEnum<PropertyStatus>(statusRaw, PROPERTY_STATUSES) : base.status;
    if (!type) {
      result.issues.push({ line, message: `Type de bien inconnu « ${typeRaw} ».` });
      return;
    }
    if (!status) {
      result.issues.push({ line, message: `Statut inconnu « ${statusRaw} ».` });
      return;
    }
    const value: PropertyInput = {
      ...base,
      name: pick(record, 'nom', 'name'),
      type,
      city: pick(record, 'ville', 'city'),
      address: pick(record, 'adresse', 'address'),
      description: pick(record, 'description'),
      capacity: toNumber(pick(record, 'capacite', 'capacity'), base.capacity),
      bedrooms: toNumber(pick(record, 'chambres', 'bedrooms'), base.bedrooms),
      beds: toNumber(pick(record, 'lits', 'beds'), base.beds),
      bathrooms: toNumber(pick(record, 'salles_de_bain', 'bathrooms'), base.bathrooms),
      commissionRate: toNumber(pick(record, 'commission', 'commission_rate'), base.commissionRate),
      status,
    };
    const validation = validatePropertyInput(value);
    if (!validation.valid) result.issues.push({ line, message: firstError(validation.errors) });
    else result.rows.push({ line, value });
  });
  return result;
}

export interface ReservationImportRow {
  propertyName: string;
  guestFirstName: string;
  guestLastName: string;
  guestEmail: string;
  guestPhone: string;
  checkIn: string;
  checkOut: string;
  guestsCount: number;
  grossAmount: number;
  source: BookingChannel;
  status: ReservationStatus;
  externalReference: string;
}

// Accepts ISO dates (2026-04-11) and French dates (11/04/2026).
export function parseImportDate(value: string): string | null {
  const trimmed = value.trim();
  if (isISODate(trimmed)) return trimmed;
  const match = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(trimmed);
  if (!match) return null;
  const iso = `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  return isISODate(iso) ? iso : null;
}

export function mapReservationRecords(records: Record<string, string>[]): ImportResult<ReservationImportRow> {
  const result: ImportResult<ReservationImportRow> = { rows: [], issues: [] };
  records.forEach((record, index) => {
    const line = index + 2;
    const checkIn = parseImportDate(pick(record, 'arrivee', 'check_in'));
    const checkOut = parseImportDate(pick(record, 'depart', 'check_out'));
    const sourceRaw = pick(record, 'source', 'canal');
    const statusRaw = pick(record, 'statut', 'status');
    const source = sourceRaw ? matchEnum<BookingChannel>(sourceRaw, BOOKING_CHANNELS) : 'DIRECT';
    const status = statusRaw ? matchEnum<ReservationStatus>(statusRaw, RESERVATION_STATUSES) : 'CONFIRMED';
    const guestsCount = toNumber(pick(record, 'voyageurs', 'guests'), 1);
    const grossAmount = toNumber(pick(record, 'montant', 'amount', 'gross_amount'), 0);
    const propertyName = pick(record, 'bien', 'property', 'logement');
    const guestFirstName = pick(record, 'voyageur_prenom', 'guest_first_name');
    const guestLastName = pick(record, 'voyageur_nom', 'guest_last_name');

    const problems: string[] = [];
    if (!propertyName) problems.push('Bien manquant.');
    if (!guestFirstName || !guestLastName) problems.push('Prénom et nom du voyageur obligatoires.');
    if (!checkIn || !checkOut) problems.push('Dates invalides (AAAA-MM-JJ ou JJ/MM/AAAA).');
    else if (checkOut <= checkIn) problems.push("Le départ doit être après l'arrivée.");
    if (!source) problems.push(`Source inconnue « ${sourceRaw} ».`);
    if (!status) problems.push(`Statut inconnu « ${statusRaw} ».`);
    if (!Number.isInteger(guestsCount) || guestsCount < 1) problems.push('Nombre de voyageurs invalide.');
    if (!Number.isFinite(grossAmount) || grossAmount < 0) problems.push('Montant invalide.');

    if (problems.length > 0 || !checkIn || !checkOut || !source || !status) {
      result.issues.push({ line, message: problems.join(' ') });
      return;
    }
    result.rows.push({
      line,
      value: {
        propertyName,
        guestFirstName,
        guestLastName,
        guestEmail: pick(record, 'voyageur_email', 'guest_email'),
        guestPhone: pick(record, 'voyageur_telephone', 'guest_phone'),
        checkIn,
        checkOut,
        guestsCount,
        grossAmount,
        source,
        status,
        externalReference: pick(record, 'reference_externe', 'external_reference', 'reference'),
      },
    });
  });
  return result;
}
