import { useEffect, useState } from 'react';
import { PERMISSIONS } from '@darnalux/core';
import { supabase } from '../lib/supabaseClient';
import { RequirePermission } from '../features/auth/RequirePermission';

interface RoleWithPermissions {
  id: string;
  code: string;
  name: string;
  role_permissions: { permissions: { code: string; name: string } | null }[];
}

function RolesListContent() {
  const [roles, setRoles] = useState<RoleWithPermissions[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data, error: queryError } = await supabase
        .from('roles')
        .select('id, code, name, role_permissions(permissions(code, name))')
        .order('code')
        .returns<RoleWithPermissions[]>();
      if (cancelled) return;
      if (queryError) {
        setError('Impossible de charger les rôles.');
      } else {
        setRoles(data ?? []);
      }
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <p>Chargement des rôles…</p>;
  if (error) return <p className="auth-error">{error}</p>;

  return (
    <div className="panel">
      <div className="panel-head"><h2>Rôles</h2></div>
      <p className="auth-info">
        Lecture seule pour cette phase : la gestion complète des permissions par rôle sera ouverte ultérieurement.
      </p>
      {roles.map((role) => (
        <div className="role-card" key={role.id}>
          <b>{role.name}</b>
          <span>{role.role_permissions.map((rp) => rp.permissions?.name).filter(Boolean).join(', ') || 'Aucune permission'}</span>
        </div>
      ))}
    </div>
  );
}

export default function RolesListPage() {
  return (
    <RequirePermission permission={PERMISSIONS.ROLES_VIEW}>
      <RolesListContent />
    </RequirePermission>
  );
}
