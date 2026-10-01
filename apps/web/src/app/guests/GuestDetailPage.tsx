import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import type { GuestField, GuestInput } from '@darnalux/core';
import {
  GUEST_VERIFICATION_LABELS,
  GUEST_VERIFICATION_TONES,
  IDENTITY_DOCUMENT_LABELS,
  PERMISSIONS,
  emptyGuestInput,
  hasPermission,
  personFullName,
  validateBlacklistReason,
  validateGuestInput,
} from '@darnalux/core';
import { useAuth } from '../../features/auth/AuthContext';
import { RequirePermission } from '../../features/auth/RequirePermission';
import { getGuest, setBlacklist, toGuestInput, updateGuest } from '../../features/guests/api';
import { listReservations } from '../../features/reservations/api';
import { ReservationsTable } from '../../features/reservations/ReservationsTable';
import { DocumentsPanel } from '../../features/documents/DocumentsPanel';
import { useAsync } from '../../lib/useAsync';
import { toUserMessage } from '../../lib/errors';
import { formatDateTime } from '../../lib/format';
import { Badge, EmptyState, Facts, PageHeader, Section, TextAreaField, TextField } from '../../components/ui';
import { ErrorAlert, Loading } from '../../components/Feedback';

function GuestDetail() {
  const { id = '' } = useParams<{ id: string }>();
  const { user } = useAuth();
  const canManage = hasPermission(user, PERMISSIONS.GUESTS_MANAGE);
  const canBlacklist = hasPermission(user, PERMISSIONS.GUESTS_BLACKLIST);
  const guest = useAsync(() => getGuest(id), [id]);
  const reservations = useAsync(() => listReservations({ guestId: id, limit: 100 }), [id]);
  const [input, setInput] = useState<GuestInput>(emptyGuestInput);
  const [errors, setErrors] = useState<Partial<Record<GuestField, string>>>({});
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (guest.data) setInput(toGuestInput(guest.data));
  }, [guest.data]);

  if (guest.loading) return <Loading />;
  if (guest.error || !guest.data) return <ErrorAlert>{guest.error ?? 'Voyageur introuvable.'}</ErrorAlert>;
  const g = guest.data;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const validation = validateGuestInput(input);
    setErrors(validation.errors);
    if (!validation.valid) return;
    try {
      await updateGuest(g.id, input);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      guest.reload();
    } catch (err) {
      setError(toUserMessage(err));
    }
  }

  async function toggleBlacklist() {
    setError(null);
    if (!g.is_blacklisted) {
      const problem = validateBlacklistReason(reason);
      if (problem) {
        setError(problem);
        return;
      }
    } else if (!window.confirm('Retirer ce voyageur de la liste noire ?')) {
      return;
    }
    try {
      await setBlacklist(g.id, !g.is_blacklisted, reason);
      setReason('');
      guest.reload();
    } catch (err) {
      setError(toUserMessage(err));
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        back={{ to: '/app/guests', label: 'Voyageurs' }}
        title={personFullName(g.first_name, g.last_name)}
        subtitle={
          <>
            <Badge tone={GUEST_VERIFICATION_TONES[g.verification_status]}>{GUEST_VERIFICATION_LABELS[g.verification_status]}</Badge>{' '}
            {g.is_blacklisted && <Badge tone="danger">Liste noire</Badge>}
          </>
        }
      />
      {error && <ErrorAlert>{error}</ErrorAlert>}
      <div className="app-grid">
        {canManage ? (
          <form onSubmit={save}>
            <Section title="Profil">
              <div className="form-grid">
                <TextField label="Prénom" value={input.firstName} error={errors.firstName} onChange={(e) => setInput((v) => ({ ...v, firstName: e.target.value }))} />
                <TextField label="Nom" value={input.lastName} error={errors.lastName} onChange={(e) => setInput((v) => ({ ...v, lastName: e.target.value }))} />
                <TextField label="Email" type="email" value={input.email} error={errors.email} onChange={(e) => setInput((v) => ({ ...v, email: e.target.value }))} />
                <TextField label="Téléphone" type="tel" value={input.phone} error={errors.phone} onChange={(e) => setInput((v) => ({ ...v, phone: e.target.value }))} />
                <TextField label="Nationalité" value={input.nationality} onChange={(e) => setInput((v) => ({ ...v, nationality: e.target.value }))} />
              </div>
              <TextAreaField label="Notes internes" rows={3} value={input.internalNotes} onChange={(e) => setInput((v) => ({ ...v, internalNotes: e.target.value }))} />
              <div className="form-actions">
                {saved && <span className="saved-note">Enregistré ✓</span>}
                <button type="submit" className="btn btn-primary">Enregistrer</button>
              </div>
            </Section>
          </form>
        ) : (
          <Section title="Profil">
            <Facts
              items={[
                { label: 'Email', value: g.email ?? '—' },
                { label: 'Téléphone', value: g.phone ?? '—' },
                { label: 'Nationalité', value: g.nationality ?? '—' },
              ]}
            />
          </Section>
        )}
        <Section title="Identité & liste noire">
          <Facts
            items={[
              { label: 'Pièce', value: g.document_type ? IDENTITY_DOCUMENT_LABELS[g.document_type] : '—' },
              { label: 'Numéro', value: g.document_number ?? '—' },
              { label: 'Vérification', value: GUEST_VERIFICATION_LABELS[g.verification_status] },
            ]}
          />
          {g.is_blacklisted && (
            <ErrorAlert>
              En liste noire depuis le {formatDateTime(g.blacklisted_at)} — {g.blacklist_reason}
            </ErrorAlert>
          )}
          {canBlacklist && (
            <div className="form-stack">
              {!g.is_blacklisted && (
                <TextAreaField label="Motif (obligatoire)" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Dégradations, non-respect du règlement, impayé…" />
              )}
              <button type="button" className={'btn ' + (g.is_blacklisted ? 'btn-ghost' : 'btn-primary')} onClick={toggleBlacklist}>
                {g.is_blacklisted ? 'Retirer de la liste noire' : 'Ajouter à la liste noire'}
              </button>
            </div>
          )}
        </Section>
      </div>
      <Section title="Historique des séjours" flush>
        {reservations.loading && <Loading />}
        {reservations.data && reservations.data.length === 0 && <EmptyState title="Aucun séjour" />}
        {reservations.data && reservations.data.length > 0 && <ReservationsTable rows={reservations.data} showGuest={false} />}
      </Section>
      {hasPermission(user, PERMISSIONS.DOCUMENTS_VIEW) && <DocumentsPanel filters={{ guestId: g.id }} defaults={{ guestId: g.id, category: 'GUEST' }} />}
    </div>
  );
}

export default function GuestDetailPage() {
  return (
    <RequirePermission permission={PERMISSIONS.GUESTS_VIEW}>
      <GuestDetail />
    </RequirePermission>
  );
}
