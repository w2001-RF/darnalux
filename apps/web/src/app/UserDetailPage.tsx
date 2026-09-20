import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { PERMISSIONS, hasPermission } from '@darnalux/core';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../features/auth/AuthContext';
import { RequirePermission } from '../features/auth/RequirePermission';

interface ProfileDetail {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  is_active: boolean;
}

interface RoleOption {
  id: string;
  code: string;
  name: string;
}

function UserDetailContent() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const canUpdate = hasPermission(user, PERMISSIONS.USERS_UPDATE);
  const isSelf = id === user?.id;

  const [profile, setProfile] = useState<ProfileDetail | null>(null);
  const [assignedRoleIds, setAssignedRoleIds] = useState<string[]>([]);
  const [allRoles, setAllRoles] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      const [profileResult, userRolesResult, rolesResult] = await Promise.all([
        supabase.from('profiles').select('id, first_name, last_name, phone, is_active').eq('id', id).single<ProfileDetail>(),
        supabase.from('user_roles').select('role_id').eq('user_id', id),
        canUpdate ? supabase.from('roles').select('id, code, name') : Promise.resolve({ data: [], error: null }),
      ]);
      if (cancelled) return;

      if (profileResult.error) {
        setError("Impossible de charger cet utilisateur.");
      } else {
        setProfile(profileResult.data);
        setAssignedRoleIds((userRolesResult.data ?? []).map((r: { role_id: string }) => r.role_id));
        setAllRoles((rolesResult.data ?? []) as RoleOption[]);
      }
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id, canUpdate]);

  async function toggleRole(roleId: string, assigned: boolean) {
    if (!id || !canUpdate || isSelf) return;
    if (assigned) {
      await supabase.from('user_roles').delete().eq('user_id', id).eq('role_id', roleId);
      setAssignedRoleIds((prev) => prev.filter((r) => r !== roleId));
    } else {
      await supabase.from('user_roles').insert({ user_id: id, role_id: roleId });
      setAssignedRoleIds((prev) => [...prev, roleId]);
    }
  }

  if (loading) return <p>Chargement…</p>;
  if (error || !profile) return <p className="auth-error">{error ?? 'Utilisateur introuvable.'}</p>;

  return (
    <div className="panel">
      <div className="panel-head"><h2>{profile.first_name ?? ''} {profile.last_name ?? ''}</h2></div>
      <p>Téléphone : {profile.phone ?? '—'}</p>
      <p>Statut : {profile.is_active ? 'Actif' : 'Désactivé'}</p>

      <h3>Rôles</h3>
      {isSelf && canUpdate && (
        <p className="auth-info">Vous ne pouvez pas modifier vos propres rôles.</p>
      )}
      {canUpdate ? (
        <ul className="role-checklist">
          {allRoles.map((role) => (
            <li key={role.id}>
              <label>
                <input
                  type="checkbox"
                  checked={assignedRoleIds.includes(role.id)}
                  disabled={isSelf}
                  onChange={() => toggleRole(role.id, assignedRoleIds.includes(role.id))}
                />
                {role.name}
              </label>
            </li>
          ))}
        </ul>
      ) : (
        <p>Consultez un administrateur pour modifier les rôles.</p>
      )}
    </div>
  );
}

export default function UserDetailPage() {
  return (
    <RequirePermission permission={PERMISSIONS.USERS_VIEW}>
      <UserDetailContent />
    </RequirePermission>
  );
}
