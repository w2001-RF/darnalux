import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Camera, FileSignature, IdCard } from 'lucide-react';
import type { CheckinSettings } from '@darnalux/core';
import { CHECKIN_STEP_LABELS, DEFAULT_CHECKIN_SETTINGS, PERMISSIONS, checkinImpact, checkinSteps } from '@darnalux/core';
import { RequirePermission } from '../../features/auth/RequirePermission';
import { getCheckinSettings, saveCheckinSettings } from '../../features/checkins/api';
import { useAsync } from '../../lib/useAsync';
import { toUserMessage } from '../../lib/errors';
import { PageHeader, Section, TextAreaField, Toggle } from '../../components/ui';
import { ErrorAlert, Loading } from '../../components/Feedback';

function StepCard({
  icon: Icon,
  title,
  subtitle,
  checked,
  onChange,
  why,
  whyNot,
  children,
}: {
  icon: typeof IdCard;
  title: string;
  subtitle: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  why: string;
  whyNot: string;
  children?: ReactNode;
}) {
  return (
    <section className="panel step-card">
      <div className="step-card-head">
        <span className="role-card-icon"><Icon size={20} aria-hidden="true" /></span>
        <div className="step-card-title">
          <Toggle label={title} description={subtitle} checked={checked} onChange={onChange} />
        </div>
      </div>
      <div className="pros-cons">
        <p className="pro"><strong>Pourquoi activer :</strong> {why}</p>
        <p className="con"><strong>Pourquoi désactiver :</strong> {whyNot}</p>
      </div>
      {children}
    </section>
  );
}

function VerificationSettings() {
  const loaded = useAsync(getCheckinSettings, []);
  const [settings, setSettings] = useState<CheckinSettings>(DEFAULT_CHECKIN_SETTINGS);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (loaded.data) setSettings(loaded.data);
  }, [loaded.data]);

  function update<K extends keyof CheckinSettings>(key: K, value: CheckinSettings[K]) {
    setSettings((s) => ({ ...s, [key]: value }));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await saveCheckinSettings(settings);
      setSaved(true);
    } catch (err) {
      setError(toUserMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loaded.loading) return <Loading />;
  if (loaded.error) return <ErrorAlert>{loaded.error}</ErrorAlert>;
  const impact = checkinImpact(settings);
  const steps = checkinSteps(settings);

  return (
    <div className="page-stack">
      <PageHeader title="Configuration de la vérification" subtitle="Choisissez les étapes du check-in en ligne de vos voyageurs." />
      {error && <ErrorAlert>{error}</ErrorAlert>}
      <div className="settings-layout">
        <div className="page-stack">
          <StepCard
            icon={IdCard}
            title="1. Vérification de document"
            subtitle="Photo de la pièce d'identité (CIN, passeport, permis)"
            checked={settings.documentStep}
            onChange={(v) => update('documentStep', v)}
            why="Sécurité maximale, conformité de la fiche de police, prévention de la fraude."
            whyNot="Check-in plus rapide, moins de friction pour le voyageur."
          >
            <Toggle
              label="Saisie du numéro de pièce par le voyageur"
              description="Le numéro apparaît dans le contrat (section Locataire)."
              checked={settings.documentNumberRequired}
              onChange={(v) => update('documentNumberRequired', v)}
              disabled={!settings.documentStep}
            />
          </StepCard>
          <StepCard
            icon={Camera}
            title="2. Vérification par selfie"
            subtitle="Photo du visage pour comparaison avec la pièce"
            checked={settings.selfieStep}
            onChange={(v) => update('selfieStep', v)}
            why="Vérifie que la personne qui réserve est bien le titulaire de la pièce."
            whyNot="Évite les difficultés techniques sur certains téléphones."
          />
          <StepCard
            icon={FileSignature}
            title="3. Signature du contrat"
            subtitle="Lecture, acceptation et signature électronique"
            checked={settings.contractStep}
            onChange={(v) => update('contractStep', v)}
            why="Engagement clair du voyageur, preuve horodatée."
            whyNot="Séjours très courts, formalités réduites."
          />
          <Section title="Message personnalisé (optionnel)">
            <TextAreaField
              label="Affiché en haut de la page de check-in"
              rows={3}
              maxLength={1000}
              value={settings.welcomeMessage}
              onChange={(e) => update('welcomeMessage', e.target.value)}
              placeholder="Bienvenue ! Merci de compléter ces étapes avant votre arrivée."
            />
          </Section>
          <div className="form-actions">
            {saved && <span className="saved-note">Paramètres enregistrés ✓</span>}
            <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Enregistrement…' : 'Sauvegarder les paramètres'}</button>
          </div>
        </div>
        <aside className="page-stack">
          <Section title="Aperçu du processus">
            <ol className="process-list">
              {steps.map((step, index) => (
                <li key={step}><span className="process-num">{index + 1}</span>{CHECKIN_STEP_LABELS[step]}</li>
              ))}
            </ol>
          </Section>
          <Section title="Impact">
            <div className="mini-stats">
              <div><span>Temps</span><b>{impact.estimatedMinutes}</b></div>
              <div><span>Étapes</span><b>{impact.steps}</b></div>
              <div><span>Sécurité</span><b>{impact.securityLevel}</b></div>
            </div>
          </Section>
        </aside>
      </div>
    </div>
  );
}

export default function VerificationSettingsPage() {
  return (
    <RequirePermission permission={PERMISSIONS.SETTINGS_MANAGE}>
      <VerificationSettings />
    </RequirePermission>
  );
}
