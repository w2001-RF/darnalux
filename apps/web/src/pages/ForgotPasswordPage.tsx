import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { requestPasswordReset } from '../features/auth/authApi';
import { AuthShell } from '../features/auth/AuthShell';
import { InfoAlert } from '../components/Feedback';

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
    <AuthShell title="Mot de passe oublié" subtitle="Recevez un lien de réinitialisation par email.">
      <form className="form-stack" onSubmit={handleSubmit}>
        {sent ? (
          <InfoAlert>
            Si un compte existe pour cet email, un lien de réinitialisation vient d'être envoyé.
          </InfoAlert>
        ) : (
          <>
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
            <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={submitting}>
              {submitting ? 'Envoi…' : 'Envoyer le lien'}
            </button>
          </>
        )}

        <div className="auth-links">
          <Link className="btn btn-link btn-sm" to="/login"><ArrowLeft size={16} aria-hidden="true" /> Retour à la connexion</Link>
        </div>
      </form>
    </AuthShell>
  );
}
