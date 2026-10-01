import { describe, expect, it } from 'vitest';
import type { TaskTiming } from './index';
import {
  canTransitionTask,
  compareTasks,
  isTaskOverdue,
  planReservationTasks,
  statusAfterAssignment,
  validateTaskInput,
} from './index';

describe('task transitions', () => {
  it('allows the field workflow and forbids reopening completed tasks', () => {
    expect(canTransitionTask('ASSIGNED', 'IN_PROGRESS')).toBe(true);
    expect(canTransitionTask('IN_PROGRESS', 'COMPLETED')).toBe(true);
    expect(canTransitionTask('COMPLETED', 'IN_PROGRESS')).toBe(false);
    expect(canTransitionTask('TODO', 'COMPLETED')).toBe(false);
  });

  it('keeps status and assignment consistent', () => {
    expect(statusAfterAssignment('TODO', 'agent-1')).toBe('ASSIGNED');
    expect(statusAfterAssignment('ASSIGNED', null)).toBe('TODO');
    expect(statusAfterAssignment('IN_PROGRESS', null)).toBe('IN_PROGRESS');
  });
});

describe('task ordering and overdue', () => {
  const now = new Date('2026-04-10T12:00:00Z');

  it('detects overdue open tasks only', () => {
    expect(isTaskOverdue({ status: 'TODO', priority: 'NORMAL', dueAt: '2026-04-10T08:00:00Z' }, now)).toBe(true);
    expect(isTaskOverdue({ status: 'COMPLETED', priority: 'NORMAL', dueAt: '2026-04-10T08:00:00Z' }, now)).toBe(false);
    expect(isTaskOverdue({ status: 'TODO', priority: 'NORMAL', dueAt: null }, now)).toBe(false);
  });

  it('sorts open tasks by priority then due date', () => {
    const tasks: (TaskTiming & { id: string })[] = [
      { id: 'done', status: 'COMPLETED', priority: 'URGENT', dueAt: null },
      { id: 'low', status: 'TODO', priority: 'LOW', dueAt: '2026-04-09T08:00:00Z' },
      { id: 'urgent', status: 'TODO', priority: 'URGENT', dueAt: '2026-04-12T08:00:00Z' },
      { id: 'normal-late', status: 'TODO', priority: 'NORMAL', dueAt: '2026-04-11T08:00:00Z' },
      { id: 'normal-early', status: 'TODO', priority: 'NORMAL', dueAt: '2026-04-10T08:00:00Z' },
    ];
    expect([...tasks].sort(compareTasks).map((t) => t.id)).toEqual(['urgent', 'normal-early', 'normal-late', 'low', 'done']);
  });
});

describe('planReservationTasks', () => {
  it('creates preparation, arrival, departure, inspection and cleaning tasks', () => {
    const drafts = planReservationTasks({ checkIn: '2026-04-11', checkOut: '2026-04-18' }, { propertyName: 'Villa Atlas' });
    expect(drafts.map((d) => d.type)).toEqual(['CLEANING', 'CHECK_IN', 'CHECK_OUT', 'INSPECTION', 'CLEANING']);
    expect(drafts[1]).toMatchObject({ dueDate: '2026-04-11', dueTime: '15:00', priority: 'HIGH' });
    expect(drafts[2].dueDate).toBe('2026-04-18');
    expect(drafts[0].title).toContain('Villa Atlas');
  });
});

describe('validateTaskInput', () => {
  it('requires a property and a title', () => {
    const result = validateTaskInput({
      propertyId: '',
      reservationId: null,
      assignedTo: null,
      type: 'CLEANING',
      title: ' ',
      notes: '',
      priority: 'NORMAL',
      dueAt: 'not-a-date',
    });
    expect(Object.keys(result.errors).sort()).toEqual(['dueAt', 'propertyId', 'title']);
  });
});
