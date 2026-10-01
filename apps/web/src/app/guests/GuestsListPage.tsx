import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, UsersRound } from 'lucide-react';
import type { GuestField, GuestInput } from '@darnalux/core';
import {
  GUEST_VERIFICATION_LABELS,
  GUEST_VERIFICATION_TONES,
  PERMISSIONS,
  emptyGuestInput,
  hasPermission,
  personFullName,
  validateGuestInput,
} from '@darnalux/core';
import type { GuestVerificationStatus } from '@darnalux/core';
import { useAuth } from '../../features/auth/AuthContext';
import { RequirePermission } from '../../features/auth/RequirePermission';
import { createGuest, listGuests } from '../../features/guests/api';
import { useAsync } from '../../lib/useAsync';
import { toUserMessage } from '../../lib/errors';
import { formatDate } from '../../lib/format';
import { Avatar, initialsOf } from '../../components/Avatar';
import { Badge, EmptyState, Modal, PageHeader, TextField } from '../../components/ui';
import { ErrorAlert, Loading } from '../../components/Feedback';

const VERIFICATION_STATUSES: GuestVerificationStatus[] = ['NOT_STARTED', 'PENDING', 'VERIFIED', 'REJECTED'];

function GuestsList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canManage = hasPermission(user, PERMISSIONS.GUESTS_MANAGE);
  const [search, setSearch] = useState('');
  const [verification, setVerification] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const guests = useAsync(() => listGuests({ search, verification }), [search, verification]);

  return (
    <div className="page-stack">
      <PageHeader
        title="Voyageurs"
        subtitle="Profils, historique des séjours et statut de vérification."
        actions={
          canManage && (
            <button type="button" className="btn btn-primary" onClick={() => setCreateOpen(true)}>
              <Plus size={16} aria-hidden="true" /> Nouveau voyageur
            </button>
          )
        }
      />
      <div className="filters">
        <input type="search" placeholder="Nom, email, téléphone…" aria-label="Rechercher" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select aria-label="Vérification" value={verification} onChange={(e) => setVerification(e.target.value)}>
          <option value="">Toutes les vérifications</option>
          {VERIFICATION_STATUSES.map((s) => (
            <option key={s} value={s}>{GUEST_VERIFICATION_LABELS[s]}</option>
          ))}
        </select>
      </div>
      {guests.loading && <Loading />}
      {guests.error && <ErrorAlert>{guests.error}</ErrorAlert>}
      {guests.data && guests.data.length === 0 && <EmptyState icon={UsersRound} title="Aucun voyageur" />}
      {guests.data && guests.data.length > 0 && (
        <section className="panel panel-flush">
          <div className="panel-head">
            <h2>Voyageurs</h2>
            <span className="panel-head-note">{guests.data.length} voyageur(s)</span>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Voyageur</th>
                  <th>Contact</th>
                  <th>Séjours</th>
                  <th>Vérification</th>
                  <th>Depuis</th>
                </tr>
              </thead>
              <tbody>
                {guests.data.map((g) => (
                  <tr key={g.id} className="row-link" onClick={() => navigate(`/app/guests/${g.id}`)}>
                    <td>
                      <Link className="person" to={`/app/guests/${g.id}`} onClick={(e) => e.stopPropagation()}>
                        <Avatar initials={initialsOf(g.first_name, g.last_name)} />
                        <span>{personFullName(g.first_name, g.last_name)}</span>
                      </Link>
                      {g.is_blacklisted && <Badge tone="danger">Liste noire</Badge>}
                    </td>
                    <td>
                      {g.email ?? '—'}
                      <small className="dim cell-sub">{g.phone ?? ''}</small>
                    </td>
                    <td>{g.reservations.length}</td>
                    <td><Badge tone={GUEST_VERIFICATION_TONES[g.verification_status]}>{GUEST_VERIFICATION_LABELS[g.verification_status]}</Badge></td>
                    <td>{formatDate(g.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {canManage && <CreateGuestModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={(id) => navigate(`/app/guests/${id}`)} />}
    </div>
  );
}

function CreateGuestModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const [input, setInput] = useState<GuestInput>(emptyGuestInput);
  const [errors, setErrors] = useState<Partial<Record<GuestField, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateGuestInput(input);
    setErrors(validation.errors);
    if (!validation.valid) return;
    setSaving(true);
    try {
      onCreated(await createGuest(input));
    } catch (err) {
      setError(toUserMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} title="Nouveau voyageur" onClose={onClose}>
      <form className="form-stack" onSubmit={handleSubmit} noValidate>
        {error && <ErrorAlert>{error}</ErrorAlert>}
        <div className="form-grid">
          <TextField label="Prénom" required value={input.firstName} error={errors.firstName} onChange={(e) => setInput((g) => ({ ...g, firstName: e.target.value }))} />
          <TextField label="Nom" required value={input.lastName} error={errors.lastName} onChange={(e) => setInput((g) => ({ ...g, lastName: e.target.value }))} />
          <TextField label="Email" type="email" value={input.email} error={errors.email} onChange={(e) => setInput((g) => ({ ...g, email: e.target.value }))} />
          <TextField label="Téléphone" type="tel" value={input.phone} error={errors.phone} onChange={(e) => setInput((g) => ({ ...g, phone: e.target.value }))} />
          <TextField label="Nationalité" value={input.nationality} onChange={(e) => setInput((g) => ({ ...g, nationality: e.target.value }))} />
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Annuler</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>Créer</button>
        </div>
      </form>
    </Modal>
  );
}

export default function GuestsListPage() {
  return (
    <RequirePermission permission={PERMISSIONS.GUESTS_VIEW}>
      <GuestsList />
    </RequirePermission>
  );
}
