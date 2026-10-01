import type { GuestInput, GuestVerificationStatus, IdentityDocumentType } from '@darnalux/core';
import { sanitizeSearchTerm } from '@darnalux/core';
import { supabase } from '../../lib/supabaseClient';
import { unwrap } from '../../lib/errors';

export interface GuestRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  nationality: string | null;
  document_type: IdentityDocumentType | null;
  document_number: string | null;
  verification_status: GuestVerificationStatus;
  is_blacklisted: boolean;
  blacklist_reason: string | null;
  blacklisted_at: string | null;
  internal_notes: string | null;
  created_at: string;
}

export type GuestListRow = GuestRow & { reservations: { id: string }[] };

export interface GuestFilters {
  search?: string;
  verification?: string;
  blacklistedOnly?: boolean;
  limit?: number;
}

export async function listGuests(filters: GuestFilters = {}): Promise<GuestListRow[]> {
  let query = supabase
    .from('guests')
    .select('*, reservations(id)')
    .order('created_at', { ascending: false })
    .limit(filters.limit ?? 200);
  if (filters.verification) query = query.eq('verification_status', filters.verification);
  if (filters.blacklistedOnly) query = query.eq('is_blacklisted', true);
  const term = sanitizeSearchTerm(filters.search ?? '');
  if (term) {
    query = query.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`);
  }
  return unwrap(await query.returns<GuestListRow[]>()) ?? [];
}

export async function getGuest(id: string): Promise<GuestRow> {
  return unwrap(await supabase.from('guests').select('*').eq('id', id).single<GuestRow>());
}

function toRow(input: GuestInput) {
  return {
    first_name: input.firstName.trim(),
    last_name: input.lastName.trim(),
    email: input.email.trim() || null,
    phone: input.phone.trim() || null,
    nationality: input.nationality.trim() || null,
    internal_notes: input.internalNotes.trim() || null,
  };
}

export function toGuestInput(row: GuestRow): GuestInput {
  return {
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email ?? '',
    phone: row.phone ?? '',
    nationality: row.nationality ?? '',
    internalNotes: row.internal_notes ?? '',
  };
}

export async function createGuest(input: GuestInput): Promise<string> {
  return unwrap(await supabase.from('guests').insert(toRow(input)).select('id').single<{ id: string }>()).id;
}

export async function updateGuest(id: string, input: GuestInput): Promise<void> {
  unwrap(await supabase.from('guests').update(toRow(input)).eq('id', id));
}

export async function setBlacklist(id: string, blacklisted: boolean, reason: string | null): Promise<void> {
  unwrap(
    await supabase
      .from('guests')
      .update({ is_blacklisted: blacklisted, blacklist_reason: blacklisted ? reason?.trim() : null })
      .eq('id', id),
  );
}
