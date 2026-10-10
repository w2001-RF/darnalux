import type { ReactNode } from 'react';
import { hasAnyPermission } from '@darnalux/core';
import { Screen } from '../../components/Screen';
import { Empty } from '../../components/ui';
import { useAuth } from './AuthContext';

// UX-only route guard. PostgreSQL RLS remains the real security boundary.
export function Guard({ anyOf, children }: { anyOf: string[]; children: ReactNode }) {
  const { user } = useAuth();
  if (hasAnyPermission(user, anyOf)) return <>{children}</>;
  return (
    <Screen centered insetBottom>
      <Empty title="Accès refusé" text="Votre rôle ne permet pas de consulter cette page." />
    </Screen>
  );
}
