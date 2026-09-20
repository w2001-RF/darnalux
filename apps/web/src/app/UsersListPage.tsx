import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PERMISSIONS, hasPermission } from '@darnalux/core';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../features/auth/AuthContext';
import { RequirePermission } from '../features/auth/RequirePermission';

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

  if (loading) return <p>Chargement des utilisateurs…</p>;
  if (error) return <p className="auth-error">{error}</p>;

  return (
    <div className="panel">
      <div className="panel-head"><h2>Utilisateurs</h2></div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Nom</th>
            <th>Rôles</th>
            <th>Statut</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td><Link to={`/app/users/${row.id}`}>{row.first_name ?? ''} {row.last_name ?? ''}</Link></td>
              <td>{row.user_roles.map((ur) => ur.roles?.name).filter(Boolean).join(', ') || '—'}</td>
              <td>{row.is_active ? 'Actif' : 'Désactivé'}</td>
              <td>
                {canUpdate && (
                  <button type="button" className="secondary" onClick={() => toggleActive(row)}>
                    {row.is_active ? 'Désactiver' : 'Activer'}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function UsersListPage() {
  return (
    <RequirePermission permission={PERMISSIONS.USERS_VIEW}>
      <UsersListContent />
    </RequirePermission>
  );
}
