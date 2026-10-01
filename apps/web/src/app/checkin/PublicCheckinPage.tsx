import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { Camera, CheckCircle2, Clock, FileSignature, IdCard, KeyRound, MapPin, ShieldCheck } from 'lucide-react';
import type { CheckinStep, GuestCheckinField, GuestCheckinInfo, IdentityDocumentType } from '@darnalux/core';
import {
  CHECKIN_STEP_LABELS,
  DEFAULT_CONTRACT_TEMPLATE,
  IDENTITY_DOCUMENT_LABELS,
  IDENTITY_DOCUMENT_TYPES,
  PROPERTY_TYPE_LABELS,
  checkinSteps,
  nightsBetween,
  renderContract,
  validateGuestCheckinInfo,
  validateUpload,
} from '@darnalux/core';
import type { PublicCheckin } from '../../features/checkins/api';
import { getPublicCheckin, startPublicCheckin, submitPublicCheckin, uploadGuestFile } from '../../features/checkins/api';
import { compressImage, extensionFor } from '../../lib/image';
import { toUserMessage } from '../../lib/errors';
import { formatDate } from '../../lib/format';
import { Brand } from '../../components/Brand';
import { ThemeToggle } from '../../components/ThemeToggle';
import { SignaturePad } from '../../components/SignaturePad';
import type { SignaturePadHandle } from '../../components/SignaturePad';
import { TextField } from '../../components/ui';
import { ErrorAlert, InfoAlert, Loading } from '../../components/Feedback';

const PREVIEW_TOKEN = 'apercu';

const PREVIEW_DATA: PublicCheckin = {
  status: 'PENDING',
  reviewNotes: null,
  reservation: { reference: 'DL-APERCU', checkIn: '2026-04-11', checkOut: '2026-04-18', guestsCount: 2 },
  property: { name: 'Villa Atlas (exemple)', address: '12 avenue Mohammed V', city: 'Rabat', type: 'VILLA', houseRules: 'Non-fumeur. Pas de fête. Silence après 22 h.' },
  guestName: null,
  settings: { documentStep: true, selfieStep: true, contractStep: true, documentNumberRequired: false, welcomeMessage: '' },
  contractTemplate: DEFAULT_CONTRACT_TEMPLATE,
  smartLockCode: null,
};

const ACCEPTED_DOCUMENTS = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

class GuestFlowError extends Error {}

export default function PublicCheckinPage() {
  const { token = '' } = useParams<{ token: string }>();
  const preview = token === PREVIEW_TOKEN;
  const [data, setData] = useState<PublicCheckin | null | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);

  async function load() {
    if (preview) {
      setData(PREVIEW_DATA);
      return;
    }
    try {
      setData(await getPublicCheckin(token));
    } catch (error) {
      setLoadError(toUserMessage(error));
    }
  }

  useEffect(() => {
    void load();
  }, [token]);

  return (
    <div className="guest-page">
      <header className="guest-header">
        <Brand to="/" />
        <ThemeToggle />
      </header>
      <main className="guest-main">
        {preview && <InfoAlert>Mode aperçu : rien n'est enregistré. C'est exactement ce que voit votre voyageur.</InfoAlert>}
        {data === undefined && !loadError && <Loading label="Chargement de votre séjour…" />}
        {loadError && <ErrorAlert>{loadError}</ErrorAlert>}
        {data === null && (
          <div className="guest-card guest-center">
            <Clock size={40} aria-hidden="true" />
            <h1>Lien invalide ou expiré</h1>
            <p className="dim">Ce lien de check-in n'est plus valable. Contactez DarnaLux pour en recevoir un nouveau.</p>
          </div>
        )}
        {data && data.status === 'VERIFIED' && <VerifiedView data={data} />}
        {data && data.status === 'SUBMITTED' && <SubmittedView data={data} />}
        {data && ['PENDING', 'IN_PROGRESS', 'REJECTED'].includes(data.status) && (
          <CheckinWizard token={token} preview={preview} data={data} onDone={() => (preview ? setData({ ...data, status: 'SUBMITTED' }) : void load())} />
        )}
      </main>
      <footer className="guest-footer">DarnaLux Conciergerie · Vos données sont protégées et utilisées uniquement pour ce séjour.</footer>
    </div>
  );
}

function StayCard({ data }: { data: PublicCheckin }) {
  const nights = nightsBetween(data.reservation.checkIn, data.reservation.checkOut);
  return (
    <div className="guest-card stay-card">
      <div className="eyebrow">{PROPERTY_TYPE_LABELS[data.property.type]}</div>
      <h1>Bienvenue chez {data.property.name}</h1>
      <p className="dim"><MapPin size={14} aria-hidden="true" /> {[data.property.address, data.property.city].filter(Boolean).join(', ')}</p>
      <dl className="ledger">
        <div><dt>Arrivée</dt><dd>{formatDate(data.reservation.checkIn)}</dd></div>
        <div><dt>Départ</dt><dd>{formatDate(data.reservation.checkOut)}</dd></div>
        <div><dt>Durée</dt><dd>{nights} nuit(s)</dd></div>
        <div><dt>Voyageurs</dt><dd>{data.reservation.guestsCount}</dd></div>
      </dl>
    </div>
  );
}

function VerifiedView({ data }: { data: PublicCheckin }) {
  const query = encodeURIComponent([data.property.address, data.property.city].filter(Boolean).join(', '));
  return (
    <div className="page-stack">
      <div className="guest-card guest-center success">
        <CheckCircle2 size={44} aria-hidden="true" />
        <h1>Vérification terminée !</h1>
        <p className="dim">Merci, votre identité a été vérifiée. Nous vous souhaitons un excellent séjour.</p>
      </div>
      <StayCard data={data} />
      {data.smartLockCode && (
        <div className="guest-card code-card">
          <KeyRound size={22} aria-hidden="true" />
          <div>
            <div className="eyebrow">Code d'accès</div>
            <div className="lock-code">{data.smartLockCode}</div>
            <p className="dim small">Ne le partagez pas. Il n'est valable que pour votre séjour.</p>
          </div>
        </div>
      )}
      <div className="guest-card">
        <h2 className="section-title">Itinéraire</h2>
        <div className="inline-actions">
          <a className="btn btn-ghost btn-sm" href={`https://www.google.com/maps/search/?api=1&query=${query}`} target="_blank" rel="noreferrer">Google Maps</a>
          <a className="btn btn-ghost btn-sm" href={`https://maps.apple.com/?q=${query}`} target="_blank" rel="noreferrer">Apple Plans</a>
          <a className="btn btn-ghost btn-sm" href={`https://waze.com/ul?q=${query}`} target="_blank" rel="noreferrer">Waze</a>
        </div>
        {data.property.houseRules && (
          <>
            <h2 className="section-title section-gap">Règlement intérieur</h2>
            <p className="prose">{data.property.houseRules}</p>
          </>
        )}
      </div>
    </div>
  );
}

function SubmittedView({ data }: { data: PublicCheckin }) {
  return (
    <div className="page-stack">
      <div className="guest-card guest-center">
        <ShieldCheck size={44} aria-hidden="true" />
        <h1>Merci, c'est envoyé !</h1>
        <p className="dim">
          L'équipe DarnaLux vérifie vos informations. Vous recevrez le code d'accès sur cette même page dès la validation.
          Gardez votre pièce d'identité à portée de main à l'arrivée.
        </p>
      </div>
      <StayCard data={data} />
    </div>
  );
}

function FilePickStep({
  title,
  icon: Icon,
  hint,
  capture,
  accept,
  file,
  onFile,
  children,
}: {
  title: string;
  icon: typeof Camera;
  hint: string;
  capture: 'user' | 'environment';
  accept: string;
  file: File | null;
  onFile: (file: File | null) => void;
  children?: ReactNode;
}) {
  const previewUrl = useMemo(() => (file && file.type.startsWith('image/') ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);
  return (
    <div className="form-stack">
      <h2 className="step-title"><Icon size={20} aria-hidden="true" /> {title}</h2>
      <p className="dim">{hint}</p>
      {children}
      <label className={'capture-zone' + (file ? ' has-file' : '')}>
        {previewUrl ? <img src={previewUrl} alt="Aperçu" /> : file ? <span>{file.name}</span> : <span><Camera size={28} aria-hidden="true" /> Prendre une photo ou choisir un fichier</span>}
        <input type="file" accept={accept} capture={capture} hidden onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
      </label>
    </div>
  );
}

function CheckinWizard({ token, preview, data, onDone }: { token: string; preview: boolean; data: PublicCheckin; onDone: () => void }) {
  const steps = checkinSteps(data.settings).filter((s) => s !== 'DONE');
  const [stepIndex, setStepIndex] = useState(-1);
  const [info, setInfo] = useState<GuestCheckinInfo>({
    fullName: data.guestName ?? '',
    email: '',
    phone: '',
    nationality: '',
    documentType: '',
    documentNumber: '',
  });
  const [errors, setErrors] = useState<Partial<Record<GuestCheckinField, string>>>({});
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [signatureEmpty, setSignatureEmpty] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const signatureRef = useRef<SignaturePadHandle>(null);
  const step: CheckinStep | null = stepIndex >= 0 ? steps[stepIndex] : null;

  const contractText = useMemo(
    () =>
      renderContract(data.contractTemplate ?? DEFAULT_CONTRACT_TEMPLATE, {
        guest_full_name: info.fullName,
        guest_document_number: info.documentNumber,
        property_name: data.property.name,
        property_address: data.property.address,
        property_city: data.property.city,
        check_in: formatDate(data.reservation.checkIn),
        check_out: formatDate(data.reservation.checkOut),
        nights: nightsBetween(data.reservation.checkIn, data.reservation.checkOut),
        guests_count: data.reservation.guestsCount,
        reservation_reference: data.reservation.reference,
        today: new Date().toLocaleDateString('fr-MA'),
        company_name: 'DarnaLux Conciergerie',
      }),
    [data, info.fullName, info.documentNumber],
  );

  function begin() {
    setStepIndex(0);
    if (!preview) startPublicCheckin(token).catch(() => undefined);
  }

  function validateCurrentStep(): boolean {
    setError(null);
    if (step === 'INFO') {
      const validation = validateGuestCheckinInfo(info, data.settings);
      setErrors(validation.errors);
      return validation.valid;
    }
    if (step === 'DOCUMENT') {
      if (!documentFile) {
        setError("Ajoutez une photo de votre pièce d'identité.");
        return false;
      }
      // Size is checked after compression; HEIC and other photo formats are converted to JPEG.
      if (!documentFile.type.startsWith('image/') && !ACCEPTED_DOCUMENTS.includes(documentFile.type)) {
        setError('Format non accepté : utilisez une photo (JPEG, PNG) ou un PDF.');
        return false;
      }
    }
    if (step === 'SELFIE' && !selfieFile) {
      setError('Prenez un selfie, visage bien éclairé et face à la caméra.');
      return false;
    }
    if (step === 'CONTRACT' && (!consent || signatureEmpty)) {
      setError('Acceptez les conditions et signez le contrat pour terminer.');
      return false;
    }
    return true;
  }

  function next() {
    if (!validateCurrentStep()) return;
    setStepIndex(stepIndex + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submit() {
    if (!validateCurrentStep()) return;
    setSubmitting(true);
    try {
      if (preview) {
        onDone();
        return;
      }
      let documentPath: string | null = null;
      let selfiePath: string | null = null;
      let signaturePath: string | null = null;
      if (data.settings.documentStep && documentFile) {
        const blob = await compressImage(documentFile);
        const problem = validateUpload(blob, ACCEPTED_DOCUMENTS);
        if (problem) throw new GuestFlowError(`Pièce d'identité : ${problem}`);
        documentPath = await uploadGuestFile(token, 'document', blob, extensionFor(blob));
      }
      if (data.settings.selfieStep && selfieFile) {
        const blob = await compressImage(selfieFile, 1200);
        selfiePath = await uploadGuestFile(token, 'selfie', blob, extensionFor(blob));
      }
      if (data.settings.contractStep) {
        const blob = await signatureRef.current?.toBlob();
        if (!blob) throw new GuestFlowError('Signature manquante.');
        signaturePath = await uploadGuestFile(token, 'signature', blob, 'png');
      }
      await submitPublicCheckin(token, {
        fullName: info.fullName.trim(),
        email: info.email.trim(),
        phone: info.phone.trim(),
        nationality: info.nationality.trim(),
        documentType: info.documentType,
        documentNumber: info.documentNumber.trim(),
        documentPath,
        selfiePath,
        signaturePath,
        contractSnapshot: data.settings.contractStep ? contractText : null,
        consent,
        userAgent: navigator.userAgent,
      });
      onDone();
    } catch (err) {
      setError(err instanceof GuestFlowError ? err.message : toUserMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (step === null) {
    return (
      <div className="page-stack">
        <StayCard data={data} />
        {data.status === 'REJECTED' && (
          <ErrorAlert>Votre précédente vérification n'a pas pu être validée{data.reviewNotes ? ` : ${data.reviewNotes}` : '.'} Merci de recommencer.</ErrorAlert>
        )}
        <div className="guest-card">
          <h2 className="section-title">Enregistrement en ligne</h2>
          {data.settings.welcomeMessage && <p className="prose">{data.settings.welcomeMessage}</p>}
          <p className="dim">Pour préparer votre arrivée, merci de compléter ces étapes (environ {steps.length + 1} minutes) :</p>
          <ol className="process-list">
            {steps.map((s, i) => (
              <li key={s}><span className="process-num">{i + 1}</span>{CHECKIN_STEP_LABELS[s]}</li>
            ))}
          </ol>
          <p className="dim small">
            Conformément à la réglementation marocaine, vos documents sont stockés de manière sécurisée, accessibles uniquement à
            l'équipe DarnaLux et utilisés pour ce séjour.
          </p>
          <button type="button" className="btn btn-primary btn-block btn-lg" onClick={begin}>Commencer la vérification</button>
        </div>
      </div>
    );
  }

  return (
    <div className="guest-card wizard">
      <ol className="stepper" aria-label="Progression">
        {steps.map((s, i) => (
          <li key={s} className={i < stepIndex ? 'done' : i === stepIndex ? 'current' : ''}>
            <span>{i < stepIndex ? '✓' : i + 1}</span>
            {CHECKIN_STEP_LABELS[s]}
          </li>
        ))}
      </ol>
      {error && <ErrorAlert>{error}</ErrorAlert>}

      {step === 'INFO' && (
        <div className="form-stack">
          <h2 className="step-title"><IdCard size={20} aria-hidden="true" /> Vos informations</h2>
          <TextField label="Nom complet (comme sur votre pièce)" required value={info.fullName} error={errors.fullName} onChange={(e) => setInfo({ ...info, fullName: e.target.value })} autoComplete="name" />
          <div className="form-grid">
            <TextField label="Email" type="email" value={info.email} error={errors.email} onChange={(e) => setInfo({ ...info, email: e.target.value })} autoComplete="email" />
            <TextField label="Téléphone" type="tel" value={info.phone} error={errors.phone} onChange={(e) => setInfo({ ...info, phone: e.target.value })} autoComplete="tel" />
            <TextField label="Nationalité" value={info.nationality} onChange={(e) => setInfo({ ...info, nationality: e.target.value })} />
            {data.settings.documentNumberRequired && (
              <TextField label="Numéro de la pièce" required value={info.documentNumber} error={errors.documentNumber} onChange={(e) => setInfo({ ...info, documentNumber: e.target.value })} />
            )}
          </div>
          {data.settings.documentStep && (
            <fieldset className="doc-types">
              <legend>Type de document</legend>
              {IDENTITY_DOCUMENT_TYPES.map((type) => (
                <label key={type} className={'doc-type' + (info.documentType === type ? ' selected' : '')}>
                  <input type="radio" name="document-type" value={type} checked={info.documentType === type} onChange={() => setInfo({ ...info, documentType: type as IdentityDocumentType })} />
                  {IDENTITY_DOCUMENT_LABELS[type]}
                </label>
              ))}
              {errors.documentType && <small className="field-error">{errors.documentType}</small>}
            </fieldset>
          )}
        </div>
      )}

      {step === 'DOCUMENT' && (
        <FilePickStep
          title="Pièce d'identité"
          icon={IdCard}
          hint="Placez le document à plat, bien éclairé, sans reflet, tous les détails lisibles."
          capture="environment"
          accept="image/*,application/pdf"
          file={documentFile}
          onFile={setDocumentFile}
        >
          <p className="small"><strong>{info.documentType ? IDENTITY_DOCUMENT_LABELS[info.documentType as IdentityDocumentType] : ''}</strong></p>
        </FilePickStep>
      )}

      {step === 'SELFIE' && (
        <FilePickStep
          title="Selfie"
          icon={Camera}
          hint="Regardez la caméra, visage centré et bien éclairé, sans lunettes de soleil ni chapeau."
          capture="user"
          accept="image/*"
          file={selfieFile}
          onFile={setSelfieFile}
        />
      )}

      {step === 'CONTRACT' && (
        <div className="form-stack">
          <h2 className="step-title"><FileSignature size={20} aria-hidden="true" /> Contrat de location</h2>
          <pre className="contract-text contract-scroll">{contractText}</pre>
          <label className="checkbox-line">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            J'ai lu et j'accepte les termes du contrat, et je consens au traitement de mes données pour ce séjour.
          </label>
          <div className="field">
            <label>Signature</label>
            <SignaturePad ref={signatureRef} label="Zone de signature" onChange={setSignatureEmpty} />
            <div className="inline-actions">
              <span className="dim small">Signez avec le doigt ou la souris.</span>
              <button type="button" className="btn btn-link btn-sm" onClick={() => signatureRef.current?.clear()}>Effacer</button>
            </div>
          </div>
        </div>
      )}

      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={() => setStepIndex(stepIndex - 1)} disabled={submitting}>
          Retour
        </button>
        {stepIndex < steps.length - 1 ? (
          <button type="button" className="btn btn-primary" onClick={next}>Continuer</button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={submit} disabled={submitting}>
            {submitting ? 'Envoi sécurisé…' : 'Signer et terminer'}
          </button>
        )}
      </div>
    </div>
  );
}
