import type { OwnerInput, PropertyInput, ReservationImportRow } from '@darnalux/core';
import { supabase } from '../../lib/supabaseClient';
import { toUserMessage, unwrap } from '../../lib/errors';

export interface ImportOutcome {
  created: number;
  failures: { line: number; message: string }[];
}

export async function importOwners(rows: { line: number; value: OwnerInput }[]): Promise<ImportOutcome> {
  const payload = rows.map(({ value }) => ({
    first_name: value.firstName.trim(),
    last_name: value.lastName.trim(),
    email: value.email.trim() || null,
    phone: value.phone.trim() || null,
    address: value.address.trim() || null,
    city: value.city.trim() || null,
    status: value.status,
    internal_notes: value.internalNotes.trim() || null,
  }));
  unwrap(await supabase.from('owners').insert(payload));
  return { created: payload.length, failures: [] };
}

export async function importProperties(rows: { line: number; value: PropertyInput }[]): Promise<ImportOutcome> {
  const payload = rows.map(({ value }) => ({
    name: value.name.trim(),
    type: value.type,
    description: value.description.trim() || null,
    address: value.address.trim() || null,
    city: value.city.trim(),
    capacity: value.capacity,
    bedrooms: value.bedrooms,
    beds: value.beds,
    bathrooms: value.bathrooms,
    status: value.status,
    commission_rate: value.commissionRate,
  }));
  unwrap(await supabase.from('properties').insert(payload));
  return { created: payload.length, failures: [] };
}

// Reservations are inserted one by one so a date overlap on one line does not
// cancel the whole import; the property is matched by its exact name.
export async function importReservations(rows: { line: number; value: ReservationImportRow }[]): Promise<ImportOutcome> {
  const properties =
    unwrap(await supabase.from('properties').select('id, name, commission_rate').returns<{ id: string; name: string; commission_rate: number }[]>()) ?? [];
  const byName = new Map(properties.map((p) => [p.name.trim().toLowerCase(), p]));
  const outcome: ImportOutcome = { created: 0, failures: [] };

  for (const { line, value } of rows) {
    const property = byName.get(value.propertyName.trim().toLowerCase());
    if (!property) {
      outcome.failures.push({ line, message: `Bien introuvable : « ${value.propertyName} ».` });
      continue;
    }
    try {
      let guestId: string | null = null;
      if (value.guestEmail) {
        const existing = unwrap(
          await supabase.from('guests').select('id').eq('email', value.guestEmail.trim()).limit(1).returns<{ id: string }[]>(),
        );
        guestId = existing?.[0]?.id ?? null;
      }
      if (!guestId) {
        guestId = unwrap(
          await supabase
            .from('guests')
            .insert({
              first_name: value.guestFirstName,
              last_name: value.guestLastName,
              email: value.guestEmail || null,
              phone: value.guestPhone || null,
            })
            .select('id')
            .single<{ id: string }>(),
        ).id;
      }
      unwrap(
        await supabase.from('reservations').insert({
          property_id: property.id,
          guest_id: guestId,
          source: value.source,
          external_reference: value.externalReference || null,
          check_in: value.checkIn,
          check_out: value.checkOut,
          guests_count: value.guestsCount,
          status: value.status,
          gross_amount: value.grossAmount,
          commission_rate: Number(property.commission_rate),
        }),
      );
      outcome.created += 1;
    } catch (error) {
      outcome.failures.push({ line, message: toUserMessage(error) });
    }
  }
  return outcome;
}
