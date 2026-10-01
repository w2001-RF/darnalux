import { useState } from 'react';
import { History } from 'lucide-react';
import { PERMISSIONS } from '@darnalux/core';
import { RequirePermission } from '../../features/auth/RequirePermission';
import { AUDIT_ACTION_LABELS, AUDIT_ENTITY_LABELS, changedFields, listAudit } from '../../features/audit/api';
import { listStaff, staffName } from '../../features/tasks/api';
import { useAsync } from '../../lib/useAsync';
import { formatDateTime } from '../../lib/format';
import { Badge, EmptyState, PageHeader } from '../../components/ui';
import { ErrorAlert, Loading } from '../../components/Feedback';

function short(value: unknown): string {
  if (value === null || value === undefined) return '∅';
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return text.length > 60 ? `${text.slice(0, 57)}…` : text;
}

function Audit() {
  const [entity, setEntity] = useState('');
  const [action, setAction] = useState('');
  const audit = useAsync(() => listAudit({ entity, action, limit: 300 }), [entity, action]);
  const staff = useAsync(() => listStaff().catch(() => []), []);

  return (
    <div className="page-stack">
      <PageHeader title="Audit" subtitle="Historique des actions importantes : qui, quoi, quand, avant/après." />
      <div className="filters">
        <select aria-label="Entité" value={entity} onChange={(e) => setEntity(e.target.value)}>
          <option value="">Toutes les entités</option>
          {Object.entries(AUDIT_ENTITY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
        <select aria-label="Action" value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="">Toutes les actions</option>
          {Object.entries(AUDIT_ACTION_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
      </div>
      {audit.loading && <Loading />}
      {audit.error && <ErrorAlert>{audit.error}</ErrorAlert>}
      {audit.data && audit.data.length === 0 && <EmptyState icon={History} title="Aucune entrée" />}
      {audit.data && audit.data.length > 0 && (
        <section className="panel panel-flush">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Utilisateur</th>
                  <th>Action</th>
                  <th>Entité</th>
                  <th>Changements</th>
                </tr>
              </thead>
              <tbody>
                {audit.data.map((row) => {
                  const changes = changedFields(row);
                  return (
                    <tr key={row.id}>
                      <td className="nowrap">{formatDateTime(row.created_at)}</td>
                      <td>{row.actor_id ? staffName(staff.data ?? [], row.actor_id) : 'Système'}</td>
                      <td><Badge tone={row.action === 'DELETE' ? 'danger' : row.action === 'INSERT' ? 'success' : 'info'}>{AUDIT_ACTION_LABELS[row.action]}</Badge></td>
                      <td>{AUDIT_ENTITY_LABELS[row.entity] ?? row.entity}</td>
                      <td>
                        {row.action === 'UPDATE' ? (
                          <ul className="diff-list">
                            {changes.slice(0, 6).map((c) => (
                              <li key={c.key}><code>{c.key}</code> : {short(c.before)} → {short(c.after)}</li>
                            ))}
                            {changes.length > 6 && <li className="dim">+{changes.length - 6} autre(s)</li>}
                          </ul>
                        ) : (
                          <span className="dim">{short((row.new_data ?? row.old_data)?.name ?? (row.new_data ?? row.old_data)?.reference ?? (row.new_data ?? row.old_data)?.title ?? row.entity_id)}</span>
                        )}
                      </td>
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

export default function AuditPage() {
  return (
    <RequirePermission permission={PERMISSIONS.AUDIT_VIEW}>
      <Audit />
    </RequirePermission>
  );
}
