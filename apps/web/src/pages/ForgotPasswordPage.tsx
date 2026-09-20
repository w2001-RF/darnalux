import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { requestPasswordReset } from '../features/auth/authApi';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await requestPasswordReset(email);
    } finally {
      // Always show a generic confirmation, whether or not the email exists,
      // to avoid leaking account existence.
      setSubmitting(false);
      setSent(true);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <Link to="/" className="brand"><span className="brand-mark">D</span><span>Darna<span>Lux</span></span></Link>
        <h1>Mot de passe oublié</h1>
        <p className="auth-subtitle">Recevez un lien de réinitialisation par email.</p>

        {sent ? (
          <div className="auth-info">
            Si un compte existe pour cet email, un lien de réinitialisation vient d'être envoyé.
          </div>
        ) : (
          <>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button className="primary" type="submit" disabled={submitting}>
              {submitting ? 'Envoi…' : 'Envoyer le lien'}
            </button>
          </>
        )}

        <Link className="secondary" to="/login">Retour à la connexion</Link>
      </form>
    </div>
  );
}
