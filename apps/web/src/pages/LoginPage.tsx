import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Location } from 'react-router-dom';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { AuthNetworkError, InvalidCredentialsError } from '@darnalux/core';
import { useAuth } from '../features/auth/AuthContext';
import { signInWithPassword } from '../features/auth/authApi';

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
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <Link to="/" className="brand"><span className="brand-mark">D</span><span>Darna<span>Lux</span></span></Link>
        <h1>Connexion</h1>
        <p className="auth-subtitle">Accédez à votre espace DarnaLux.</p>

        {sessionError && <div className="auth-error">{sessionError}</div>}
        {formError && <div className="auth-error">{formError}</div>}

        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label htmlFor="password">Mot de passe</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button className="primary" type="submit" disabled={submitting}>
          {submitting ? 'Connexion…' : 'Se connecter'}
        </button>

        <Link className="secondary" to="/forgot-password">Mot de passe oublié ?</Link>
      </form>
    </div>
  );
}
