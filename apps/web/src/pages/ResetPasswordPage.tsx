import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { PasswordResetError } from '@darnalux/core';
import { updatePassword } from '../features/auth/authApi';
import { AuthShell } from '../features/auth/AuthShell';
import { PasswordField } from '../components/PasswordField';
import { ErrorAlert } from '../components/Feedback';

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
    <AuthShell title="Nouveau mot de passe" subtitle="Choisissez un nouveau mot de passe pour votre compte.">
      <form className="form-stack" onSubmit={handleSubmit}>
        {error && <ErrorAlert>{error}</ErrorAlert>}

        <PasswordField
          id="password"
          label="Nouveau mot de passe"
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
        />
        <PasswordField
          id="confirmPassword"
          label="Confirmer le mot de passe"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={setConfirmPassword}
        />

        <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={submitting}>
          {submitting ? 'Enregistrement…' : 'Réinitialiser le mot de passe'}
        </button>
      </form>
    </AuthShell>
  );
}
