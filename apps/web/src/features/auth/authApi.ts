import type { AuthUser, ProfileRow } from '@darnalux/core';
import { AuthNetworkError, InvalidCredentialsError, PasswordResetError, toAuthUser } from '@darnalux/core';
import { supabase } from '../../lib/supabaseClient';
import { appUrl } from '../../lib/appRoot';

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
    redirectTo: appUrl('reset-password'),
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

  const roles = (rolesResult.data ?? []) as { code: string }[];
  const permissions = (permissionsResult.data ?? []) as { code: string }[];

  return toAuthUser(
    userId,
    email,
    profileResult.data,
    roles.map((r) => r.code),
    permissions.map((p) => p.code),
  );
}
