import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import {
  PERMISSIONS,
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_TONES,
  TASK_STATUS_LABELS,
  TASK_STATUS_TONES,
  TASK_TYPE_LABELS,
  hasPermission,
  isPortalUser,
  isTaskOverdue,
  nextTaskStatuses,
} from '@darnalux/core';
import type { TaskStatus } from '@darnalux/core';
import { toUserMessage } from '@darnalux/data/errors';
import { getTask, listStaff, setTaskStatus, staffName } from '@darnalux/data/tasks';
import { Screen } from '../../../src/components/Screen';
import { Badge, Banner, Button, Facts, Field, Loading, SectionTitle } from '../../../src/components/ui';
import { useAuth } from '../../../src/features/auth/AuthContext';
import { Guard } from '../../../src/features/auth/Guard';
import { formatDateTime } from '../../../src/lib/format';
import { useAsync } from '../../../src/lib/useAsync';
import { spacing } from '../../../src/theme';

const MOVE_LABELS: Partial<Record<TaskStatus, string>> = {
  ASSIGNED: 'Marquer assignée',
  IN_PROGRESS: 'Démarrer',
  BLOCKED: 'Signaler un blocage',
  COMPLETED: 'Terminer',
  CANCELLED: 'Annuler',
  TODO: 'Remettre à faire',
};

export default function TaskDetailScreen() {
  return (
    <Guard anyOf={[PERMISSIONS.TASKS_VIEW, PERMISSIONS.TASKS_EXECUTE, PERMISSIONS.OWNER_PORTAL]}>
      <TaskDetail />
    </Guard>
  );
}

function TaskDetail() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const portal = isPortalUser(user);
  const canManage = hasPermission(user, PERMISSIONS.TASKS_MANAGE);
  const task = useAsync(() => getTask(id), [id]);
  const staff = useAsync(() => (portal ? Promise.resolve([]) : listStaff().catch(() => [])), [portal]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (task.data) setNotes(task.data.notes ?? '');
  }, [task.data]);

  if (task.loading && !task.data) return <Loading />;
  if (task.error || !task.data) {
    return (
      <Screen insetBottom>
        <Banner message={task.error ?? 'Tâche introuvable.'} />
      </Screen>
    );
  }
  const t = task.data;
  const isAssignee = t.assigned_to === user?.id;
  const canAct = !portal && (canManage || (isAssignee && hasPermission(user, PERMISSIONS.TASKS_EXECUTE)));
  const overdue = isTaskOverdue({ ...t, dueAt: t.due_at }, new Date());

  async function move(status: TaskStatus) {
    if (status === 'BLOCKED' && !notes.trim()) {
      setError('Décrivez le problème dans les notes avant de signaler un blocage.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await setTaskStatus(t.id, status, notes);
      task.reload();
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function saveNotes() {
    setBusy(true);
    setError(null);
    try {
      await setTaskStatus(t.id, t.status, notes);
      task.reload();
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen insetBottom contentStyle={styles.content} onRefresh={task.reload} refreshing={task.loading}>
      <Stack.Screen options={{ title: 'Tâche' }} />
      <View style={styles.badges}>
        <Badge tone={TASK_STATUS_TONES[t.status]} label={TASK_STATUS_LABELS[t.status]} />
        <Badge tone={TASK_PRIORITY_TONES[t.priority]} label={TASK_PRIORITY_LABELS[t.priority]} />
        {overdue ? <Badge tone="danger" label="En retard" /> : null}
      </View>

      {error ? <Banner message={error} /> : null}

      <Facts
        items={[
          { label: 'Titre', value: t.title },
          { label: 'Type', value: TASK_TYPE_LABELS[t.type] },
          { label: 'Bien', value: t.properties?.name ?? '—' },
          { label: 'Réservation', value: t.reservations?.reference ?? '—' },
          { label: 'Échéance', value: formatDateTime(t.due_at) },
          { label: 'Assignée à', value: staffName(staff.data ?? [], t.assigned_to) },
          { label: 'Terminée le', value: formatDateTime(t.completed_at) },
        ]}
      />

      {canAct ? (
        <>
          <SectionTitle title="Notes" />
          <Field label="Notes de la tâche" value={notes} onChangeText={setNotes} multiline />
          <Button label="Enregistrer les notes" variant="ghost" onPress={() => void saveNotes()} disabled={busy || notes === (t.notes ?? '')} />
          {nextTaskStatuses(t.status).length > 0 ? (
            <>
              <SectionTitle title="Changer le statut" />
              {nextTaskStatuses(t.status).map((status) => (
                <Button
                  key={status}
                  label={MOVE_LABELS[status] ?? TASK_STATUS_LABELS[status]}
                  variant={status === 'CANCELLED' ? 'danger' : status === 'COMPLETED' || status === 'IN_PROGRESS' ? 'primary' : 'ghost'}
                  disabled={busy}
                  onPress={() => void move(status)}
                />
              ))}
            </>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.sm },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
