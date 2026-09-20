import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PasswordResetError } from '@darnalux/core';
import { updatePassword } from '../features/auth/authApi';

const MIN_PASSWORD_LENGTH = 8;

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`);
      return;
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setSubmitting(true);
    try {
      await updatePassword(password);
      navigate('/login', { replace: true });
    } catch (err) {
      setError(
        err instanceof PasswordResetError
          ? 'Impossible de réinitialiser le mot de passe. Le lien a peut-être expiré.'
          : 'Une erreur est survenue. Réessayez.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <Link to="/" className="brand"><span className="brand-mark">D</span><span>Darna<span>Lux</span></span></Link>
        <h1>Nouveau mot de passe</h1>
        <p className="auth-subtitle">Choisissez un nouveau mot de passe pour votre compte.</p>

        {error && <div className="auth-error">{error}</div>}

        <label htmlFor="password">Nouveau mot de passe</label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <label htmlFor="confirmPassword">Confirmer le mot de passe</label>
        <input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        <button className="primary" type="submit" disabled={submitting}>
          {submitting ? 'Enregistrement…' : 'Réinitialiser le mot de passe'}
        </button>
      </form>
    </div>
  );
}
