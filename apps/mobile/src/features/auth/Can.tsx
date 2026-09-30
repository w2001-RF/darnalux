import type { ReactNode } from 'react';
import { hasAnyPermission } from '@darnalux/core';
import { useAuth } from './AuthContext';

// UX-only gate. PostgreSQL RLS remains the real security boundary.
export function Can({ anyOf, children }: { anyOf: string[]; children: ReactNode }) {
  const { user } = useAuth();
  return hasAnyPermission(user, anyOf) ? <>{children}</> : null;
}
