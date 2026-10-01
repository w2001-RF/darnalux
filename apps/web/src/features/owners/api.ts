import type { OwnerInput, OwnerStatus } from '@darnalux/core';
import { sanitizeSearchTerm } from '@darnalux/core';
import { supabase } from '../../lib/supabaseClient';
import { unwrap } from '../../lib/errors';

export interface OwnerRow {
  id: string;
  profile_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  status: OwnerStatus;
  internal_notes: string | null;
  created_at: string;
}

export interface OwnerPropertyLink {
  property_id: string;
  is_primary: boolean;
  share_percent: number;
  properties: { id: string; name: string; city: string; status: string; commission_rate: number } | null;
}

export type OwnerWithProperties = OwnerRow & { property_owners: OwnerPropertyLink[] };

const COLUMNS =
  'id, profile_id, first_name, last_name, email, phone, address, city, status, internal_notes, created_at, property_owners(property_id, is_primary, share_percent, properties(id, name, city, status, commission_rate))';

export async function listOwners(search = '', status = ''): Promise<OwnerWithProperties[]> {
  let query = supabase.from('owners').select(COLUMNS).order('last_name');
  if (status) query = query.eq('status', status);
  const term = sanitizeSearchTerm(search);
  if (term) {
    query = query.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%,city.ilike.%${term}%`);
  }
  return unwrap(await query.returns<OwnerWithProperties[]>()) ?? [];
}

export async function listOwnerOptions(): Promise<Pick<OwnerRow, 'id' | 'first_name' | 'last_name'>[]> {
  return (
    unwrap(
      await supabase
        .from('owners')
        .select('id, first_name, last_name')
        .neq('status', 'ARCHIVED')
        .order('last_name')
        .returns<Pick<OwnerRow, 'id' | 'first_name' | 'last_name'>[]>(),
    ) ?? []
  );
}

export async function getOwner(id: string): Promise<OwnerWithProperties> {
  return unwrap(await supabase.from('owners').select(COLUMNS).eq('id', id).single<OwnerWithProperties>());
}

function toRow(input: OwnerInput) {
  return {
    first_name: input.firstName.trim(),
    last_name: input.lastName.trim(),
    email: input.email.trim() || null,
    phone: input.phone.trim() || null,
    address: input.address.trim() || null,
    city: input.city.trim() || null,
    status: input.status,
    internal_notes: input.internalNotes.trim() || null,
  };
}

export function toOwnerInput(row: OwnerRow): OwnerInput {
  return {
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email ?? '',
    phone: row.phone ?? '',
    address: row.address ?? '',
    city: row.city ?? '',
    status: row.status,
    internalNotes: row.internal_notes ?? '',
  };
}

export async function createOwner(input: OwnerInput): Promise<string> {
  return unwrap(await supabase.from('owners').insert(toRow(input)).select('id').single<{ id: string }>()).id;
}

export async function updateOwner(id: string, input: OwnerInput): Promise<void> {
  unwrap(await supabase.from('owners').update(toRow(input)).eq('id', id));
}

export async function linkOwnerAccount(ownerId: string, profileId: string | null): Promise<void> {
  unwrap(await supabase.from('owners').update({ profile_id: profileId }).eq('id', ownerId));
}

export interface ProfileOption {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

// Requires users.view (administrators); used to link an owner to a portal account.
export async function listProfileOptions(): Promise<ProfileOption[]> {
  return (
    unwrap(
      await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('is_active', true)
        .order('last_name')
        .returns<ProfileOption[]>(),
    ) ?? []
  );
}
