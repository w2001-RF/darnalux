import type { AuthorizationContext, PermissionCode, UserRole } from './types';

// Pure, framework-independent authorization helpers.
// These are UX/routing guards only: PostgreSQL RLS is the real security
// boundary and re-implements the same rules server-side.

function isUsable(context: AuthorizationContext | null | undefined): context is AuthorizationContext {
  return !!context && context.isActive;
}

export function hasPermission(
  context: AuthorizationContext | null | undefined,
  permission: PermissionCode,
): boolean {
  if (!isUsable(context)) return false;
  return context.permissions.includes(permission);
}

export function hasAnyPermission(
  context: AuthorizationContext | null | undefined,
  permissions: PermissionCode[],
): boolean {
  if (!isUsable(context)) return false;
  return permissions.some((permission) => context.permissions.includes(permission));
}

export function hasAllPermissions(
  context: AuthorizationContext | null | undefined,
  permissions: PermissionCode[],
): boolean {
  if (!isUsable(context)) return false;
  return permissions.every((permission) => context.permissions.includes(permission));
}

export function hasRole(
  context: AuthorizationContext | null | undefined,
  role: UserRole,
): boolean {
  if (!isUsable(context)) return false;
  return context.roles.includes(role);
}
