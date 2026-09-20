// Phase 1 role/permission/profile domain types.
// Framework-independent: no React/React Native/Supabase/browser imports.

export type UserRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'MANAGER'
  | 'AGENT'
  | 'TEAM_MEMBER'
  | 'OWNER';

// Permission codes are data-driven (stored in the `permissions` table), so the
// type stays an extensible string. PERMISSIONS below documents the Phase 1
// known codes for autocompletion/type-safety at call sites.
export type PermissionCode = string;

export const PERMISSIONS = {
  DASHBOARD_VIEW: 'dashboard.view',
  USERS_VIEW: 'users.view',
  USERS_CREATE: 'users.create',
  USERS_UPDATE: 'users.update',
  USERS_DISABLE: 'users.disable',
  ROLES_VIEW: 'roles.view',
  ROLES_MANAGE: 'roles.manage',
  PERMISSIONS_VIEW: 'permissions.view',
  PERMISSIONS_MANAGE: 'permissions.manage',
  PROFILE_VIEW: 'profile.view',
  PROFILE_UPDATE: 'profile.update',
} as const;

export type KnownPermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export interface UserProfile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  avatarUrl: string | null;
  isActive: boolean;
}

// Minimal shape needed to evaluate authorization (see permissions.ts).
export interface AuthorizationContext {
  isActive: boolean;
  roles: UserRole[];
  permissions: PermissionCode[];
}

export interface AuthUser extends AuthorizationContext {
  id: string;
  email: string | null;
  profile: UserProfile | null;
}
