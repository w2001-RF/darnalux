import type { BookingChannel, PropertyInput, PropertyStatus, PropertyType } from '@darnalux/core';
import { sanitizeSearchTerm } from '@darnalux/core';
import { supabase } from '../../lib/supabaseClient';
import { unwrap } from '../../lib/errors';
import { newId, removeFromBucket, uploadToBucket } from '../../lib/files';
import { buildStoragePath } from '@darnalux/core';

export interface PropertyRow {
  id: string;
  name: string;
  type: PropertyType;
  description: string | null;
  address: string | null;
  city: string;
  latitude: number | null;
  longitude: number | null;
  capacity: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  amenities: string[];
  house_rules: string | null;
  status: PropertyStatus;
  commission_rate: number;
  cover_image_path: string | null;
  created_at: string;
}

export interface PropertyOwnerLink {
  owner_id: string;
  is_primary: boolean;
  share_percent: number;
  owners: { id: string; first_name: string; last_name: string } | null;
}

export type PropertyListRow = PropertyRow & { property_owners: PropertyOwnerLink[] };

export interface PropertyAccessRow {
  property_id: string;
  arrival_procedure: string | null;
  departure_procedure: string | null;
  access_instructions: string | null;
  door_code: string | null;
  key_location: string | null;
  wifi_name: string | null;
  wifi_password: string | null;
  cleaning_procedure: string | null;
  maintenance_procedure: string | null;
}

export interface ListingRow {
  id: string;
  property_id: string;
  platform: BookingChannel;
  external_id: string | null;
  listing_url: string | null;
  is_active: boolean;
}

export interface PropertyImageRow {
  id: string;
  property_id: string;
  storage_path: string;
  caption: string | null;
  position: number;
}

const LIST_COLUMNS =
  'id, name, type, description, address, city, latitude, longitude, capacity, bedrooms, beds, bathrooms, amenities, house_rules, status, commission_rate, cover_image_path, created_at, property_owners(owner_id, is_primary, share_percent, owners(id, first_name, last_name))';

export interface PropertyFilters {
  search?: string;
  type?: string;
  city?: string;
  status?: string;
}

export async function listProperties(filters: PropertyFilters = {}): Promise<PropertyListRow[]> {
  let query = supabase.from('properties').select(LIST_COLUMNS).order('name');
  if (filters.type) query = query.eq('type', filters.type);
  if (filters.city) query = query.eq('city', filters.city);
  if (filters.status) query = query.eq('status', filters.status);
  const term = sanitizeSearchTerm(filters.search ?? '');
  if (term) query = query.or(`name.ilike.%${term}%,city.ilike.%${term}%,address.ilike.%${term}%`);
  return unwrap(await query.returns<PropertyListRow[]>()) ?? [];
}

export async function listPropertyOptions(): Promise<Pick<PropertyRow, 'id' | 'name' | 'city' | 'capacity' | 'commission_rate' | 'status'>[]> {
  return (
    unwrap(
      await supabase
        .from('properties')
        .select('id, name, city, capacity, commission_rate, status')
        .neq('status', 'ARCHIVED')
        .order('name')
        .returns<Pick<PropertyRow, 'id' | 'name' | 'city' | 'capacity' | 'commission_rate' | 'status'>[]>(),
    ) ?? []
  );
}

export async function getProperty(id: string): Promise<PropertyListRow> {
  return unwrap(await supabase.from('properties').select(LIST_COLUMNS).eq('id', id).single<PropertyListRow>());
}

function toRow(input: PropertyInput) {
  return {
    name: input.name.trim(),
    type: input.type,
    description: input.description.trim() || null,
    address: input.address.trim() || null,
    city: input.city.trim(),
    latitude: input.latitude,
    longitude: input.longitude,
    capacity: input.capacity,
    bedrooms: input.bedrooms,
    beds: input.beds,
    bathrooms: input.bathrooms,
    amenities: input.amenities,
    house_rules: input.houseRules.trim() || null,
    status: input.status,
    commission_rate: input.commissionRate,
  };
}

export function toPropertyInput(row: PropertyRow): PropertyInput {
  return {
    name: row.name,
    type: row.type,
    description: row.description ?? '',
    address: row.address ?? '',
    city: row.city,
    latitude: row.latitude === null ? null : Number(row.latitude),
    longitude: row.longitude === null ? null : Number(row.longitude),
    capacity: row.capacity,
    bedrooms: row.bedrooms,
    beds: row.beds,
    bathrooms: row.bathrooms,
    amenities: row.amenities ?? [],
    houseRules: row.house_rules ?? '',
    status: row.status,
    commissionRate: Number(row.commission_rate),
  };
}

export async function createProperty(input: PropertyInput, primaryOwnerId: string | null): Promise<string> {
  const created = unwrap(await supabase.from('properties').insert(toRow(input)).select('id').single<{ id: string }>());
  if (primaryOwnerId) {
    unwrap(await supabase.from('property_owners').insert({ property_id: created.id, owner_id: primaryOwnerId, is_primary: true }));
  }
  return created.id;
}

export async function updateProperty(id: string, input: PropertyInput): Promise<void> {
  unwrap(await supabase.from('properties').update(toRow(input)).eq('id', id));
}

export async function listCities(): Promise<string[]> {
  const rows = unwrap(await supabase.from('properties').select('city').returns<{ city: string }[]>()) ?? [];
  return [...new Set(rows.map((r) => r.city))].sort((a, b) => a.localeCompare(b, 'fr'));
}

// ---- Owners of a property ---------------------------------------------------

export async function linkOwner(propertyId: string, ownerId: string, isPrimary: boolean, sharePercent: number): Promise<void> {
  if (isPrimary) {
    unwrap(await supabase.from('property_owners').update({ is_primary: false }).eq('property_id', propertyId).eq('is_primary', true));
  }
  unwrap(
    await supabase
      .from('property_owners')
      .upsert({ property_id: propertyId, owner_id: ownerId, is_primary: isPrimary, share_percent: sharePercent }),
  );
}

export async function unlinkOwner(propertyId: string, ownerId: string): Promise<void> {
  unwrap(await supabase.from('property_owners').delete().eq('property_id', propertyId).eq('owner_id', ownerId));
}

// ---- Sensitive access information --------------------------------------------

export async function getPropertyAccess(propertyId: string): Promise<PropertyAccessRow | null> {
  return unwrap(
    await supabase.from('property_access').select('*').eq('property_id', propertyId).maybeSingle<PropertyAccessRow>(),
  );
}

export async function savePropertyAccess(row: PropertyAccessRow): Promise<void> {
  unwrap(await supabase.from('property_access').upsert(row));
}

// ---- Listings / channels ------------------------------------------------------

export async function listListings(propertyId: string): Promise<ListingRow[]> {
  return (
    unwrap(
      await supabase.from('property_listings').select('*').eq('property_id', propertyId).order('created_at').returns<ListingRow[]>(),
    ) ?? []
  );
}

export async function addListing(row: Omit<ListingRow, 'id'>): Promise<void> {
  unwrap(await supabase.from('property_listings').insert(row));
}

export async function toggleListing(id: string, isActive: boolean): Promise<void> {
  unwrap(await supabase.from('property_listings').update({ is_active: isActive }).eq('id', id));
}

export async function deleteListing(id: string): Promise<void> {
  unwrap(await supabase.from('property_listings').delete().eq('id', id));
}

// ---- Photos (private bucket "property-images", path "<propertyId>/<file>") ----

export async function listImages(propertyId: string): Promise<PropertyImageRow[]> {
  return (
    unwrap(
      await supabase.from('property_images').select('*').eq('property_id', propertyId).order('position').returns<PropertyImageRow[]>(),
    ) ?? []
  );
}

export async function uploadImage(propertyId: string, file: File, position: number): Promise<void> {
  const path = buildStoragePath([propertyId], file.name, newId());
  await uploadToBucket('property-images', path, file);
  try {
    unwrap(await supabase.from('property_images').insert({ property_id: propertyId, storage_path: path, position }));
  } catch (error) {
    await removeFromBucket('property-images', [path]).catch(() => undefined);
    throw error;
  }
}

export async function setCoverImage(propertyId: string, path: string | null): Promise<void> {
  unwrap(await supabase.from('properties').update({ cover_image_path: path }).eq('id', propertyId));
}

export async function deleteImage(image: PropertyImageRow): Promise<void> {
  unwrap(await supabase.from('property_images').delete().eq('id', image.id));
  await removeFromBucket('property-images', [image.storage_path]);
}
