import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Location } from 'react-router-dom';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { AuthNetworkError, InvalidCredentialsError } from '@darnalux/core';
import { useAuth } from '../features/auth/AuthContext';
import { signInWithPassword } from '../features/auth/authApi';
import { AuthShell } from '../features/auth/AuthShell';
import { PasswordField } from '../components/PasswordField';
import { ErrorAlert } from '../components/Feedback';

export default function LoginPage() {
  const { status, error: sessionError } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (status === 'signed-in') {
    const from = (location.state as { from?: Location } | null)?.from;
    const redirectTo = from ? `${from.pathname}${from.search}${from.hash}` : '/app';
    return <Navigate to={redirectTo} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await signInWithPassword(email, password);
    } catch (err) {
      if (err instanceof InvalidCredentialsError) {
        setFormError('Email ou mot de passe incorrect.');
      } else if (err instanceof AuthNetworkError) {
        setFormError('Une erreur réseau est survenue. Réessayez.');
      } else {
        setFormError('Une erreur est survenue. Réessayez.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell title="Connexion" subtitle="Accédez à votre espace DarnaLux.">
      <form className="form-stack" onSubmit={handleSubmit}>
        {sessionError && <ErrorAlert>{sessionError}</ErrorAlert>}
        {formError && <ErrorAlert>{formError}</ErrorAlert>}

        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <PasswordField
          id="password"
          label="Mot de passe"
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
        />

        <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={submitting}>
          {submitting ? 'Connexion…' : 'Se connecter'}
        </button>

        <div className="auth-links">
          <Link className="btn btn-link btn-sm" to="/forgot-password">Mot de passe oublié ?</Link>
        </div>
      </form>
    </AuthShell>
  );
}
