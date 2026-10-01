import type { ISODate } from '../common/dates';
import type { Tone, ValidationResult } from '../common/validation';
import { isBlank, toResult } from '../common/validation';

export type TaskType =
  | 'CLEANING'
  | 'CHECK_IN'
  | 'CHECK_OUT'
  | 'MAINTENANCE'
  | 'INSPECTION'
  | 'REPAIR'
  | 'SUPPLY'
  | 'EMERGENCY';
export type TaskStatus = 'TODO' | 'ASSIGNED' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED' | 'CANCELLED';
export type TaskPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export const TASK_TYPES: readonly TaskType[] = [
  'CLEANING',
  'CHECK_IN',
  'CHECK_OUT',
  'MAINTENANCE',
  'INSPECTION',
  'REPAIR',
  'SUPPLY',
  'EMERGENCY',
];
export const TASK_STATUSES: readonly TaskStatus[] = ['TODO', 'ASSIGNED', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'CANCELLED'];
export const TASK_PRIORITIES: readonly TaskPriority[] = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  CLEANING: 'Nettoyage',
  CHECK_IN: 'Check-in',
  CHECK_OUT: 'Check-out',
  MAINTENANCE: 'Maintenance',
  INSPECTION: 'Inspection',
  REPAIR: 'Réparation',
  SUPPLY: 'Approvisionnement',
  EMERGENCY: 'Urgence',
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'À faire',
  ASSIGNED: 'Assignée',
  IN_PROGRESS: 'En cours',
  BLOCKED: 'Bloquée',
  COMPLETED: 'Terminée',
  CANCELLED: 'Annulée',
};

export const TASK_STATUS_TONES: Record<TaskStatus, Tone> = {
  TODO: 'neutral',
  ASSIGNED: 'info',
  IN_PROGRESS: 'gold',
  BLOCKED: 'danger',
  COMPLETED: 'success',
  CANCELLED: 'neutral',
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: 'Basse',
  NORMAL: 'Normale',
  HIGH: 'Haute',
  URGENT: 'Urgente',
};

export const TASK_PRIORITY_TONES: Record<TaskPriority, Tone> = {
  LOW: 'neutral',
  NORMAL: 'info',
  HIGH: 'warning',
  URGENT: 'danger',
};

const PRIORITY_WEIGHT: Record<TaskPriority, number> = { URGENT: 3, HIGH: 2, NORMAL: 1, LOW: 0 };

const TRANSITIONS: Record<TaskStatus, readonly TaskStatus[]> = {
  TODO: ['ASSIGNED', 'IN_PROGRESS', 'CANCELLED'],
  ASSIGNED: ['IN_PROGRESS', 'BLOCKED', 'TODO', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'BLOCKED', 'CANCELLED'],
  BLOCKED: ['IN_PROGRESS', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: ['TODO'],
};

export function nextTaskStatuses(from: TaskStatus): readonly TaskStatus[] {
  return TRANSITIONS[from];
}

export function canTransitionTask(from: TaskStatus, to: TaskStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function isTaskClosed(status: TaskStatus): boolean {
  return status === 'COMPLETED' || status === 'CANCELLED';
}

export interface TaskTiming {
  status: TaskStatus;
  priority: TaskPriority;
  dueAt: string | null;
}

export function isTaskOverdue(task: TaskTiming, now: Date): boolean {
  if (!task.dueAt || isTaskClosed(task.status)) return false;
  return new Date(task.dueAt).getTime() < now.getTime();
}

// Open tasks first, then by priority (urgent first), then earliest due date.
export function compareTasks(a: TaskTiming, b: TaskTiming): number {
  const closed = Number(isTaskClosed(a.status)) - Number(isTaskClosed(b.status));
  if (closed !== 0) return closed;
  const priority = PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
  if (priority !== 0) return priority;
  if (a.dueAt && b.dueAt) return a.dueAt.localeCompare(b.dueAt);
  if (a.dueAt) return -1;
  if (b.dueAt) return 1;
  return 0;
}

export interface TaskInput {
  propertyId: string;
  reservationId: string | null;
  assignedTo: string | null;
  type: TaskType;
  title: string;
  notes: string;
  priority: TaskPriority;
  dueAt: string | null;
}

export type TaskField = keyof TaskInput;

export function validateTaskInput(input: TaskInput): ValidationResult<TaskField> {
  const errors: Partial<Record<TaskField, string>> = {};
  if (!input.propertyId) errors.propertyId = 'Choisissez un bien.';
  if (isBlank(input.title)) errors.title = 'Le titre est obligatoire.';
  if (!TASK_TYPES.includes(input.type)) errors.type = 'Type invalide.';
  if (!TASK_PRIORITIES.includes(input.priority)) errors.priority = 'Priorité invalide.';
  if (input.dueAt && Number.isNaN(new Date(input.dueAt).getTime())) errors.dueAt = 'Échéance invalide.';
  return toResult(errors);
}

// Status to apply when (un)assigning a task, so assignment and status stay consistent.
export function statusAfterAssignment(current: TaskStatus, assignedTo: string | null): TaskStatus {
  if (assignedTo && current === 'TODO') return 'ASSIGNED';
  if (!assignedTo && current === 'ASSIGNED') return 'TODO';
  return current;
}

export interface TaskDraft {
  type: TaskType;
  title: string;
  priority: TaskPriority;
  dueDate: ISODate;
  dueTime: string;
}

export interface TurnoverOptions {
  checkInTime?: string;
  checkOutTime?: string;
  propertyName?: string;
}

// Standard operational tasks generated for a confirmed reservation
// (automation "Nouvelle réservation → Créer tâches" from the specification).
export function planReservationTasks(
  stay: { checkIn: ISODate; checkOut: ISODate },
  options: TurnoverOptions = {},
): TaskDraft[] {
  const checkInTime = options.checkInTime ?? '15:00';
  const checkOutTime = options.checkOutTime ?? '11:00';
  const suffix = options.propertyName ? ` · ${options.propertyName}` : '';
  return [
    { type: 'CLEANING', title: `Préparation avant arrivée${suffix}`, priority: 'NORMAL', dueDate: stay.checkIn, dueTime: '12:00' },
    { type: 'CHECK_IN', title: `Accueil voyageur${suffix}`, priority: 'HIGH', dueDate: stay.checkIn, dueTime: checkInTime },
    { type: 'CHECK_OUT', title: `Départ voyageur${suffix}`, priority: 'HIGH', dueDate: stay.checkOut, dueTime: checkOutTime },
    { type: 'INSPECTION', title: `Inspection après départ${suffix}`, priority: 'NORMAL', dueDate: stay.checkOut, dueTime: '13:00' },
    { type: 'CLEANING', title: `Nettoyage après départ${suffix}`, priority: 'NORMAL', dueDate: stay.checkOut, dueTime: '15:00' },
  ];
}
