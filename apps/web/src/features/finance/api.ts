import type { ExpenseCategory } from '@darnalux/core';
import { supabase } from '../../lib/supabaseClient';
import { unwrap } from '../../lib/errors';

export interface ExpenseRow {
  id: string;
  property_id: string;
  reservation_id: string | null;
  category: ExpenseCategory;
  description: string | null;
  amount: number;
  incurred_on: string;
  charged_to_owner: boolean;
  properties?: { name: string } | null;
}

export interface ExpenseInput {
  propertyId: string;
  reservationId: string | null;
  category: ExpenseCategory;
  description: string;
  amount: number;
  incurredOn: string;
  chargedToOwner: boolean;
}

export async function listExpenses(from: string, toExclusive: string, propertyIds?: string[]): Promise<ExpenseRow[]> {
  let query = supabase
    .from('expenses')
    .select('id, property_id, reservation_id, category, description, amount, incurred_on, charged_to_owner, properties(name)')
    .gte('incurred_on', from)
    .lt('incurred_on', toExclusive)
    .order('incurred_on', { ascending: false });
  if (propertyIds) query = query.in('property_id', propertyIds.length ? propertyIds : ['00000000-0000-0000-0000-000000000000']);
  return unwrap(await query.returns<ExpenseRow[]>()) ?? [];
}

export async function listReservationExpenses(reservationId: string): Promise<ExpenseRow[]> {
  return (
    unwrap(
      await supabase
        .from('expenses')
        .select('id, property_id, reservation_id, category, description, amount, incurred_on, charged_to_owner')
        .eq('reservation_id', reservationId)
        .returns<ExpenseRow[]>(),
    ) ?? []
  );
}

export async function createExpense(input: ExpenseInput): Promise<void> {
  unwrap(
    await supabase.from('expenses').insert({
      property_id: input.propertyId,
      reservation_id: input.reservationId,
      category: input.category,
      description: input.description.trim() || null,
      amount: input.amount,
      incurred_on: input.incurredOn,
      charged_to_owner: input.chargedToOwner,
    }),
  );
}

export async function deleteExpense(id: string): Promise<void> {
  unwrap(await supabase.from('expenses').delete().eq('id', id));
}

// Property → owners mapping used to aggregate revenue per owner.
export async function listPropertyOwnerLinks(): Promise<{ property_id: string; owner_id: string; share_percent: number; owners: { first_name: string; last_name: string } | null }[]> {
  return (
    unwrap(
      await supabase
        .from('property_owners')
        .select('property_id, owner_id, share_percent, owners(first_name, last_name)')
        .returns<{ property_id: string; owner_id: string; share_percent: number; owners: { first_name: string; last_name: string } | null }[]>(),
    ) ?? []
  );
}
