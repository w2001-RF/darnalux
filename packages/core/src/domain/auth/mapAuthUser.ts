import type { AuthUser, PermissionCode, UserRole } from './types';

// Raw `profiles` row as returned by the data layer (snake_case).
export interface ProfileRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
}

// Pure mapping shared by Web and Mobile adapters. Roles and permissions must
// come from the my_roles()/my_permissions() RPCs, never from user_metadata.
export function toAuthUser(
  userId: string,
  email: string | null,
  row: ProfileRow,
  roleCodes: readonly string[],
  permissionCodes: readonly string[],
): AuthUser {
  return {
    id: userId,
    email,
    isActive: row.is_active,
    roles: [...roleCodes] as UserRole[],
    permissions: [...permissionCodes] as PermissionCode[],
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
