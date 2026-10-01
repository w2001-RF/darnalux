import type { ReactNode } from 'react';
import type { PermissionCode } from '@darnalux/core';
import { hasAnyPermission } from '@darnalux/core';
import { useAuth } from './AuthContext';
import { ErrorAlert } from '../../components/Feedback';

interface RequirePermissionProps {
  permission?: PermissionCode;
  anyOf?: PermissionCode[];
  children: ReactNode;
  fallback?: ReactNode;
}

export function RequirePermission({ permission, anyOf, children, fallback }: RequirePermissionProps) {
  const { user } = useAuth();
  const required = anyOf ?? (permission ? [permission] : []);
  if (required.length > 0 && !hasAnyPermission(user, required)) {
    return <>{fallback ?? <ErrorAlert>Vous n'avez pas accès à cette section.</ErrorAlert>}</>;
  }
  return <>{children}</>;
}
