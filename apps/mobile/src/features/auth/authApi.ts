import type { AuthUser, ProfileRow } from '@darnalux/core';
import { AuthNetworkError, InvalidCredentialsError, toAuthUser } from '@darnalux/core';
import { supabase } from '../../lib/supabase';

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

// Same queries as the Web client: profile row plus my_roles()/my_permissions() RPCs.
// Authorization data never comes from user-editable user_metadata.
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
