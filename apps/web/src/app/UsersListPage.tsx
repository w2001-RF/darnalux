import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PERMISSIONS, hasPermission } from '@darnalux/core';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../features/auth/AuthContext';
import { RequirePermission } from '../features/auth/RequirePermission';
import { Avatar, initialsOf } from '../components/Avatar';
import { ErrorAlert, Loading } from '../components/Feedback';

interface UserRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  is_active: boolean;
  user_roles: { roles: { code: string; name: string } | null }[];
}

function UsersListContent() {
  const { user } = useAuth();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canUpdate = hasPermission(user, PERMISSIONS.USERS_UPDATE);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const { data, error: queryError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, is_active, user_roles(roles(code, name))')
        .order('created_at', { ascending: false })
        .returns<UserRow[]>();
      if (cancelled) return;
      if (queryError) {
        setError("Impossible de charger la liste des utilisateurs.");
      } else {
        setRows(data ?? []);
      }
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggleActive(row: UserRow) {
    if (!canUpdate) return;
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ is_active: !row.is_active })
      .eq('id', row.id);
    if (!updateError) {
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, is_active: !r.is_active } : r)));
    }
  }

  if (loading) return <Loading label="Chargement des utilisateurs…" />;
  if (error) return <ErrorAlert>{error}</ErrorAlert>;

  return (
    <section className="panel panel-flush">
      <div className="panel-head">
        <h2>Utilisateurs</h2>
        <span className="panel-head-note">{rows.length} {rows.length > 1 ? 'comptes' : 'compte'}</span>
      </div>
      {rows.length === 0 ? (
        <p className="empty">Aucun utilisateur pour le moment.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Rôles</th>
                <th>Statut</th>
                <th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const fullName = [row.first_name, row.last_name].filter(Boolean).join(' ');
                const roleNames = row.user_roles.map((ur) => ur.roles?.name).filter((n): n is string => Boolean(n));
                return (
                  <tr key={row.id}>
                    <td>
                      <Link className="person" to={`/app/users/${row.id}`}>
                        <Avatar initials={initialsOf(row.first_name, row.last_name)} />
                        <span>{fullName || 'Sans nom'}</span>
                      </Link>
                    </td>
                    <td>
                      {roleNames.length > 0 ? (
                        <div className="chips">
                          {roleNames.map((name) => <span className="chip" key={name}>{name}</span>)}
                        </div>
                      ) : (
                        <span className="dim">—</span>
                      )}
                    </td>
                    <td>
                      <span className={'badge ' + (row.is_active ? 'badge-success' : 'badge-muted')}>
                        {row.is_active ? 'Actif' : 'Désactivé'}
                      </span>
                    </td>
                    <td className="cell-actions">
                      {canUpdate && (
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => toggleActive(row)}>
                          {row.is_active ? 'Désactiver' : 'Activer'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function UsersListPage() {
  return (
    <RequirePermission permission={PERMISSIONS.USERS_VIEW}>
      <UsersListContent />
    </RequirePermission>
  );
}
