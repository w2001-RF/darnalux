import { supabase } from '../../lib/supabaseClient';
import { unwrap } from '../../lib/errors';

export interface AuditRow {
  id: number;
  actor_id: string | null;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  entity: string;
  entity_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
}

export const AUDIT_ENTITY_LABELS: Record<string, string> = {
  owners: 'Propriétaire',
  properties: 'Bien',
  property_owners: 'Lien bien/propriétaire',
  property_listings: 'Annonce',
  guests: 'Voyageur',
  reservations: 'Réservation',
  expenses: 'Dépense',
  tasks: 'Tâche',
  checkins: 'Check-in',
  checkouts: 'Check-out',
  documents: 'Document',
  contract_templates: 'Contrat',
  user_roles: 'Rôle utilisateur',
  marketing_campaigns: 'Campagne',
};

export const AUDIT_ACTION_LABELS: Record<AuditRow['action'], string> = {
  INSERT: 'Création',
  UPDATE: 'Modification',
  DELETE: 'Suppression',
};

export async function listAudit(filters: { entity?: string; entityId?: string; action?: string; limit?: number } = {}): Promise<AuditRow[]> {
  let query = supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(filters.limit ?? 200);
  if (filters.entity) query = query.eq('entity', filters.entity);
  if (filters.entityId) query = query.eq('entity_id', filters.entityId);
  if (filters.action) query = query.eq('action', filters.action);
  return unwrap(await query.returns<AuditRow[]>()) ?? [];
}

const HIDDEN_KEYS = new Set(['created_at', 'id']);

export function changedFields(row: AuditRow): { key: string; before: unknown; after: unknown }[] {
  const before = row.old_data ?? {};
  const after = row.new_data ?? {};
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys]
    .filter((key) => !HIDDEN_KEYS.has(key) && JSON.stringify(before[key]) !== JSON.stringify(after[key]))
    .map((key) => ({ key, before: before[key], after: after[key] }));
}
