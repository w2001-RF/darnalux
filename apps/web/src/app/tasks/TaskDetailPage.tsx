import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, Pencil, Trash2 } from 'lucide-react';
import type { TaskStatus } from '@darnalux/core';
import {
  PERMISSIONS,
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_TONES,
  TASK_STATUS_LABELS,
  TASK_STATUS_TONES,
  TASK_TYPE_LABELS,
  hasPermission,
  isTaskOverdue,
  nextTaskStatuses,
} from '@darnalux/core';
import { useAuth } from '../../features/auth/AuthContext';
import { isPortalUser } from '../../features/auth/portal';
import { deleteTask, getTask, listStaff, setTaskStatus, staffName } from '../../features/tasks/api';
import { useAsync } from '../../lib/useAsync';
import { toUserMessage } from '../../lib/errors';
import { formatDateTime } from '../../lib/format';
import { Badge, Facts, PageHeader, Section, TextAreaField } from '../../components/ui';
import { ErrorAlert, Loading } from '../../components/Feedback';

const ACTION_LABELS: Partial<Record<TaskStatus, string>> = {
  IN_PROGRESS: 'Démarrer',
  COMPLETED: 'Terminer',
  BLOCKED: 'Signaler un blocage',
  CANCELLED: 'Annuler',
  TODO: 'Remettre à faire',
  ASSIGNED: 'Marquer assignée',
};

export default function TaskDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const portal = isPortalUser(user);
  const canManage = hasPermission(user, PERMISSIONS.TASKS_MANAGE);
  const task = useAsync(() => getTask(id), [id]);
  const staff = useAsync(() => (portal ? Promise.resolve([]) : listStaff()), [portal]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (task.data) setNotes(task.data.notes ?? '');
  }, [task.data]);

  if (task.loading) return <Loading />;
  if (task.error || !task.data) return <ErrorAlert>{task.error ?? 'Tâche introuvable.'}</ErrorAlert>;
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
    } catch (err) {
      setError(toUserMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function saveNotes() {
    setError(null);
    try {
      await setTaskStatus(t.id, t.status, notes);
      task.reload();
    } catch (err) {
      setError(toUserMessage(err));
    }
  }

  async function remove() {
    if (!window.confirm('Supprimer cette tâche ?')) return;
    try {
      await deleteTask(t.id);
      navigate('/app/tasks');
    } catch (err) {
      setError(toUserMessage(err));
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        back={{ to: '/app/tasks', label: 'Tâches' }}
        title={t.title}
        subtitle={
          <>
            <Badge tone={TASK_STATUS_TONES[t.status]}>{TASK_STATUS_LABELS[t.status]}</Badge>{' '}
            <Badge tone={TASK_PRIORITY_TONES[t.priority]}>{TASK_PRIORITY_LABELS[t.priority]}</Badge>{' '}
            {overdue && (
              <span className="overdue">
                <AlertTriangle size={13} aria-hidden="true" /> En retard
              </span>
            )}
          </>
        }
        actions={
          canManage && (
            <>
              <Link className="btn btn-ghost btn-sm" to={`/app/tasks/${t.id}/edit`}>
                <Pencil size={14} aria-hidden="true" /> Modifier
              </Link>
              <button type="button" className="btn btn-ghost btn-sm" onClick={remove}>
                <Trash2 size={14} aria-hidden="true" /> Supprimer
              </button>
            </>
          )
        }
      />
      {error && <ErrorAlert>{error}</ErrorAlert>}
      <div className="app-grid">
        <Section title="Détails">
          <Facts
            items={[
              { label: 'Type', value: TASK_TYPE_LABELS[t.type] },
              { label: 'Bien', value: t.properties ? <Link to={`/app/properties/${t.properties.id}`}>{t.properties.name}</Link> : '—' },
              { label: 'Réservation', value: t.reservations ? <Link to={`/app/reservations/${t.reservations.id}`}>{t.reservations.reference}</Link> : '—' },
              { label: 'Échéance', value: formatDateTime(t.due_at) },
              ...(portal ? [] : [{ label: 'Assignée à', value: staffName(staff.data ?? [], t.assigned_to) }]),
              { label: 'Terminée le', value: formatDateTime(t.completed_at) },
            ]}
          />
        </Section>
        <Section title="Suivi">
          {canAct ? (
            <>
              <TextAreaField label="Notes / compte rendu" rows={5} value={notes} onChange={(e) => setNotes(e.target.value)} />
              <div className="inline-actions">
                {nextTaskStatuses(t.status).map((status) => (
                  <button
                    key={status}
                    type="button"
                    className={'btn btn-sm ' + (status === 'COMPLETED' || status === 'IN_PROGRESS' ? 'btn-primary' : 'btn-ghost')}
                    disabled={busy}
                    onClick={() => move(status)}
                  >
                    {ACTION_LABELS[status] ?? TASK_STATUS_LABELS[status]}
                  </button>
                ))}
                <button type="button" className="btn btn-link btn-sm" onClick={saveNotes}>Enregistrer les notes</button>
              </div>
            </>
          ) : (
            <p className="prose">{t.notes || <span className="dim">Aucune note.</span>}</p>
          )}
        </Section>
      </div>
    </div>
  );
}
