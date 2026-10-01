import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Users } from 'lucide-react';
import { OWNER_STATUSES, OWNER_STATUS_LABELS, OWNER_STATUS_TONES, PERMISSIONS, hasPermission, personFullName } from '@darnalux/core';
import { useAuth } from '../../features/auth/AuthContext';
import { RequirePermission } from '../../features/auth/RequirePermission';
import { listOwners } from '../../features/owners/api';
import { useAsync } from '../../lib/useAsync';
import { Avatar, initialsOf } from '../../components/Avatar';
import { Badge, EmptyState, PageHeader, optionsFrom } from '../../components/ui';
import { ErrorAlert, Loading } from '../../components/Feedback';

function OwnersList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canManage = hasPermission(user, PERMISSIONS.OWNERS_MANAGE);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const owners = useAsync(() => listOwners(search, status), [search, status]);

  return (
    <div className="page-stack">
      <PageHeader
        title="Propriétaires"
        subtitle="Fiches propriétaires, biens associés et accès à l'espace propriétaire."
        actions={
          canManage && (
            <Link className="btn btn-primary" to="/app/owners/new">
              <Plus size={16} aria-hidden="true" /> Nouveau propriétaire
            </Link>
          )
        }
      />
      <div className="filters">
        <input type="search" placeholder="Nom, email, téléphone, ville…" aria-label="Rechercher" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select aria-label="Statut" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tous les statuts</option>
          {optionsFrom(OWNER_STATUSES, OWNER_STATUS_LABELS).map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      {owners.loading && <Loading />}
      {owners.error && <ErrorAlert>{owners.error}</ErrorAlert>}
      {owners.data && owners.data.length === 0 && <EmptyState icon={Users} title="Aucun propriétaire" />}
      {owners.data && owners.data.length > 0 && (
        <section className="panel panel-flush">
          <div className="panel-head">
            <h2>Liste des propriétaires</h2>
            <span className="panel-head-note">{owners.data.length} propriétaire(s)</span>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Propriétaire</th>
                  <th>Contact</th>
                  <th>Ville</th>
                  <th>Biens</th>
                  <th>Espace</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {owners.data.map((o) => (
                  <tr key={o.id} className="row-link" onClick={() => navigate(`/app/owners/${o.id}`)}>
                    <td>
                      <Link className="person" to={`/app/owners/${o.id}`} onClick={(e) => e.stopPropagation()}>
                        <Avatar initials={initialsOf(o.first_name, o.last_name)} />
                        <span>{personFullName(o.first_name, o.last_name)}</span>
                      </Link>
                    </td>
                    <td>
                      {o.email ?? '—'}
                      <small className="dim cell-sub">{o.phone ?? ''}</small>
                    </td>
                    <td>{o.city ?? '—'}</td>
                    <td>{o.property_owners.length}</td>
                    <td>{o.profile_id ? <Badge tone="success">Activé</Badge> : <Badge>Non lié</Badge>}</td>
                    <td><Badge tone={OWNER_STATUS_TONES[o.status]}>{OWNER_STATUS_LABELS[o.status]}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

export default function OwnersListPage() {
  return (
    <RequirePermission permission={PERMISSIONS.OWNERS_VIEW}>
      <OwnersList />
    </RequirePermission>
  );
}
