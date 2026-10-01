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
  OWNERS_VIEW: 'owners.view',
  OWNERS_MANAGE: 'owners.manage',
  PROPERTIES_VIEW: 'properties.view',
  PROPERTIES_MANAGE: 'properties.manage',
  PROPERTIES_ACCESS_VIEW: 'properties.access.view',
  RESERVATIONS_VIEW: 'reservations.view',
  RESERVATIONS_MANAGE: 'reservations.manage',
  GUESTS_VIEW: 'guests.view',
  GUESTS_MANAGE: 'guests.manage',
  GUESTS_BLACKLIST: 'guests.blacklist',
  TASKS_VIEW: 'tasks.view',
  TASKS_MANAGE: 'tasks.manage',
  TASKS_EXECUTE: 'tasks.execute',
  CHECKINS_VIEW: 'checkins.view',
  CHECKINS_MANAGE: 'checkins.manage',
  CONTRACTS_MANAGE: 'contracts.manage',
  FINANCE_VIEW: 'finance.view',
  FINANCE_MANAGE: 'finance.manage',
  DOCUMENTS_VIEW: 'documents.view',
  DOCUMENTS_MANAGE: 'documents.manage',
  MARKETING_VIEW: 'marketing.view',
  MARKETING_MANAGE: 'marketing.manage',
  REPORTS_VIEW: 'reports.view',
  REPORTS_EXPORT: 'reports.export',
  IMPORT_RUN: 'import.run',
  SETTINGS_MANAGE: 'settings.manage',
  AUDIT_VIEW: 'audit.view',
  SUPPORT_MANAGE: 'support.manage',
  OWNER_PORTAL: 'owner_portal.view',
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
