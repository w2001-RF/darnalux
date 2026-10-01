import type { DocumentCategory } from '@darnalux/core';
import { buildStoragePath, sanitizeSearchTerm } from '@darnalux/core';
import { supabase } from '../../lib/supabaseClient';
import { unwrap } from '../../lib/errors';
import { newId, removeFromBucket, uploadToBucket } from '../../lib/files';

export interface DocumentRow {
  id: string;
  category: DocumentCategory;
  title: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  owner_id: string | null;
  property_id: string | null;
  reservation_id: string | null;
  guest_id: string | null;
  visible_to_owner: boolean;
  expires_on: string | null;
  created_at: string;
  owners?: { first_name: string; last_name: string } | null;
  properties?: { name: string } | null;
  reservations?: { reference: string } | null;
}

export interface DocumentFilters {
  category?: string;
  ownerId?: string;
  propertyId?: string;
  reservationId?: string;
  guestId?: string;
  search?: string;
}

const COLUMNS = '*, owners(first_name, last_name), properties(name), reservations(reference)';
const PORTAL_COLUMNS = '*, properties(name)';

export async function listDocuments(filters: DocumentFilters = {}, portal = false): Promise<DocumentRow[]> {
  let query = supabase.from('documents').select(portal ? PORTAL_COLUMNS : COLUMNS).order('created_at', { ascending: false }).limit(300);
  if (filters.category) query = query.eq('category', filters.category);
  if (filters.ownerId) query = query.eq('owner_id', filters.ownerId);
  if (filters.propertyId) query = query.eq('property_id', filters.propertyId);
  if (filters.reservationId) query = query.eq('reservation_id', filters.reservationId);
  if (filters.guestId) query = query.eq('guest_id', filters.guestId);
  const term = sanitizeSearchTerm(filters.search ?? '');
  if (term) query = query.ilike('title', `%${term}%`);
  return unwrap(await query.returns<DocumentRow[]>()) ?? [];
}

export interface DocumentUpload {
  file: File;
  title: string;
  category: DocumentCategory;
  ownerId: string | null;
  propertyId: string | null;
  reservationId: string | null;
  guestId: string | null;
  visibleToOwner: boolean;
  expiresOn: string | null;
}

export async function uploadDocument(input: DocumentUpload): Promise<void> {
  const path = buildStoragePath([input.category.toLowerCase()], input.file.name, newId());
  await uploadToBucket('documents', path, input.file);
  try {
    unwrap(
      await supabase.from('documents').insert({
        category: input.category,
        title: input.title.trim() || input.file.name,
        storage_path: path,
        mime_type: input.file.type || null,
        size_bytes: input.file.size,
        owner_id: input.ownerId,
        property_id: input.propertyId,
        reservation_id: input.reservationId,
        guest_id: input.guestId,
        visible_to_owner: input.visibleToOwner,
        expires_on: input.expiresOn,
      }),
    );
  } catch (error) {
    await removeFromBucket('documents', [path]).catch(() => undefined);
    throw error;
  }
}

export async function deleteDocument(doc: DocumentRow): Promise<void> {
  unwrap(await supabase.from('documents').delete().eq('id', doc.id));
  await removeFromBucket('documents', [doc.storage_path]);
}

export async function setDocumentVisibility(id: string, visible: boolean): Promise<void> {
  unwrap(await supabase.from('documents').update({ visible_to_owner: visible }).eq('id', id));
}
