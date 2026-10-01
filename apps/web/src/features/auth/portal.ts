import type { AuthorizationContext } from '@darnalux/core';
import { PERMISSIONS, hasPermission } from '@darnalux/core';

// Owner-portal users read their own data through RLS ownership checks; screens
// then hide staff-only data (guests, internal notes, check-in documents).
export function isPortalUser(user: AuthorizationContext | null | undefined): boolean {
  return hasPermission(user, PERMISSIONS.OWNER_PORTAL) && !hasPermission(user, PERMISSIONS.PROPERTIES_VIEW);
}
