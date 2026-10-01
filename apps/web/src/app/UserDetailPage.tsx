import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PERMISSIONS, hasPermission } from '@darnalux/core';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../features/auth/AuthContext';
import { RequirePermission } from '../features/auth/RequirePermission';
import { Avatar, initialsOf } from '../components/Avatar';
import { ErrorAlert, InfoAlert, Loading } from '../components/Feedback';

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

  const backLink = (
    <Link className="back-link" to="/app/users"><ArrowLeft size={16} aria-hidden="true" /> Retour aux utilisateurs</Link>
  );

  if (loading) return <Loading />;
  if (error || !profile) {
    return (
      <div>
        {backLink}
        <ErrorAlert>{error ?? 'Utilisateur introuvable.'}</ErrorAlert>
      </div>
    );
  }

  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Sans nom';

  return (
    <div>
      {backLink}
      <section className="panel">
        <div className="profile-head">
          <Avatar large initials={initialsOf(profile.first_name, profile.last_name)} />
          <div>
            <h2>{fullName}</h2>
            <span className={'badge ' + (profile.is_active ? 'badge-success' : 'badge-muted')}>
              {profile.is_active ? 'Actif' : 'Désactivé'}
            </span>
          </div>
        </div>

        <dl className="facts">
          <div><dt>Téléphone</dt><dd>{profile.phone ?? '—'}</dd></div>
          <div><dt>Statut</dt><dd>{profile.is_active ? 'Actif' : 'Désactivé'}</dd></div>
        </dl>

        <h3 className="section-title">Rôles</h3>
        {isSelf && canUpdate && (
          <div className="page-stack">
            <InfoAlert>Vous ne pouvez pas modifier vos propres rôles.</InfoAlert>
          </div>
        )}
        {canUpdate ? (
          <ul className="role-checklist">
            {allRoles.map((role) => (
              <li key={role.id}>
                <label className="role-option">
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
          <p className="dim">Consultez un administrateur pour modifier les rôles.</p>
        )}
      </section>
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
