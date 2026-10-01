import type { TaskInput, TaskPriority, TaskStatus, TaskType } from '@darnalux/core';
import { supabase } from '../../lib/supabaseClient';
import { unwrap } from '../../lib/errors';

export interface TaskRow {
  id: string;
  property_id: string;
  reservation_id: string | null;
  assigned_to: string | null;
  type: TaskType;
  title: string;
  notes: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  due_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export type TaskListRow = TaskRow & {
  properties: { id: string; name: string; city: string } | null;
  reservations: { id: string; reference: string } | null;
};

const COLUMNS = '*, properties(id, name, city), reservations(id, reference)';

export interface TaskFilters {
  status?: string;
  priority?: string;
  type?: string;
  assignedTo?: string;
  propertyId?: string;
  reservationId?: string;
  openOnly?: boolean;
  dueBefore?: string;
  limit?: number;
}

export async function listTasks(filters: TaskFilters = {}): Promise<TaskListRow[]> {
  let query = supabase.from('tasks').select(COLUMNS).order('due_at', { ascending: true, nullsFirst: false }).limit(filters.limit ?? 300);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.priority) query = query.eq('priority', filters.priority);
  if (filters.type) query = query.eq('type', filters.type);
  if (filters.assignedTo === 'none') query = query.is('assigned_to', null);
  else if (filters.assignedTo) query = query.eq('assigned_to', filters.assignedTo);
  if (filters.propertyId) query = query.eq('property_id', filters.propertyId);
  if (filters.reservationId) query = query.eq('reservation_id', filters.reservationId);
  if (filters.openOnly) query = query.not('status', 'in', '(COMPLETED,CANCELLED)');
  if (filters.dueBefore) query = query.lt('due_at', filters.dueBefore);
  return unwrap(await query.returns<TaskListRow[]>()) ?? [];
}

export async function getTask(id: string): Promise<TaskListRow> {
  return unwrap(await supabase.from('tasks').select(COLUMNS).eq('id', id).single<TaskListRow>());
}

function toRow(input: TaskInput) {
  return {
    property_id: input.propertyId,
    reservation_id: input.reservationId,
    assigned_to: input.assignedTo,
    type: input.type,
    title: input.title.trim(),
    notes: input.notes.trim() || null,
    priority: input.priority,
    due_at: input.dueAt,
  };
}

export function toTaskInput(row: TaskRow): TaskInput {
  return {
    propertyId: row.property_id,
    reservationId: row.reservation_id,
    assignedTo: row.assigned_to,
    type: row.type,
    title: row.title,
    notes: row.notes ?? '',
    priority: row.priority,
    dueAt: row.due_at,
  };
}

export async function createTask(input: TaskInput, status: TaskStatus): Promise<string> {
  return unwrap(await supabase.from('tasks').insert({ ...toRow(input), status }).select('id').single<{ id: string }>()).id;
}

export async function updateTask(id: string, input: TaskInput, status: TaskStatus): Promise<void> {
  unwrap(await supabase.from('tasks').update({ ...toRow(input), status }).eq('id', id));
}

export async function setTaskStatus(id: string, status: TaskStatus, notes?: string): Promise<void> {
  const patch: Record<string, unknown> = { status };
  if (notes !== undefined) patch.notes = notes.trim() || null;
  unwrap(await supabase.from('tasks').update(patch).eq('id', id));
}

export async function deleteTask(id: string): Promise<void> {
  unwrap(await supabase.from('tasks').delete().eq('id', id));
}

export interface StaffMember {
  id: string;
  full_name: string | null;
  role_codes: string[];
}

export async function listStaff(): Promise<StaffMember[]> {
  const { data, error } = await supabase.rpc('assignable_users');
  if (error) throw error;
  return (data as StaffMember[] | null) ?? [];
}

export function staffName(staff: readonly StaffMember[], id: string | null): string {
  if (!id) return 'Non assignée';
  return staff.find((member) => member.id === id)?.full_name ?? 'Membre de l’équipe';
}
