import { useState } from 'react';
import { useRouter } from 'expo-router';
import {
  PERMISSIONS,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  TASK_STATUS_TONES,
  TASK_TYPE_LABELS,
  compareTasks,
  isTaskOverdue,
} from '@darnalux/core';
import { listTasks } from '@darnalux/data/tasks';
import type { TaskFilters } from '@darnalux/data/tasks';
import { AsyncList, Chips, ListRow } from '../../../src/components/ui';
import { Guard } from '../../../src/features/auth/Guard';
import { useAuth } from '../../../src/features/auth/AuthContext';
import { formatDateTime } from '../../../src/lib/format';
import { useAsync } from '../../../src/lib/useAsync';

type Filter = 'OPEN' | 'MINE' | 'DONE' | 'ALL';

const FILTERS: readonly { id: Filter; label: string }[] = [
  { id: 'OPEN', label: 'Ouvertes' },
  { id: 'MINE', label: 'Mes tâches' },
  { id: 'DONE', label: 'Terminées' },
  { id: 'ALL', label: 'Toutes' },
];

export default function TasksTab() {
  return (
    <Guard anyOf={[PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_EXECUTE]}>
      <TasksList />
    </Guard>
  );
}

function TasksList() {
  const router = useRouter();
  const { user } = useAuth();
  const [filter, setFilter] = useState<Filter>('OPEN');

  const state = useAsync(() => {
    const filters: TaskFilters = { limit: 200 };
    if (filter === 'OPEN') filters.openOnly = true;
    if (filter === 'MINE' && user) {
      filters.assignedTo = user.id;
      filters.openOnly = true;
    }
    if (filter === 'DONE') filters.status = 'COMPLETED';
    return listTasks(filters);
  }, [filter, user?.id]);

  const now = new Date();
  const rows = [...(state.data ?? [])].sort((a, b) => compareTasks({ ...a, dueAt: a.due_at }, { ...b, dueAt: b.due_at }));

  return (
    <AsyncList
      state={state}
      data={rows}
      keyExtractor={(t) => t.id}
      emptyTitle="Aucune tâche"
      emptyText="Rien à afficher pour ce filtre."
      header={<Chips options={FILTERS} value={filter} onChange={setFilter} />}
      renderItem={({ item: t }) => {
        const overdue = isTaskOverdue({ ...t, dueAt: t.due_at }, now);
        return (
          <ListRow
            title={t.title}
            subtitle={`${t.properties?.name ?? ''} · ${TASK_TYPE_LABELS[t.type]}`}
            meta={`${overdue ? 'En retard · ' : ''}${formatDateTime(t.due_at)} · ${TASK_PRIORITY_LABELS[t.priority]}`}
            badge={{ label: TASK_STATUS_LABELS[t.status], tone: overdue ? 'danger' : TASK_STATUS_TONES[t.status] }}
            onPress={() => router.push(`/tasks/${t.id}`)}
          />
        );
      }}
    />
  );
}
