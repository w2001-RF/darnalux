import { useState } from 'react';
import type { FormEvent } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { ReplyTemplateField, ReplyTemplateInput } from '@darnalux/core';
import { REPLY_TEMPLATE_VARIABLES, validateReplyTemplate } from '@darnalux/core';
import { useAuth } from '../../features/auth/AuthContext';
import { deleteReplyTemplate, saveReplyTemplate } from '../../features/leads/api';
import type { ReplyTemplateRow } from '../../features/leads/api';
import { toUserMessage } from '../../lib/errors';
import { Modal, SelectField, TextAreaField, TextField } from '../../components/ui';
import { ErrorAlert } from '../../components/Feedback';

const APPLIES_LABELS: Record<ReplyTemplateInput['applies_to'], string> = {
  ALL: 'Tous les types',
  QUOTE: 'Estimations et devis',
  CONTACT: 'Messages',
};

const emptyInput: ReplyTemplateInput = { name: '', subject: '', body: '', applies_to: 'ALL' };

export function ReplyTemplatesModal({
  open,
  canManage,
  templates,
  onClose,
  onChanged,
}: {
  open: boolean;
  canManage: boolean;
  templates: readonly ReplyTemplateRow[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const { user } = useAuth();
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [input, setInput] = useState<ReplyTemplateInput>(emptyInput);
  const [errors, setErrors] = useState<Partial<Record<ReplyTemplateField, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function startEdit(t: ReplyTemplateRow | null) {
    setEditingId(t ? t.id : 'new');
    setInput(t ? { name: t.name, subject: t.subject, body: t.body, applies_to: t.applies_to } : emptyInput);
    setErrors({});
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateReplyTemplate(input);
    setErrors(validation.errors);
    if (!validation.valid || !user) return;
    setSaving(true);
    setError(null);
    try {
      await saveReplyTemplate(input, user.id, editingId && editingId !== 'new' ? editingId : undefined);
      setEditingId(null);
      onChanged();
    } catch (err) {
      setError(toUserMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove(t: ReplyTemplateRow) {
    if (!window.confirm(`Supprimer le modèle « ${t.name} » ?`)) return;
    try {
      await deleteReplyTemplate(t.id);
      onChanged();
    } catch (err) {
      setError(toUserMessage(err));
    }
  }

  return (
    <Modal open={open} title="Modèles de réponse" onClose={onClose} wide>
      <div className="form-stack">
        {error && <ErrorAlert>{error}</ErrorAlert>}
        {editingId === null && (
          <>
            {templates.length === 0 && <p className="dim">Aucun modèle pour l'instant.</p>}
            <ul className="template-list">
              {templates.map((t) => (
                <li key={t.id}>
                  <div>
                    <strong>{t.name}</strong>
                    <small className="dim cell-sub">{APPLIES_LABELS[t.applies_to]}{t.subject ? ` · ${t.subject}` : ''}</small>
                  </div>
                  {canManage && (
                    <div className="row-actions">
                      <button type="button" className="icon-btn" aria-label={`Modifier ${t.name}`} onClick={() => startEdit(t)}><Pencil size={16} aria-hidden="true" /></button>
                      <button type="button" className="icon-btn" aria-label={`Supprimer ${t.name}`} onClick={() => void remove(t)}><Trash2 size={16} aria-hidden="true" /></button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
            {canManage && (
              <div className="form-actions">
                <button type="button" className="btn btn-primary" onClick={() => startEdit(null)}><Plus size={16} aria-hidden="true" /> Nouveau modèle</button>
              </div>
            )}
          </>
        )}
        {editingId !== null && (
          <form className="form-stack" onSubmit={handleSubmit} noValidate>
            <TextField label="Nom du modèle" required maxLength={80} value={input.name} error={errors.name} onChange={(e) => setInput((v) => ({ ...v, name: e.target.value }))} />
            <SelectField
              label="S'applique à"
              value={input.applies_to}
              options={(Object.keys(APPLIES_LABELS) as ReplyTemplateInput['applies_to'][]).map((k) => ({ value: k, label: APPLIES_LABELS[k] }))}
              onChange={(e) => setInput((v) => ({ ...v, applies_to: e.target.value as ReplyTemplateInput['applies_to'] }))}
            />
            <TextField label="Objet (e-mail)" maxLength={160} value={input.subject} error={errors.subject} onChange={(e) => setInput((v) => ({ ...v, subject: e.target.value }))} />
            <TextAreaField label="Texte" required rows={9} maxLength={4000} value={input.body} error={errors.body} onChange={(e) => setInput((v) => ({ ...v, body: e.target.value }))} />
            <p className="dim small">
              Variables disponibles : {REPLY_TEMPLATE_VARIABLES.map((v) => `{{${v.key}}}`).join(', ')}.
            </p>
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setEditingId(null)}>Annuler</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>Enregistrer</button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
