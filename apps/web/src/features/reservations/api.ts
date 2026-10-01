import type { BookingChannel, CheckinStatus, ReservationInput, ReservationStatus, TaskDraft } from '@darnalux/core';
import { sanitizeSearchTerm } from '@darnalux/core';
import { supabase } from '../../lib/supabaseClient';
import { unwrap } from '../../lib/errors';
import { localDateTimeToIso } from '../../lib/format';

export interface ReservationRow {
  id: string;
  reference: string;
  property_id: string;
  guest_id: string | null;
  source: BookingChannel;
  external_reference: string | null;
  check_in: string;
  check_out: string;
  guests_count: number;
  status: ReservationStatus;
  gross_amount: number;
  commission_rate: number;
  platform_fees: number;
  currency: string;
  smart_lock_code: string | null;
  notes: string | null;
  created_at: string;
}

export type ReservationListRow = ReservationRow & {
  properties: { id: string; name: string; city: string } | null;
  guests: { id: string; first_name: string; last_name: string; is_blacklisted: boolean } | null;
  checkins: { status: CheckinStatus } | null;
};

const LIST_COLUMNS =
  'id, reference, property_id, guest_id, source, external_reference, check_in, check_out, guests_count, status, gross_amount, commission_rate, platform_fees, currency, smart_lock_code, notes, created_at, properties(id, name, city), guests(id, first_name, last_name, is_blacklisted), checkins(status)';

// Owners cannot read guests/checkins (RLS); the embeds then come back null.
const OWNER_COLUMNS =
  'id, reference, property_id, guest_id, source, external_reference, check_in, check_out, guests_count, status, gross_amount, commission_rate, platform_fees, currency, smart_lock_code, notes, created_at, properties(id, name, city)';

export interface ReservationFilters {
  from?: string;
  to?: string;
  propertyId?: string;
  status?: string;
  source?: string;
  checkinStatus?: string;
  guestId?: string;
  search?: string;
  limit?: number;
}

function normalize(rows: ReservationListRow[]): ReservationListRow[] {
  // PostgREST returns one-to-one embeds (checkins.reservation_id unique) as an object or array depending on version.
  return rows.map((row) => ({
    ...row,
    checkins: Array.isArray(row.checkins) ? ((row.checkins as unknown as { status: CheckinStatus }[])[0] ?? null) : row.checkins,
  }));
}

export async function listReservations(filters: ReservationFilters = {}, ownerView = false): Promise<ReservationListRow[]> {
  let query = supabase
    .from('reservations')
    .select(ownerView ? OWNER_COLUMNS : LIST_COLUMNS)
    .order('check_in', { ascending: false })
    .limit(filters.limit ?? 300);
  // Stays overlapping [from, to]: check_in <= to and check_out >= from.
  if (filters.from) query = query.gte('check_out', filters.from);
  if (filters.to) query = query.lte('check_in', filters.to);
  if (filters.propertyId) query = query.eq('property_id', filters.propertyId);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.source) query = query.eq('source', filters.source);
  if (filters.guestId) query = query.eq('guest_id', filters.guestId);
  const term = sanitizeSearchTerm(filters.search ?? '');
  if (term) query = query.or(`reference.ilike.%${term}%,external_reference.ilike.%${term}%`);
  const rows = normalize(
    (unwrap(await query.returns<ReservationListRow[]>()) ?? []).map((r) => ({ ...r, guests: r.guests ?? null, checkins: r.checkins ?? null })),
  );
  return filters.checkinStatus ? rows.filter((r) => r.checkins?.status === filters.checkinStatus) : rows;
}

export async function listReservationsBetween(from: string, toExclusive: string, propertyId?: string): Promise<ReservationListRow[]> {
  let query = supabase
    .from('reservations')
    .select(LIST_COLUMNS)
    .lt('check_in', toExclusive)
    .gt('check_out', from)
    .order('check_in');
  if (propertyId) query = query.eq('property_id', propertyId);
  return normalize(unwrap(await query.returns<ReservationListRow[]>()) ?? []);
}

// Minimal columns used for occupancy/finance computations (works for owners too).
export interface ReservationFinanceRow {
  id: string;
  property_id: string;
  check_in: string;
  check_out: string;
  status: ReservationStatus;
  gross_amount: number;
  commission_rate: number;
  platform_fees: number;
  source: BookingChannel;
}

export async function listReservationsForPeriod(from: string, toExclusive: string, propertyIds?: string[]): Promise<ReservationFinanceRow[]> {
  let query = supabase
    .from('reservations')
    .select('id, property_id, check_in, check_out, status, gross_amount, commission_rate, platform_fees, source')
    .lt('check_in', toExclusive)
    .gt('check_out', from);
  if (propertyIds) query = query.in('property_id', propertyIds.length ? propertyIds : ['00000000-0000-0000-0000-000000000000']);
  return unwrap(await query.returns<ReservationFinanceRow[]>()) ?? [];
}

export async function getReservation(id: string, ownerView = false): Promise<ReservationListRow> {
  const row = unwrap(
    await supabase
      .from('reservations')
      .select(ownerView ? OWNER_COLUMNS : LIST_COLUMNS)
      .eq('id', id)
      .single<ReservationListRow>(),
  );
  return normalize([{ ...row, guests: row.guests ?? null, checkins: row.checkins ?? null }])[0];
}

function toRow(input: ReservationInput) {
  return {
    property_id: input.propertyId,
    guest_id: input.guestId,
    source: input.source,
    external_reference: input.externalReference.trim() || null,
    check_in: input.checkIn,
    check_out: input.checkOut,
    guests_count: input.guestsCount,
    gross_amount: input.grossAmount,
    commission_rate: input.commissionRate,
    platform_fees: input.platformFees,
    smart_lock_code: input.smartLockCode.trim() || null,
    notes: input.notes.trim() || null,
  };
}

export function toReservationInput(row: ReservationRow): ReservationInput {
  return {
    propertyId: row.property_id,
    guestId: row.guest_id,
    source: row.source,
    externalReference: row.external_reference ?? '',
    checkIn: row.check_in,
    checkOut: row.check_out,
    guestsCount: row.guests_count,
    grossAmount: Number(row.gross_amount),
    commissionRate: Number(row.commission_rate),
    platformFees: Number(row.platform_fees),
    smartLockCode: row.smart_lock_code ?? '',
    notes: row.notes ?? '',
  };
}

export async function createReservation(input: ReservationInput, status: ReservationStatus): Promise<{ id: string; reference: string }> {
  return unwrap(
    await supabase
      .from('reservations')
      .insert({ ...toRow(input), status })
      .select('id, reference')
      .single<{ id: string; reference: string }>(),
  );
}

export async function updateReservation(id: string, input: ReservationInput): Promise<void> {
  unwrap(await supabase.from('reservations').update(toRow(input)).eq('id', id));
}

export async function setReservationStatus(id: string, status: ReservationStatus): Promise<void> {
  unwrap(await supabase.from('reservations').update({ status }).eq('id', id));
}

export async function createTasksFromDrafts(
  drafts: TaskDraft[],
  context: { propertyId: string; reservationId: string },
): Promise<void> {
  if (drafts.length === 0) return;
  unwrap(
    await supabase.from('tasks').insert(
      drafts.map((draft) => ({
        property_id: context.propertyId,
        reservation_id: context.reservationId,
        type: draft.type,
        title: draft.title,
        priority: draft.priority,
        due_at: localDateTimeToIso(draft.dueDate, draft.dueTime),
      })),
    ),
  );
}
