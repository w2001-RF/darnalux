import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, ClipboardList, Plus } from 'lucide-react';
import {
  PERMISSIONS,
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_TONES,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  TASK_STATUS_TONES,
  TASK_TYPES,
  TASK_TYPE_LABELS,
  compareTasks,
  hasPermission,
  isTaskOverdue,
} from '@darnalux/core';
import { useAuth } from '../../features/auth/AuthContext';
import { isPortalUser } from '../../features/auth/portal';
import { listStaff, listTasks, staffName } from '../../features/tasks/api';
import { listPropertyOptions } from '../../features/properties/api';
import { useAsync } from '../../lib/useAsync';
import { formatDateTime } from '../../lib/format';
import { Badge, EmptyState, PageHeader, optionsFrom } from '../../components/ui';
import { ErrorAlert, Loading } from '../../components/Feedback';

export default function TasksListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const portal = isPortalUser(user);
  const canManage = hasPermission(user, PERMISSIONS.TASKS_MANAGE);
  const seesAll = hasPermission(user, PERMISSIONS.TASKS_VIEW);
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [type, setType] = useState('');
  const [assignee, setAssignee] = useState(seesAll ? '' : user?.id ?? '');
  const [propertyId, setPropertyId] = useState('');
  const [openOnly, setOpenOnly] = useState(true);

  const staff = useAsync(() => (portal ? Promise.resolve([]) : listStaff()), [portal]);
  const properties = useAsync(listPropertyOptions, []);
  const tasks = useAsync(
    () => listTasks({ status, priority, type, assignedTo: assignee, propertyId, openOnly: openOnly && !status }),
    [status, priority, type, assignee, propertyId, openOnly],
  );
  const now = new Date();
  const sorted = useMemo(
    () => [...(tasks.data ?? [])].sort((a, b) => compareTasks({ ...a, dueAt: a.due_at }, { ...b, dueAt: b.due_at })),
    [tasks.data],
  );

  return (
    <div className="page-stack">
      <PageHeader
        title={portal ? 'Interventions' : 'Tâches & interventions'}
        subtitle={portal ? 'Interventions réalisées et prévues sur vos biens.' : 'Nettoyage, accueil, maintenance, inspections et urgences.'}
        actions={
          canManage && (
            <Link className="btn btn-primary" to="/app/tasks/new">
              <Plus size={16} aria-hidden="true" /> Nouvelle tâche
            </Link>
          )
        }
      />
      <div className="filters">
        {!portal && (
          <select aria-label="Assignée à" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
            {seesAll && <option value="">Toute l'équipe</option>}
            {user && <option value={user.id}>Mes tâches</option>}
            {seesAll && <option value="none">Non assignées</option>}
            {seesAll && (staff.data ?? []).filter((s) => s.id !== user?.id).map((s) => (
              <option key={s.id} value={s.id}>{s.full_name ?? 'Membre'}</option>
            ))}
          </select>
        )}
        <select aria-label="Statut" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tous les statuts</option>
          {optionsFrom(TASK_STATUSES, TASK_STATUS_LABELS).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select aria-label="Priorité" value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="">Toutes priorités</option>
          {optionsFrom(TASK_PRIORITIES, TASK_PRIORITY_LABELS).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select aria-label="Type" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">Tous les types</option>
          {optionsFrom(TASK_TYPES, TASK_TYPE_LABELS).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select aria-label="Bien" value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
          <option value="">Tous les biens</option>
          {(properties.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <label className="checkbox-line">
          <input type="checkbox" checked={openOnly} onChange={(e) => setOpenOnly(e.target.checked)} disabled={Boolean(status)} /> En cours uniquement
        </label>
      </div>
      {tasks.loading && <Loading />}
      {tasks.error && <ErrorAlert>{tasks.error}</ErrorAlert>}
      {tasks.data && tasks.data.length === 0 && <EmptyState icon={ClipboardList} title="Aucune tâche" text="Rien à faire pour ces critères." />}
      {sorted.length > 0 && (
        <section className="panel panel-flush">
          <div className="panel-head">
            <h2>Tâches</h2>
            <span className="panel-head-note">{sorted.length} tâche(s)</span>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tâche</th>
                  <th>Bien</th>
                  <th>Échéance</th>
                  {!portal && <th>Assignée à</th>}
                  <th>Priorité</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((t) => {
                  const overdue = isTaskOverdue({ ...t, dueAt: t.due_at }, now);
                  return (
                    <tr key={t.id} className={'row-link' + (overdue ? ' row-alert' : '')} onClick={() => navigate(`/app/tasks/${t.id}`)}>
                      <td>
                        <Link className="cell-title" to={`/app/tasks/${t.id}`} onClick={(e) => e.stopPropagation()}>{t.title}</Link>
                        <small className="dim cell-sub">{TASK_TYPE_LABELS[t.type]}{t.reservations ? ` · ${t.reservations.reference}` : ''}</small>
                      </td>
                      <td>{t.properties?.name ?? '—'}</td>
                      <td>
                        {formatDateTime(t.due_at)}
                        {overdue && <span className="overdue"><AlertTriangle size={13} aria-hidden="true" /> En retard</span>}
                      </td>
                      {!portal && <td>{staffName(staff.data ?? [], t.assigned_to)}</td>}
                      <td><Badge tone={TASK_PRIORITY_TONES[t.priority]}>{TASK_PRIORITY_LABELS[t.priority]}</Badge></td>
                      <td><Badge tone={TASK_STATUS_TONES[t.status]}>{TASK_STATUS_LABELS[t.status]}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
