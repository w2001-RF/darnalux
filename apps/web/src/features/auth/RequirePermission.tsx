import type { ReactNode } from 'react';
import type { PermissionCode } from '@darnalux/core';
import { hasPermission } from '@darnalux/core';
import { useAuth } from './AuthContext';
import { ErrorAlert } from '../../components/Feedback';

interface RequirePermissionProps {
  permission: PermissionCode;
  children: ReactNode;
  fallback?: ReactNode;
}

export function RequirePermission({ permission, children, fallback }: RequirePermissionProps) {
  const { user } = useAuth();
  if (!hasPermission(user, permission)) {
    return <>{fallback ?? <ErrorAlert>Vous n'avez pas accès à cette section.</ErrorAlert>}</>;
  }
  return <>{children}</>;
}
