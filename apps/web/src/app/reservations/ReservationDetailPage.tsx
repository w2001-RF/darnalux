import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useHref, useParams } from 'react-router-dom';
import { Copy, ExternalLink, Mail, MessageCircle, Pencil, Plus } from 'lucide-react';
import type { CheckoutCondition, ReservationStatus } from '@darnalux/core';
import {
  BOOKING_CHANNEL_LABELS,
  CHECKIN_STATUS_LABELS,
  CHECKIN_STATUS_TONES,
  CHECKOUT_CONDITIONS,
  CHECKOUT_CONDITION_LABELS,
  CHECKOUT_CONDITION_TONES,
  IDENTITY_DOCUMENT_LABELS,
  IMAGE_MIME_TYPES,
  PERMISSIONS,
  RESERVATION_STATUS_LABELS,
  RESERVATION_STATUS_TONES,
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_TONES,
  TASK_STATUS_LABELS,
  TASK_STATUS_TONES,
  buildStoragePath,
  compareTasks,
  computeReservationFinance,
  formatMoney,
  hasPermission,
  isCheckinLinkUsable,
  nextReservationStatuses,
  nightsBetween,
  personFullName,
  planReservationTasks,
  validateUpload,
} from '@darnalux/core';
import { useAuth } from '../../features/auth/AuthContext';
import { isPortalUser } from '../../features/auth/portal';
import type { ReservationListRow } from '../../features/reservations/api';
import { createTasksFromDrafts, getReservation, setReservationStatus } from '../../features/reservations/api';
import type { CheckinRow } from '../../features/checkins/api';
import { absoluteUrl, extendCheckinLink, getCheckinForReservation, getCheckout, reviewCheckin, saveCheckout } from '../../features/checkins/api';
import { listReservationExpenses } from '../../features/finance/api';
import { listTasks } from '../../features/tasks/api';
import { listAudit, changedFields } from '../../features/audit/api';
import { DocumentsPanel } from '../../features/documents/DocumentsPanel';
import { useAsync } from '../../lib/useAsync';
import { toUserMessage } from '../../lib/errors';
import { newId, signedUrl, signedUrls, uploadToBucket } from '../../lib/files';
import { formatDate, formatDateTime } from '../../lib/format';
import { Badge, EmptyState, Facts, Modal, PageHeader, Section, SelectField, TextAreaField, optionsFrom } from '../../components/ui';
import { ErrorAlert, InfoAlert, Loading } from '../../components/Feedback';

const TRANSITION_LABELS: Partial<Record<ReservationStatus, string>> = {
  CONFIRMED: 'Confirmer',
  CHECK_IN: 'Check-in effectué',
  IN_PROGRESS: 'Séjour en cours',
  CHECK_OUT: 'Check-out effectué',
  COMPLETED: 'Clôturer',
  CANCELLED: 'Annuler',
  NO_SHOW: 'No-show',
};

export default function ReservationDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { user } = useAuth();
  const portal = isPortalUser(user);
  const canManage = hasPermission(user, PERMISSIONS.RESERVATIONS_MANAGE);
  const canSeeCheckins = hasPermission(user, PERMISSIONS.CHECKINS_VIEW);
  const canSeeTasks = hasPermission(user, PERMISSIONS.TASKS_VIEW) || hasPermission(user, PERMISSIONS.TASKS_EXECUTE) || portal;
  const canSeeDocs = hasPermission(user, PERMISSIONS.DOCUMENTS_VIEW);
  const canSeeAudit = hasPermission(user, PERMISSIONS.AUDIT_VIEW);
  const reservation = useAsync(() => getReservation(id, portal), [id, portal]);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (reservation.loading) return <Loading />;
  if (reservation.error || !reservation.data) return <ErrorAlert>{reservation.error ?? 'Réservation introuvable.'}</ErrorAlert>;
  const r = reservation.data;

  async function changeStatus(status: ReservationStatus) {
    if ((status === 'CANCELLED' || status === 'NO_SHOW') && !window.confirm(`Passer la réservation en « ${RESERVATION_STATUS_LABELS[status]} » ?`)) return;
    setBusy(true);
    setStatusError(null);
    try {
      await setReservationStatus(r.id, status);
      reservation.reload();
    } catch (error) {
      setStatusError(toUserMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        back={{ to: '/app/reservations', label: 'Réservations' }}
        title={`Réservation ${r.reference}`}
        subtitle={
          <>
            <Badge tone={RESERVATION_STATUS_TONES[r.status]}>{RESERVATION_STATUS_LABELS[r.status]}</Badge>{' '}
            <Link to={`/app/properties/${r.property_id}`}>{r.properties?.name}</Link>
          </>
        }
        actions={
          canManage && (
            <>
              {nextReservationStatuses(r.status).map((status) => (
                <button
                  key={status}
                  type="button"
                  className={'btn btn-sm ' + (status === 'CANCELLED' || status === 'NO_SHOW' ? 'btn-ghost' : 'btn-primary')}
                  disabled={busy}
                  onClick={() => changeStatus(status)}
                >
                  {TRANSITION_LABELS[status] ?? RESERVATION_STATUS_LABELS[status]}
                </button>
              ))}
              <Link className="btn btn-ghost btn-sm" to={`/app/reservations/${r.id}/edit`}>
                <Pencil size={14} aria-hidden="true" /> Modifier
              </Link>
            </>
          )
        }
      />
      {statusError && <ErrorAlert>{statusError}</ErrorAlert>}

      <div className="app-grid">
        <Section title="Séjour">
          <Facts
            items={[
              { label: 'Arrivée', value: formatDate(r.check_in) },
              { label: 'Départ', value: formatDate(r.check_out) },
              { label: 'Nuits', value: nightsBetween(r.check_in, r.check_out) },
              { label: 'Voyageurs', value: r.guests_count },
              { label: 'Source', value: BOOKING_CHANNEL_LABELS[r.source] },
              { label: 'Référence externe', value: r.external_reference ?? '—' },
              ...(portal ? [] : [{ label: 'Code serrure', value: r.smart_lock_code ?? '—' }]),
            ]}
          />
          {r.notes && <p className="prose">{r.notes}</p>}
        </Section>
        <FinancePanel reservation={r} />
      </div>

      {!portal && <GuestPanel reservation={r} />}
      {canSeeCheckins && <CheckinPanel reservation={r} />}
      <CheckoutPanel reservation={r} />
      {canSeeTasks && <ReservationTasks reservation={r} />}
      {canSeeDocs && <DocumentsPanel filters={{ reservationId: r.id }} defaults={{ reservationId: r.id, propertyId: r.property_id, guestId: r.guest_id ?? undefined, category: 'GUEST' }} />}
      {canSeeAudit && <HistoryPanel entityId={r.id} />}
    </div>
  );
}

function FinancePanel({ reservation: r }: { reservation: ReservationListRow }) {
  const expenses = useAsync(() => listReservationExpenses(r.id).catch(() => []), [r.id]);
  const expensesTotal = (expenses.data ?? []).filter((e) => e.charged_to_owner).reduce((sum, e) => sum + Number(e.amount), 0);
  const finance = computeReservationFinance({
    grossAmount: Number(r.gross_amount),
    commissionRate: Number(r.commission_rate),
    platformFees: Number(r.platform_fees),
    expenses: expensesTotal,
  });
  return (
    <Section title="Finances">
      <dl className="ledger">
        <div><dt>Revenu brut</dt><dd>{formatMoney(finance.gross, r.currency)}</dd></div>
        <div><dt>− Commission DarnaLux ({Number(r.commission_rate)} %)</dt><dd>{formatMoney(finance.commission, r.currency)}</dd></div>
        <div><dt>− Frais de plateforme</dt><dd>{formatMoney(finance.platformFees, r.currency)}</dd></div>
        <div><dt>− Dépenses imputées</dt><dd>{formatMoney(finance.expenses, r.currency)}</dd></div>
        <div className="ledger-total"><dt>= Net propriétaire</dt><dd>{formatMoney(finance.ownerNet, r.currency)}</dd></div>
      </dl>
    </Section>
  );
}

function GuestPanel({ reservation: r }: { reservation: ReservationListRow }) {
  if (!r.guests) {
    return (
      <Section title="Voyageur">
        <p className="dim">Aucun voyageur associé. La fiche sera créée à la validation du check-in en ligne.</p>
      </Section>
    );
  }
  return (
    <Section title="Voyageur">
      <div className="inline-actions">
        <Link className="cell-title" to={`/app/guests/${r.guests.id}`}>
          {personFullName(r.guests.first_name, r.guests.last_name)}
        </Link>
        {r.guests.is_blacklisted && <Badge tone="danger">Liste noire</Badge>}
      </div>
    </Section>
  );
}

function CheckinPanel({ reservation: r }: { reservation: ReservationListRow }) {
  const { user } = useAuth();
  const canReview = hasPermission(user, PERMISSIONS.CHECKINS_MANAGE);
  const checkin = useAsync(() => getCheckinForReservation(r.id), [r.id]);
  const href = useHref(`/checkin/${checkin.data?.token ?? ''}`);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [preview, setPreview] = useState<{ title: string; url?: string; text?: string } | null>(null);

  if (checkin.loading) return <Loading />;
  if (checkin.error) return <ErrorAlert>{checkin.error}</ErrorAlert>;
  const c = checkin.data;
  if (!c) return null;

  const url = absoluteUrl(href);
  const usable = isCheckinLinkUsable(c.status, c.expires_at, new Date());
  const message = `Bonjour, merci pour votre réservation ${r.reference} à ${r.properties?.name ?? 'notre logement'}. Afin de préparer votre arrivée, merci de compléter votre enregistrement en ligne : ${url}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Copie impossible : sélectionnez le lien manuellement.');
    }
  }

  async function run(action: () => Promise<void>) {
    setError(null);
    try {
      await action();
      checkin.reload();
    } catch (err) {
      setError(toUserMessage(err));
    }
  }

  async function openFile(title: string, path: string | null) {
    if (!path) return;
    try {
      setPreview({ title, url: await signedUrl('guest-documents', path, 120) });
    } catch (err) {
      setError(toUserMessage(err));
    }
  }

  return (
    <Section title="Check-in digital" actions={<Badge tone={CHECKIN_STATUS_TONES[c.status]}>{CHECKIN_STATUS_LABELS[c.status]}</Badge>}>
      {error && <ErrorAlert>{error}</ErrorAlert>}
      <div className="link-box">
        <input readOnly value={url} aria-label="Lien de check-in" onFocus={(e) => e.target.select()} />
        <button type="button" className="btn btn-ghost btn-sm" onClick={copy}>
          <Copy size={14} aria-hidden="true" /> {copied ? 'Copié ✓' : 'Copier'}
        </button>
        <a className="btn btn-ghost btn-sm" href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">
          <MessageCircle size={14} aria-hidden="true" /> WhatsApp
        </a>
        <a className="btn btn-ghost btn-sm" href={`mailto:?subject=${encodeURIComponent(`Check-in ${r.reference}`)}&body=${encodeURIComponent(message)}`}>
          <Mail size={14} aria-hidden="true" /> Email
        </a>
        <a className="btn btn-ghost btn-sm" href={url} target="_blank" rel="noreferrer">
          <ExternalLink size={14} aria-hidden="true" /> Ouvrir
        </a>
      </div>
      <p className="dim small">
        Lien valable jusqu'au {formatDateTime(c.expires_at)}
        {!usable && c.status !== 'VERIFIED' && ' — expiré.'}{' '}
        {canReview && c.status !== 'VERIFIED' && (
          <button type="button" className="btn btn-link btn-sm" onClick={() => run(() => extendCheckinLink(c.id, 30))}>
            Prolonger de 30 jours
          </button>
        )}
      </p>

      {c.submitted_at ? (
        <SubmittedCheckin checkin={c} onOpenFile={openFile} onShowContract={() => setPreview({ title: 'Contrat signé', text: c.contract_snapshot ?? '' })} />
      ) : (
        <InfoAlert>Le voyageur n'a pas encore complété son enregistrement.</InfoAlert>
      )}

      {canReview && c.status === 'SUBMITTED' && (
        <div className="review-box">
          <TextAreaField label="Commentaire (visible par le voyageur en cas de refus)" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => run(() => reviewCheckin(c.id, 'REJECTED', notes))}>Refuser</button>
            <button type="button" className="btn btn-primary" onClick={() => run(() => reviewCheckin(c.id, 'VERIFIED', notes))}>Valider l'identité</button>
          </div>
        </div>
      )}
      {c.review_notes && c.status === 'REJECTED' && <ErrorAlert>Motif du refus : {c.review_notes}</ErrorAlert>}

      <Modal open={Boolean(preview)} title={preview?.title ?? ''} onClose={() => setPreview(null)} wide>
        {preview?.url && <img className="preview-image" src={preview.url} alt={preview.title} />}
        {preview?.text !== undefined && <pre className="contract-text">{preview.text}</pre>}
      </Modal>
    </Section>
  );
}

function SubmittedCheckin({
  checkin: c,
  onOpenFile,
  onShowContract,
}: {
  checkin: CheckinRow;
  onOpenFile: (title: string, path: string | null) => void;
  onShowContract: () => void;
}) {
  return (
    <>
      <Facts
        items={[
          { label: 'Nom déclaré', value: c.guest_full_name ?? '—' },
          { label: 'Contact', value: [c.guest_email, c.guest_phone].filter(Boolean).join(' · ') || '—' },
          { label: 'Pièce', value: c.document_type ? `${IDENTITY_DOCUMENT_LABELS[c.document_type]}${c.document_number ? ` n° ${c.document_number}` : ''}` : '—' },
          { label: 'Soumis le', value: formatDateTime(c.submitted_at) },
          { label: 'Consentement', value: c.consent_given_at ? formatDateTime(c.consent_given_at) : '—' },
          { label: 'Contrat signé le', value: c.signed_at ? formatDateTime(c.signed_at) : '—' },
        ]}
      />
      <div className="inline-actions">
        {c.document_path && <button type="button" className="btn btn-ghost btn-sm" onClick={() => onOpenFile("Pièce d'identité", c.document_path)}>Voir la pièce</button>}
        {c.selfie_path && <button type="button" className="btn btn-ghost btn-sm" onClick={() => onOpenFile('Selfie', c.selfie_path)}>Voir le selfie</button>}
        {c.signature_path && <button type="button" className="btn btn-ghost btn-sm" onClick={() => onOpenFile('Signature', c.signature_path)}>Voir la signature</button>}
        {c.contract_snapshot && <button type="button" className="btn btn-ghost btn-sm" onClick={onShowContract}>Contrat signé</button>}
      </div>
    </>
  );
}

function CheckoutPanel({ reservation: r }: { reservation: ReservationListRow }) {
  const { user } = useAuth();
  const canRecord = hasPermission(user, PERMISSIONS.CHECKINS_MANAGE) || hasPermission(user, PERMISSIONS.TASKS_EXECUTE);
  const checkout = useAsync(() => getCheckout(r.id).catch(() => null), [r.id]);
  const [editing, setEditing] = useState(false);
  const [condition, setCondition] = useState<CheckoutCondition>('GOOD');
  const [incident, setIncident] = useState(false);
  const [notes, setNotes] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const photos = useAsync(
    async (): Promise<Record<string, string>> => (checkout.data?.photo_paths.length && hasPermission(user, PERMISSIONS.DOCUMENTS_VIEW) ? signedUrls('documents', checkout.data.photo_paths) : {}),
    [checkout.data?.id],
  );

  if (checkout.loading) return null;
  const c = checkout.data;
  if (!c && !canRecord) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    for (const file of files) {
      const problem = validateUpload(file, IMAGE_MIME_TYPES);
      if (problem) {
        setError(`${file.name} : ${problem}`);
        return;
      }
    }
    setSaving(true);
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        uploaded.push(await uploadToBucket('documents', buildStoragePath(['checkouts', r.id], file.name, newId()), file));
      }
      await saveCheckout({
        reservation_id: r.id,
        condition,
        incident_reported: incident,
        notes: notes.trim() || null,
        photo_paths: [...(c?.photo_paths ?? []), ...uploaded],
      });
      setEditing(false);
      setFiles([]);
      checkout.reload();
    } catch (err) {
      setError(toUserMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (c && !editing) {
    return (
      <Section
        title="Check-out & inspection"
        actions={canRecord && <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setCondition(c.condition); setIncident(c.incident_reported); setNotes(c.notes ?? ''); setEditing(true); }}>Modifier</button>}
      >
        <Facts
          items={[
            { label: 'État du logement', value: <Badge tone={CHECKOUT_CONDITION_TONES[c.condition]}>{CHECKOUT_CONDITION_LABELS[c.condition]}</Badge> },
            { label: 'Incident signalé', value: c.incident_reported ? 'Oui' : 'Non' },
            { label: 'Clôturé le', value: formatDateTime(c.completed_at) },
          ]}
        />
        {c.notes && <p className="prose">{c.notes}</p>}
        {photos.data && Object.keys(photos.data).length > 0 && (
          <div className="photo-grid">
            {Object.entries(photos.data).map(([path, url]) => (
              <figure key={path} className="photo">
                <img src={url} alt="Photo d'inspection" loading="lazy" />
              </figure>
            ))}
          </div>
        )}
      </Section>
    );
  }

  if (!editing) {
    return (
      <Section title="Check-out & inspection">
        <p className="dim">Aucun rapport de départ.</p>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setEditing(true)}>Enregistrer le check-out</button>
      </Section>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Section title="Rapport de check-out">
        {error && <ErrorAlert>{error}</ErrorAlert>}
        <div className="form-grid">
          <SelectField label="État du logement" value={condition} options={optionsFrom(CHECKOUT_CONDITIONS, CHECKOUT_CONDITION_LABELS)} onChange={(e) => setCondition(e.target.value as CheckoutCondition)} />
          <div className="field">
            <label htmlFor="checkout-photos">Photos (JPEG, PNG, WebP)</label>
            <input id="checkout-photos" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" multiple onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
          </div>
        </div>
        <label className="checkbox-line">
          <input type="checkbox" checked={incident} onChange={(e) => setIncident(e.target.checked)} /> Signaler un incident
        </label>
        <TextAreaField label="Observations" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>Annuler</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
        </div>
      </Section>
    </form>
  );
}

function ReservationTasks({ reservation: r }: { reservation: ReservationListRow }) {
  const { user } = useAuth();
  const canManage = hasPermission(user, PERMISSIONS.TASKS_MANAGE);
  const tasks = useAsync(() => listTasks({ reservationId: r.id }), [r.id]);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setError(null);
    try {
      await createTasksFromDrafts(planReservationTasks({ checkIn: r.check_in, checkOut: r.check_out }, { propertyName: r.properties?.name }), {
        propertyId: r.property_id,
        reservationId: r.id,
      });
      tasks.reload();
    } catch (err) {
      setError(toUserMessage(err));
    }
  }

  const sorted = [...(tasks.data ?? [])].sort((a, b) => compareTasks({ ...a, dueAt: a.due_at }, { ...b, dueAt: b.due_at }));

  return (
    <Section
      title="Tâches & interventions"
      flush
      actions={
        canManage && (
          <>
            {tasks.data?.length === 0 && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={generate}>Générer les tâches standard</button>
            )}
            <Link className="btn btn-primary btn-sm" to={`/app/tasks/new?property=${r.property_id}&reservation=${r.id}`}>
              <Plus size={14} aria-hidden="true" /> Tâche
            </Link>
          </>
        )
      }
    >
      {error && <div className="panel-pad"><ErrorAlert>{error}</ErrorAlert></div>}
      {tasks.loading && <Loading />}
      {tasks.data && tasks.data.length === 0 && <EmptyState title="Aucune tâche liée" />}
      {sorted.length > 0 && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tâche</th>
                <th>Échéance</th>
                <th>Priorité</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((t) => (
                <tr key={t.id}>
                  <td><Link className="cell-title" to={`/app/tasks/${t.id}`}>{t.title}</Link></td>
                  <td>{formatDateTime(t.due_at)}</td>
                  <td><Badge tone={TASK_PRIORITY_TONES[t.priority]}>{TASK_PRIORITY_LABELS[t.priority]}</Badge></td>
                  <td><Badge tone={TASK_STATUS_TONES[t.status]}>{TASK_STATUS_LABELS[t.status]}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}

function HistoryPanel({ entityId }: { entityId: string }) {
  const audit = useAsync(() => listAudit({ entity: 'reservations', entityId, limit: 50 }), [entityId]);
  if (!audit.data || audit.data.length === 0) return null;
  return (
    <Section title="Historique">
      <ol className="timeline">
        {audit.data.map((entry) => {
          const changes = changedFields(entry);
          return (
            <li key={entry.id}>
              <span className="timeline-date">{formatDateTime(entry.created_at)}</span>
              <span>
                {entry.action === 'INSERT'
                  ? 'Réservation créée'
                  : entry.action === 'DELETE'
                    ? 'Réservation supprimée'
                    : changes.map((change) => (change.key === 'status' ? `Statut : ${RESERVATION_STATUS_LABELS[change.after as ReservationStatus] ?? change.after}` : change.key)).join(', ') || 'Modification'}
              </span>
            </li>
          );
        })}
      </ol>
    </Section>
  );
}
