import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { Send } from 'lucide-react';
import type { SupportStatus } from '@darnalux/core';
import {
  PERMISSIONS,
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_PRIORITY_LABELS,
  SUPPORT_PRIORITY_TONES,
  SUPPORT_STATUSES,
  SUPPORT_STATUS_LABELS,
  SUPPORT_STATUS_TONES,
  hasPermission,
  validateSupportMessage,
} from '@darnalux/core';
import { useAuth } from '../../features/auth/AuthContext';
import { getTicket, listMessages, sendMessage, setTicketStatus } from '../../features/support/api';
import { useAsync } from '../../lib/useAsync';
import { toUserMessage } from '../../lib/errors';
import { formatDateTime } from '../../lib/format';
import { Badge, PageHeader } from '../../components/ui';
import { ErrorAlert, Loading } from '../../components/Feedback';

export default function SupportTicketPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { user } = useAuth();
  const isStaff = hasPermission(user, PERMISSIONS.SUPPORT_MANAGE);
  const ticket = useAsync(() => getTicket(id), [id]);
  const messages = useAsync(() => listMessages(id), [id]);
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.data]);

  if (ticket.loading) return <Loading />;
  if (ticket.error || !ticket.data) return <ErrorAlert>{ticket.error ?? 'Conversation introuvable.'}</ErrorAlert>;
  const t = ticket.data;
  const closed = t.status === 'CLOSED';

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const problem = validateSupportMessage(body);
    if (problem) {
      setError(problem);
      return;
    }
    if (!user) return;
    setError(null);
    try {
      await sendMessage(t.id, body, user.id);
      setBody('');
      messages.reload();
      ticket.reload();
    } catch (err) {
      setError(toUserMessage(err));
    }
  }

  async function changeStatus(status: SupportStatus) {
    try {
      await setTicketStatus(t.id, status);
      ticket.reload();
    } catch (err) {
      setError(toUserMessage(err));
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        back={{ to: '/app/support', label: 'Support' }}
        title={t.subject}
        subtitle={
          <>
            <Badge>{SUPPORT_CATEGORY_LABELS[t.category]}</Badge> <Badge tone={SUPPORT_PRIORITY_TONES[t.priority]}>{SUPPORT_PRIORITY_LABELS[t.priority]}</Badge>{' '}
            <Badge tone={SUPPORT_STATUS_TONES[t.status]}>{SUPPORT_STATUS_LABELS[t.status]}</Badge>
          </>
        }
        actions={
          isStaff ? (
            <select aria-label="Statut" value={t.status} onChange={(e) => changeStatus(e.target.value as SupportStatus)}>
              {SUPPORT_STATUSES.map((s) => <option key={s} value={s}>{SUPPORT_STATUS_LABELS[s]}</option>)}
            </select>
          ) : (
            !closed && t.created_by === user?.id && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => window.confirm('Clôturer cette conversation ?') && changeStatus('CLOSED')}>
                Clôturer
              </button>
            )
          )
        }
      />
      {error && <ErrorAlert>{error}</ErrorAlert>}
      <section className="panel chat">
        {messages.loading && <Loading />}
        <div className="chat-thread">
          {(messages.data ?? []).map((m) => {
            const mine = m.author_id === user?.id;
            return (
              <div key={m.id} className={'chat-message' + (mine ? ' mine' : '')}>
                <div className="chat-meta">{mine ? 'Vous' : m.author_id === t.created_by ? 'Demandeur' : 'Équipe DarnaLux'} · {formatDateTime(m.created_at)}</div>
                <div className="chat-bubble">{m.body}</div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
        {closed ? (
          <p className="dim">Conversation clôturée.</p>
        ) : (
          <form className="chat-form" onSubmit={send}>
            <textarea aria-label="Votre message" rows={3} placeholder="Tapez votre message…" value={body} onChange={(e) => setBody(e.target.value)} maxLength={5000} />
            <button type="submit" className="btn btn-primary">
              <Send size={15} aria-hidden="true" /> Envoyer
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
