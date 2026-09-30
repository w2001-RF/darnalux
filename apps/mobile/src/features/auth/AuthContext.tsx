import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { AuthUser } from '@darnalux/core';
import { supabase } from '../../lib/supabase';
import { loadAuthUser, signInWithPassword, signOut as signOutRequest } from './authApi';

type AuthStatus = 'loading' | 'signed-out' | 'signed-in';

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function hydrate(userId: string | undefined, email: string | null | undefined) {
      if (!userId) {
        if (isMounted) {
          setUser(null);
          setStatus('signed-out');
        }
        return;
      }

      try {
        const authUser = await loadAuthUser(userId, email ?? null);
        if (!isMounted) return;

        if (!authUser.isActive) {
          await supabase.auth.signOut();
          setUser(null);
          setError('Ce compte a été désactivé. Contactez un administrateur DarnaLux.');
          setStatus('signed-out');
          return;
        }

        setUser(authUser);
        setError(null);
        setStatus('signed-in');
      } catch {
        if (!isMounted) return;
        setUser(null);
        setError('Impossible de charger votre profil. Réessayez plus tard.');
        setStatus('signed-out');
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      hydrate(data.session?.user.id, data.session?.user.email);
    });

    // Defer Supabase calls out of this callback to avoid deadlocking the auth client.
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => hydrate(session?.user.id, session?.user.email), 0);
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null);
    await signInWithPassword(email, password);
  }, []);

  const signOut = useCallback(async () => {
    await signOutRequest();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, error, signIn, signOut }),
    [status, user, error, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
