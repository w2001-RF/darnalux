import type { CheckinSettings, CheckinStatus, CheckoutCondition, IdentityDocumentType, PropertyType } from '@darnalux/core';
import { supabase } from '../../lib/supabaseClient';
import { unwrap } from '../../lib/errors';

export interface CheckinRow {
  id: string;
  reservation_id: string;
  token: string;
  status: CheckinStatus;
  expires_at: string;
  guest_full_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  nationality: string | null;
  document_type: IdentityDocumentType | null;
  document_number: string | null;
  document_path: string | null;
  selfie_path: string | null;
  signature_path: string | null;
  consent_given_at: string | null;
  contract_snapshot: string | null;
  signed_at: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
}

export type CheckinQueueRow = CheckinRow & {
  reservations: { id: string; reference: string; check_in: string; check_out: string; properties: { name: string } | null } | null;
};

export async function getCheckinForReservation(reservationId: string): Promise<CheckinRow | null> {
  return unwrap(await supabase.from('checkins').select('*').eq('reservation_id', reservationId).maybeSingle<CheckinRow>());
}

export async function listCheckinsByStatus(statuses: CheckinStatus[]): Promise<CheckinQueueRow[]> {
  return (
    unwrap(
      await supabase
        .from('checkins')
        .select('*, reservations(id, reference, check_in, check_out, properties(name))')
        .in('status', statuses)
        .order('submitted_at', { ascending: true, nullsFirst: false })
        .limit(100)
        .returns<CheckinQueueRow[]>(),
    ) ?? []
  );
}

export async function reviewCheckin(id: string, status: 'VERIFIED' | 'REJECTED', notes: string): Promise<void> {
  unwrap(await supabase.from('checkins').update({ status, review_notes: notes.trim() || null }).eq('id', id));
}

export async function extendCheckinLink(id: string, days: number): Promise<void> {
  const expiresAt = new Date(Date.now() + days * 86_400_000).toISOString();
  unwrap(await supabase.from('checkins').update({ expires_at: expiresAt }).eq('id', id));
}

// `href` comes from react-router's useHref so the link keeps the deployment base path.
export function absoluteUrl(href: string): string {
  return new URL(href, window.location.origin).toString();
}

// ---- Check-out ------------------------------------------------------------------

export interface CheckoutRow {
  id: string;
  reservation_id: string;
  condition: CheckoutCondition;
  incident_reported: boolean;
  notes: string | null;
  photo_paths: string[];
  completed_at: string;
}

export async function getCheckout(reservationId: string): Promise<CheckoutRow | null> {
  return unwrap(await supabase.from('checkouts').select('*').eq('reservation_id', reservationId).maybeSingle<CheckoutRow>());
}

export async function saveCheckout(row: Omit<CheckoutRow, 'id' | 'completed_at'>): Promise<void> {
  unwrap(await supabase.from('checkouts').upsert(row, { onConflict: 'reservation_id' }));
}

// ---- Settings ---------------------------------------------------------------------

interface SettingsRow {
  document_step: boolean;
  selfie_step: boolean;
  contract_step: boolean;
  document_number_required: boolean;
  welcome_message: string | null;
}

export async function getCheckinSettings(): Promise<CheckinSettings> {
  const row = unwrap(await supabase.from('checkin_settings').select('*').eq('singleton', true).single<SettingsRow>());
  return {
    documentStep: row.document_step,
    selfieStep: row.selfie_step,
    contractStep: row.contract_step,
    documentNumberRequired: row.document_number_required,
    welcomeMessage: row.welcome_message ?? '',
  };
}

export async function saveCheckinSettings(settings: CheckinSettings): Promise<void> {
  unwrap(
    await supabase
      .from('checkin_settings')
      .update({
        document_step: settings.documentStep,
        selfie_step: settings.selfieStep,
        contract_step: settings.contractStep,
        document_number_required: settings.documentNumberRequired,
        welcome_message: settings.welcomeMessage.trim() || null,
      })
      .eq('singleton', true),
  );
}

// ---- Public guest flow (anon; token is the credential) ------------------------------

export interface PublicCheckin {
  status: CheckinStatus;
  reviewNotes: string | null;
  reservation: { reference: string; checkIn: string; checkOut: string; guestsCount: number };
  property: { name: string; address: string | null; city: string; type: PropertyType; houseRules: string | null };
  guestName: string | null;
  settings: CheckinSettings;
  contractTemplate: string | null;
  smartLockCode: string | null;
}

export async function getPublicCheckin(token: string): Promise<PublicCheckin | null> {
  const { data, error } = await supabase.rpc('checkin_get', { p_token: token });
  if (error) throw error;
  return (data as PublicCheckin | null) ?? null;
}

export async function startPublicCheckin(token: string): Promise<void> {
  unwrap(await supabase.rpc('checkin_start', { p_token: token }));
}

export interface CheckinSubmission {
  fullName: string;
  email: string;
  phone: string;
  nationality: string;
  documentType: IdentityDocumentType | '';
  documentNumber: string;
  documentPath: string | null;
  selfiePath: string | null;
  signaturePath: string | null;
  contractSnapshot: string | null;
  consent: boolean;
  userAgent: string;
}

export async function submitPublicCheckin(token: string, payload: CheckinSubmission): Promise<void> {
  unwrap(await supabase.rpc('checkin_submit', { p_token: token, p_payload: payload }));
}

export async function uploadGuestFile(token: string, kind: 'document' | 'selfie' | 'signature', file: Blob, extension: string): Promise<string> {
  const path = `${token}/${kind}-${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from('guest-documents').upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  return path;
}
