import type { AuthUser, PermissionCode, UserRole } from '@darnalux/core';
import { AuthNetworkError, InvalidCredentialsError, PasswordResetError } from '@darnalux/core';
import { supabase } from '../../lib/supabaseClient';

interface ProfileRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
}

export async function signInWithPassword(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (!error) return;
  if (error.status === 400 || /invalid/i.test(error.message)) {
    throw new InvalidCredentialsError();
  }
  throw new AuthNetworkError();
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export async function requestPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}reset-password`,
  });
  if (error) throw new PasswordResetError();
}

export async function updatePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new PasswordResetError();
}

// Loads the current user's profile + roles + permissions. Roles/permissions
// are read through the my_roles()/my_permissions() SECURITY DEFINER RPCs
// (see supabase/migrations) rather than joined tables, so the Web client
// never needs direct RLS-sensitive access to role_permissions.
export async function loadAuthUser(userId: string, email: string | null): Promise<AuthUser> {
  const [profileResult, rolesResult, permissionsResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, first_name, last_name, phone, avatar_url, is_active')
      .eq('id', userId)
      .single<ProfileRow>(),
    supabase.rpc('my_roles'),
    supabase.rpc('my_permissions'),
  ]);

  if (profileResult.error) throw profileResult.error;
  if (rolesResult.error) throw rolesResult.error;
  if (permissionsResult.error) throw permissionsResult.error;

  const row = profileResult.data;
  const roles = (rolesResult.data ?? []) as { code: string }[];
  const permissions = (permissionsResult.data ?? []) as { code: string }[];

  return {
    id: userId,
    email,
    isActive: row.is_active,
    roles: roles.map((r) => r.code) as UserRole[],
    permissions: permissions.map((p) => p.code) as PermissionCode[],
    profile: {
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      phone: row.phone,
      avatarUrl: row.avatar_url,
      isActive: row.is_active,
    },
  };
}
