import type { ReactNode } from 'react';
import type { PermissionCode } from '@darnalux/core';
import { hasPermission } from '@darnalux/core';
import { useAuth } from './AuthContext';

interface RequirePermissionProps {
  permission: PermissionCode;
  children: ReactNode;
  fallback?: ReactNode;
}

export function RequirePermission({ permission, children, fallback }: RequirePermissionProps) {
  const { user } = useAuth();
  if (!hasPermission(user, permission)) {
    return <>{fallback ?? <p className="forbidden">Vous n'avez pas accès à cette section.</p>}</>;
  }
  return <>{children}</>;
}
