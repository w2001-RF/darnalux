import type { AuthorizationContext } from '@darnalux/core';
import { PERMISSIONS, hasPermission, personFullName, sanitizeSearchTerm } from '@darnalux/core';
import { supabase } from '../../lib/supabaseClient';

export interface SearchHit {
  kind: 'property' | 'owner' | 'reservation' | 'guest' | 'task';
  id: string;
  label: string;
  detail: string;
  to: string;
}

export const SEARCH_KIND_LABELS: Record<SearchHit['kind'], string> = {
  property: 'Bien',
  owner: 'Propriétaire',
  reservation: 'Réservation',
  guest: 'Voyageur',
  task: 'Tâche',
};

async function searchProperties(like: string): Promise<SearchHit[]> {
  const { data } = await supabase
    .from('properties')
    .select('id, name, city')
    .or(`name.ilike.${like},city.ilike.${like}`)
    .limit(5)
    .returns<{ id: string; name: string; city: string }[]>();
  return (data ?? []).map((p) => ({ kind: 'property', id: p.id, label: p.name, detail: p.city, to: `/app/properties/${p.id}` }));
}

async function searchOwners(like: string): Promise<SearchHit[]> {
  const { data } = await supabase
    .from('owners')
    .select('id, first_name, last_name, email')
    .or(`first_name.ilike.${like},last_name.ilike.${like},email.ilike.${like}`)
    .limit(5)
    .returns<{ id: string; first_name: string; last_name: string; email: string | null }[]>();
  return (data ?? []).map((o) => ({
    kind: 'owner',
    id: o.id,
    label: personFullName(o.first_name, o.last_name),
    detail: o.email ?? '',
    to: `/app/owners/${o.id}`,
  }));
}

async function searchReservations(like: string): Promise<SearchHit[]> {
  const { data } = await supabase
    .from('reservations')
    .select('id, reference, properties(name)')
    .or(`reference.ilike.${like},external_reference.ilike.${like}`)
    .limit(5)
    .returns<{ id: string; reference: string; properties: { name: string } | null }[]>();
  return (data ?? []).map((r) => ({
    kind: 'reservation',
    id: r.id,
    label: r.reference,
    detail: r.properties?.name ?? '',
    to: `/app/reservations/${r.id}`,
  }));
}

async function searchGuests(like: string): Promise<SearchHit[]> {
  const { data } = await supabase
    .from('guests')
    .select('id, first_name, last_name, email, phone')
    .or(`first_name.ilike.${like},last_name.ilike.${like},email.ilike.${like},phone.ilike.${like}`)
    .limit(5)
    .returns<{ id: string; first_name: string; last_name: string; email: string | null; phone: string | null }[]>();
  return (data ?? []).map((g) => ({
    kind: 'guest',
    id: g.id,
    label: personFullName(g.first_name, g.last_name),
    detail: g.email ?? g.phone ?? '',
    to: `/app/guests/${g.id}`,
  }));
}

async function searchTasks(like: string): Promise<SearchHit[]> {
  const { data } = await supabase
    .from('tasks')
    .select('id, title, properties(name)')
    .ilike('title', like)
    .limit(5)
    .returns<{ id: string; title: string; properties: { name: string } | null }[]>();
  return (data ?? []).map((t) => ({ kind: 'task', id: t.id, label: t.title, detail: t.properties?.name ?? '', to: `/app/tasks/${t.id}` }));
}

// Global search across the modules the user can read (RLS still applies).
export async function globalSearch(rawTerm: string, user: AuthorizationContext | null): Promise<SearchHit[]> {
  const term = sanitizeSearchTerm(rawTerm);
  if (term.length < 2) return [];
  const like = `%${term}%`;
  const portal = hasPermission(user, PERMISSIONS.OWNER_PORTAL);
  const jobs: Promise<SearchHit[]>[] = [];
  if (hasPermission(user, PERMISSIONS.PROPERTIES_VIEW) || portal) jobs.push(searchProperties(like));
  if (hasPermission(user, PERMISSIONS.OWNERS_VIEW)) jobs.push(searchOwners(like));
  if (hasPermission(user, PERMISSIONS.RESERVATIONS_VIEW) || portal) jobs.push(searchReservations(like));
  if (hasPermission(user, PERMISSIONS.GUESTS_VIEW)) jobs.push(searchGuests(like));
  if (hasPermission(user, PERMISSIONS.TASKS_VIEW) || hasPermission(user, PERMISSIONS.TASKS_EXECUTE)) jobs.push(searchTasks(like));
  const results = await Promise.allSettled(jobs);
  return results.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));
}
