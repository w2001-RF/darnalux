import { useState } from 'react';
import type { FormEvent } from 'react';
import { isBlank, isPhone } from '@darnalux/core';
import { useAuth } from '../../features/auth/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { toUserMessage } from '../../lib/errors';
import { PasswordField } from '../../components/PasswordField';
import { Facts, PageHeader, Section, TextField } from '../../components/ui';
import { ErrorAlert, InfoAlert } from '../../components/Feedback';

const MIN_PASSWORD_LENGTH = 8;

export default function ProfilePage() {
  const { user } = useAuth();
  const [firstName, setFirstName] = useState(user?.profile?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.profile?.lastName ?? '');
  const [phone, setPhone] = useState(user?.profile?.phone ?? '');
  const [profileMessage, setProfileMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [passwordMessage, setPasswordMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    if (!isBlank(phone) && !isPhone(phone)) {
      setProfileMessage({ ok: false, text: 'Numéro de téléphone invalide.' });
      return;
    }
    const { error } = await supabase
      .from('profiles')
      .update({ first_name: firstName.trim() || null, last_name: lastName.trim() || null, phone: phone.trim() || null })
      .eq('id', user.id);
    setProfileMessage(error ? { ok: false, text: toUserMessage(error) } : { ok: true, text: 'Profil enregistré. Il sera actualisé à la prochaine connexion.' });
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordMessage(null);
    if (next.length < MIN_PASSWORD_LENGTH) {
      setPasswordMessage({ ok: false, text: `Le nouveau mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.` });
      return;
    }
    if (next !== confirm) {
      setPasswordMessage({ ok: false, text: 'Les mots de passe ne correspondent pas.' });
      return;
    }
    if (!user?.email) return;
    // Re-authenticate first so a forgotten open session cannot change the password.
    const reauth = await supabase.auth.signInWithPassword({ email: user.email, password: current });
    if (reauth.error) {
      setPasswordMessage({ ok: false, text: 'Mot de passe actuel incorrect.' });
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: next });
    if (error) {
      setPasswordMessage({ ok: false, text: 'Impossible de changer le mot de passe.' });
      return;
    }
    setCurrent('');
    setNext('');
    setConfirm('');
    setPasswordMessage({ ok: true, text: 'Mot de passe modifié.' });
  }

  return (
    <div className="page-stack">
      <PageHeader title="Mon profil" />
      <div className="app-grid">
        <form onSubmit={saveProfile}>
          <Section title="Informations du profil">
            <Facts items={[{ label: 'Email', value: user?.email ?? '—' }, { label: 'Rôles', value: user?.roles.join(', ') || '—' }]} />
            <div className="form-grid">
              <TextField label="Prénom" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              <TextField label="Nom" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              <TextField label="Téléphone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            {profileMessage && (profileMessage.ok ? <InfoAlert>{profileMessage.text}</InfoAlert> : <ErrorAlert>{profileMessage.text}</ErrorAlert>)}
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">Sauvegarder</button>
            </div>
          </Section>
        </form>
        <form onSubmit={changePassword}>
          <Section title="Changer le mot de passe">
            <PasswordField id="current-password" label="Mot de passe actuel" autoComplete="current-password" value={current} onChange={setCurrent} />
            <PasswordField id="new-password" label="Nouveau mot de passe" autoComplete="new-password" value={next} onChange={setNext} />
            <PasswordField id="confirm-password" label="Confirmer le nouveau mot de passe" autoComplete="new-password" value={confirm} onChange={setConfirm} />
            {passwordMessage && (passwordMessage.ok ? <InfoAlert>{passwordMessage.text}</InfoAlert> : <ErrorAlert>{passwordMessage.text}</ErrorAlert>)}
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">Changer le mot de passe</button>
            </div>
          </Section>
        </form>
      </div>
    </div>
  );
}
