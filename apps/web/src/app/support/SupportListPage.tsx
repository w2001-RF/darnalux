import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LifeBuoy, Plus } from 'lucide-react';
import type { SupportTicketField, SupportTicketInput } from '@darnalux/core';
import {
  SUPPORT_CATEGORIES,
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_PRIORITIES,
  SUPPORT_PRIORITY_LABELS,
  SUPPORT_PRIORITY_TONES,
  SUPPORT_STATUSES,
  SUPPORT_STATUS_LABELS,
  SUPPORT_STATUS_TONES,
  validateSupportTicket,
} from '@darnalux/core';
import { useAuth } from '../../features/auth/AuthContext';
import { createTicket, listTickets } from '../../features/support/api';
import { useAsync } from '../../lib/useAsync';
import { toUserMessage } from '../../lib/errors';
import { formatRelative } from '../../lib/format';
import { Badge, EmptyState, Modal, PageHeader, SelectField, TextAreaField, TextField, optionsFrom } from '../../components/ui';
import { ErrorAlert, Loading } from '../../components/Feedback';

export default function SupportListPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('');
  const [open, setOpen] = useState(false);
  const tickets = useAsync(() => listTickets(status), [status]);

  return (
    <div className="page-stack">
      <PageHeader
        title="Support"
        subtitle="Échangez avec l'équipe DarnaLux : questions, incidents, demandes."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
            <Plus size={16} aria-hidden="true" /> Nouvelle conversation
          </button>
        }
      />
      <div className="filters">
        <select aria-label="Statut" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tous les statuts</option>
          {optionsFrom(SUPPORT_STATUSES, SUPPORT_STATUS_LABELS).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      {tickets.loading && <Loading />}
      {tickets.error && <ErrorAlert>{tickets.error}</ErrorAlert>}
      {tickets.data && tickets.data.length === 0 && <EmptyState icon={LifeBuoy} title="Aucune conversation" />}
      {tickets.data && tickets.data.length > 0 && (
        <section className="panel panel-flush">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Sujet</th>
                  <th>Catégorie</th>
                  <th>Priorité</th>
                  <th>Statut</th>
                  <th>Dernier message</th>
                </tr>
              </thead>
              <tbody>
                {tickets.data.map((t) => (
                  <tr key={t.id} className="row-link" onClick={() => navigate(`/app/support/${t.id}`)}>
                    <td><Link className="cell-title" to={`/app/support/${t.id}`} onClick={(e) => e.stopPropagation()}>{t.subject}</Link></td>
                    <td>{SUPPORT_CATEGORY_LABELS[t.category]}</td>
                    <td><Badge tone={SUPPORT_PRIORITY_TONES[t.priority]}>{SUPPORT_PRIORITY_LABELS[t.priority]}</Badge></td>
                    <td><Badge tone={SUPPORT_STATUS_TONES[t.status]}>{SUPPORT_STATUS_LABELS[t.status]}</Badge></td>
                    <td>
                      <span className="truncate">{t.support_messages[0]?.body ?? '—'}</span>
                      <small className="dim cell-sub">{formatRelative(t.last_message_at)}</small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <NewTicketModal open={open} onClose={() => setOpen(false)} onCreated={(id) => navigate(`/app/support/${id}`)} />
    </div>
  );
}

function NewTicketModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const { user } = useAuth();
  const [input, setInput] = useState<SupportTicketInput>({ subject: '', category: 'TECHNICAL', priority: 'MEDIUM', message: '' });
  const [errors, setErrors] = useState<Partial<Record<SupportTicketField, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateSupportTicket(input);
    setErrors(validation.errors);
    if (!validation.valid || !user) return;
    setSaving(true);
    try {
      onCreated(await createTicket(input, user.id));
    } catch (err) {
      setError(toUserMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} title="Nouvelle conversation de support" onClose={onClose}>
      <form className="form-stack" onSubmit={handleSubmit} noValidate>
        {error && <ErrorAlert>{error}</ErrorAlert>}
        <TextField label="Sujet" required maxLength={140} value={input.subject} error={errors.subject} onChange={(e) => setInput((v) => ({ ...v, subject: e.target.value }))} />
        <div className="form-grid">
          <SelectField label="Catégorie" value={input.category} options={optionsFrom(SUPPORT_CATEGORIES, SUPPORT_CATEGORY_LABELS)} onChange={(e) => setInput((v) => ({ ...v, category: e.target.value as SupportTicketInput['category'] }))} />
          <SelectField label="Priorité" value={input.priority} options={optionsFrom(SUPPORT_PRIORITIES, SUPPORT_PRIORITY_LABELS)} onChange={(e) => setInput((v) => ({ ...v, priority: e.target.value as SupportTicketInput['priority'] }))} />
        </div>
        <TextAreaField label="Message" required rows={5} value={input.message} error={errors.message} onChange={(e) => setInput((v) => ({ ...v, message: e.target.value }))} hint="Décrivez votre problème ou votre question en détail." />
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Annuler</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>Envoyer</button>
        </div>
      </form>
    </Modal>
  );
}
