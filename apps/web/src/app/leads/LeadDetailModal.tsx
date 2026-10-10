import { useEffect, useMemo, useState } from 'react';
import { Mail, MessageCircle } from 'lucide-react';
import type { LeadStatus } from '@darnalux/core';
import {
  LEAD_KIND_LABELS,
  LEAD_STATUS_LABELS,
  LEAD_STATUSES,
  buildMailtoUrl,
  buildWhatsappUrl,
  fillTemplate,
  leadTemplateValues,
} from '@darnalux/core';
import { updateLead } from '../../features/leads/api';
import type { LeadRow, ReplyTemplateRow } from '../../features/leads/api';
import { toUserMessage } from '../../lib/errors';
import { formatDateTime } from '../../lib/format';
import { Facts, Modal, SelectField, TextAreaField, TextField, optionsFrom } from '../../components/ui';
import { ErrorAlert } from '../../components/Feedback';

const MAD = new Intl.NumberFormat('fr-FR');

export function LeadDetailModal({
  lead,
  templates,
  canManage,
  onClose,
  onChanged,
}: {
  lead: LeadRow | null;
  templates: readonly ReplyTemplateRow[];
  canManage: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  return (
    <Modal open={lead !== null} title={lead ? `${LEAD_KIND_LABELS[lead.kind]} · ${lead.full_name}` : ''} onClose={onClose} wide>
      {lead && <LeadDetail key={lead.id} lead={lead} templates={templates} canManage={canManage} onChanged={onChanged} />}
    </Modal>
  );
}

function LeadDetail({
  lead,
  templates,
  canManage,
  onChanged,
}: {
  lead: LeadRow;
  templates: readonly ReplyTemplateRow[];
  canManage: boolean;
  onChanged: () => void;
}) {
  const [status, setStatus] = useState<LeadStatus>(lead.status);
  const [notes, setNotes] = useState(lead.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applicable = useMemo(() => templates.filter((t) => t.applies_to === 'ALL' || t.applies_to === lead.kind), [templates, lead.kind]);
  const values = useMemo(() => leadTemplateValues(lead), [lead]);
  const [templateId, setTemplateId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  // Preselect the first applicable template once templates have loaded.
  useEffect(() => {
    if (templateId === '' && applicable.length > 0) {
      const first = applicable[0];
      setTemplateId(first.id);
      setSubject(fillTemplate(first.subject, values));
      setBody(fillTemplate(first.body, values));
    }
  }, [applicable, templateId, values]);

  function pickTemplate(id: string) {
    setTemplateId(id);
    const t = applicable.find((x) => x.id === id);
    if (t) {
      setSubject(fillTemplate(t.subject, values));
      setBody(fillTemplate(t.body, values));
    }
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await updateLead(lead.id, { status, notes: notes.trim() === '' ? null : notes });
      onChanged();
    } catch (err) {
      setError(toUserMessage(err));
    } finally {
      setSaving(false);
    }
  }

  // Records that a reply was opened (not that it was delivered).
  async function markReplied(channel: 'EMAIL' | 'WHATSAPP') {
    if (!canManage) return;
    try {
      const nextStatus = lead.status === 'NEW' ? 'IN_PROGRESS' : undefined;
      await updateLead(lead.id, { last_reply_channel: channel, last_reply_at: new Date().toISOString(), ...(nextStatus ? { status: nextStatus } : {}) });
      if (nextStatus) setStatus(nextStatus);
      onChanged();
    } catch (err) {
      setError(toUserMessage(err));
    }
  }

  const mailto = buildMailtoUrl(lead.email, subject, body);
  const whatsapp = buildWhatsappUrl(lead.phone, body);

  const facts = [
    { label: 'Reçue le', value: formatDateTime(lead.created_at) },
    { label: 'E-mail', value: lead.email },
    { label: 'Téléphone', value: lead.phone ?? '—' },
    ...(lead.kind === 'QUOTE'
      ? [
          { label: 'Zone', value: lead.zone_label ?? '—' },
          { label: 'Adresse', value: lead.address ?? '—' },
          { label: 'Configuration', value: lead.config_label ?? '—' },
          { label: 'Situation actuelle', value: lead.situation ?? '—' },
          { label: 'Accompagnement', value: lead.support ?? '—' },
          { label: 'Créneau souhaité', value: lead.preferred_slot ?? '—' },
          {
            label: 'Estimation affichée',
            value: lead.estimate_low !== null && lead.estimate_high !== null ? `${MAD.format(lead.estimate_low)} – ${MAD.format(lead.estimate_high)} MAD / mois` : 'Analyse sur mesure',
          },
        ]
      : []),
  ];

  return (
    <div className="form-stack">
      {error && <ErrorAlert>{error}</ErrorAlert>}
      <Facts items={facts} />
      {lead.message && (
        <div className="lead-message">
          <strong>Message</strong>
          <p>{lead.message}</p>
        </div>
      )}

      <div className="form-grid">
        <SelectField label="Statut" value={status} disabled={!canManage} options={optionsFrom(LEAD_STATUSES, LEAD_STATUS_LABELS)} onChange={(e) => setStatus(e.target.value as LeadStatus)} />
      </div>
      <TextAreaField label="Notes internes" rows={3} value={notes} disabled={!canManage} maxLength={4000} onChange={(e) => setNotes(e.target.value)} />
      {canManage && (
        <div className="form-actions">
          <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>Enregistrer</button>
        </div>
      )}

      <hr className="divider" />
      <h4 className="subhead">Répondre</h4>
      {applicable.length > 0 && (
        <SelectField label="Modèle" value={templateId} options={applicable.map((t) => ({ value: t.id, label: t.name }))} onChange={(e) => pickTemplate(e.target.value)} />
      )}
      <TextField label="Objet (e-mail)" value={subject} onChange={(e) => setSubject(e.target.value)} />
      <TextAreaField label="Message" rows={8} value={body} onChange={(e) => setBody(e.target.value)} hint="Modifiable avant l'envoi. Les variables inconnues restent visibles : corrigez-les." />
      <div className="form-actions">
        <a className="btn btn-primary" href={mailto} onClick={() => void markReplied('EMAIL')}>
          <Mail size={16} aria-hidden="true" /> Répondre par e-mail
        </a>
        {whatsapp ? (
          <a className="btn btn-gold" href={whatsapp} target="_blank" rel="noopener noreferrer" onClick={() => void markReplied('WHATSAPP')}>
            <MessageCircle size={16} aria-hidden="true" /> Répondre sur WhatsApp
          </a>
        ) : (
          <button type="button" className="btn btn-gold" disabled title="Aucun numéro valide pour WhatsApp">
            <MessageCircle size={16} aria-hidden="true" /> Répondre sur WhatsApp
          </button>
        )}
      </div>
      <p className="dim small">
        Ces boutons ouvrent votre messagerie ou WhatsApp avec le texte prérempli. L'envoi se fait depuis votre application, rien n'est transmis automatiquement.
        {lead.last_reply_at && ` Dernière réponse ouverte : ${formatDateTime(lead.last_reply_at)}.`}
      </p>
    </div>
  );
}
