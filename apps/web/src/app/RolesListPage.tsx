import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { PERMISSIONS } from '@darnalux/core';
import { supabase } from '../lib/supabaseClient';
import { RequirePermission } from '../features/auth/RequirePermission';
import { ErrorAlert, InfoAlert, Loading } from '../components/Feedback';

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

  if (loading) return <Loading label="Chargement des rôles…" />;
  if (error) return <ErrorAlert>{error}</ErrorAlert>;

  return (
    <div className="page-stack">
      <InfoAlert>
        Lecture seule pour cette phase : la gestion complète des permissions par rôle sera ouverte ultérieurement.
      </InfoAlert>
      <div className="role-grid">
        {roles.map((role) => {
          const permissionNames = role.role_permissions
            .map((rp) => rp.permissions?.name)
            .filter((n): n is string => Boolean(n));
          return (
            <article className="role-card" key={role.id}>
              <div className="role-card-head">
                <span className="role-card-icon"><ShieldCheck size={20} aria-hidden="true" /></span>
                <div>
                  <h3>{role.name}</h3>
                  <small>{permissionNames.length} {permissionNames.length > 1 ? 'permissions' : 'permission'}</small>
                </div>
              </div>
              {permissionNames.length > 0 ? (
                <div className="chips">
                  {permissionNames.map((name) => <span className="chip" key={name}>{name}</span>)}
                </div>
              ) : (
                <span className="dim">Aucune permission</span>
              )}
            </article>
          );
        })}
      </div>
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
