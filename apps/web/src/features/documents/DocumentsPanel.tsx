import { useState } from 'react';
import type { FormEvent } from 'react';
import { Download, FileText, Trash2, Upload } from 'lucide-react';
import type { DocumentCategory } from '@darnalux/core';
import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_CATEGORY_LABELS,
  DOCUMENT_CATEGORY_TONES,
  PERMISSIONS,
  formatFileSize,
  hasPermission,
  validateUpload,
} from '@darnalux/core';
import { useAuth } from '../auth/AuthContext';
import type { DocumentFilters, DocumentRow } from './api';
import { deleteDocument, listDocuments, setDocumentVisibility, uploadDocument } from './api';
import { useAsync } from '../../lib/useAsync';
import { toUserMessage } from '../../lib/errors';
import { openSignedFile } from '../../lib/files';
import { formatDate } from '../../lib/format';
import { Badge, EmptyState, Modal, SelectField, TextField, optionsFrom } from '../../components/ui';
import { ErrorAlert, Loading } from '../../components/Feedback';

interface DocumentsPanelProps {
  filters: DocumentFilters;
  defaults?: Partial<{ category: DocumentCategory; ownerId: string; propertyId: string; reservationId: string; guestId: string }>;
  portal?: boolean;
  title?: string;
}

export function DocumentsPanel({ filters, defaults = {}, portal = false, title = 'Documents' }: DocumentsPanelProps) {
  const { user } = useAuth();
  const canManage = !portal && hasPermission(user, PERMISSIONS.DOCUMENTS_MANAGE);
  const docs = useAsync(() => listDocuments(filters, portal), [JSON.stringify(filters), portal]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function open(doc: DocumentRow) {
    try {
      await openSignedFile('documents', doc.storage_path);
    } catch (error) {
      setActionError(toUserMessage(error));
    }
  }

  async function remove(doc: DocumentRow) {
    if (!window.confirm(`Supprimer définitivement « ${doc.title} » ?`)) return;
    try {
      await deleteDocument(doc);
      docs.reload();
    } catch (error) {
      setActionError(toUserMessage(error));
    }
  }

  async function toggleVisibility(doc: DocumentRow) {
    try {
      await setDocumentVisibility(doc.id, !doc.visible_to_owner);
      docs.reload();
    } catch (error) {
      setActionError(toUserMessage(error));
    }
  }

  return (
    <section className="panel panel-flush">
      <div className="panel-head">
        <h2>{title}</h2>
        {canManage && (
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setUploadOpen(true)}>
            <Upload size={15} aria-hidden="true" /> Ajouter
          </button>
        )}
      </div>
      {actionError && <div className="panel-pad"><ErrorAlert>{actionError}</ErrorAlert></div>}
      {docs.loading && <Loading />}
      {docs.error && <div className="panel-pad"><ErrorAlert>{docs.error}</ErrorAlert></div>}
      {docs.data && docs.data.length === 0 && <EmptyState icon={FileText} title="Aucun document" />}
      {docs.data && docs.data.length > 0 && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Document</th>
                <th>Catégorie</th>
                {!portal && <th>Lié à</th>}
                <th>Ajouté le</th>
                {!portal && <th>Propriétaire</th>}
                <th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {docs.data.map((doc) => (
                <tr key={doc.id}>
                  <td>
                    <span className="cell-title">{doc.title}</span>
                    <small className="dim cell-sub">
                      {formatFileSize(doc.size_bytes)}
                      {doc.expires_on && ` · expire le ${formatDate(doc.expires_on)}`}
                    </small>
                  </td>
                  <td><Badge tone={DOCUMENT_CATEGORY_TONES[doc.category]}>{DOCUMENT_CATEGORY_LABELS[doc.category]}</Badge></td>
                  {!portal && (
                    <td className="dim">
                      {[
                        doc.properties?.name,
                        doc.owners ? `${doc.owners.first_name} ${doc.owners.last_name}` : null,
                        doc.reservations?.reference,
                      ]
                        .filter(Boolean)
                        .join(' · ') || '—'}
                    </td>
                  )}
                  <td>{formatDate(doc.created_at)}</td>
                  {!portal && (
                    <td>
                      {canManage ? (
                        <button type="button" className="btn btn-link btn-sm" onClick={() => toggleVisibility(doc)}>
                          {doc.visible_to_owner ? 'Partagé' : 'Interne'}
                        </button>
                      ) : (
                        <Badge tone={doc.visible_to_owner ? 'success' : 'neutral'}>{doc.visible_to_owner ? 'Partagé' : 'Interne'}</Badge>
                      )}
                    </td>
                  )}
                  <td className="cell-actions">
                    <button type="button" className="icon-btn" onClick={() => open(doc)} aria-label={`Ouvrir ${doc.title}`} title="Ouvrir">
                      <Download size={16} aria-hidden="true" />
                    </button>
                    {canManage && (
                      <button type="button" className="icon-btn" onClick={() => remove(doc)} aria-label={`Supprimer ${doc.title}`} title="Supprimer">
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {canManage && (
        <UploadDocumentModal
          open={uploadOpen}
          defaults={defaults}
          onClose={() => setUploadOpen(false)}
          onUploaded={() => {
            setUploadOpen(false);
            docs.reload();
          }}
        />
      )}
    </section>
  );
}

function UploadDocumentModal({
  open,
  defaults,
  onClose,
  onUploaded,
}: {
  open: boolean;
  defaults: DocumentsPanelProps['defaults'];
  onClose: () => void;
  onUploaded: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<DocumentCategory>(defaults?.category ?? 'OTHER');
  const [visibleToOwner, setVisibleToOwner] = useState(false);
  const [expiresOn, setExpiresOn] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setError('Choisissez un fichier.');
      return;
    }
    const uploadError = validateUpload(file);
    if (uploadError) {
      setError(uploadError);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await uploadDocument({
        file,
        title,
        category,
        ownerId: defaults?.ownerId ?? null,
        propertyId: defaults?.propertyId ?? null,
        reservationId: defaults?.reservationId ?? null,
        guestId: defaults?.guestId ?? null,
        visibleToOwner,
        expiresOn: expiresOn || null,
      });
      setFile(null);
      setTitle('');
      onUploaded();
    } catch (err) {
      setError(toUserMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} title="Ajouter un document" onClose={onClose}>
      <form className="form-stack" onSubmit={handleSubmit}>
        {error && <ErrorAlert>{error}</ErrorAlert>}
        <div className="field">
          <label htmlFor="doc-file">Fichier (PDF, image, Word, Excel — 10 Mo max.)</label>
          <input
            id="doc-file"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.csv,.docx,.xlsx"
            onChange={(e) => {
              const selected = e.target.files?.[0] ?? null;
              setFile(selected);
              if (selected && !title) setTitle(selected.name.replace(/\.[^.]+$/, ''));
            }}
          />
        </div>
        <TextField label="Titre" value={title} onChange={(e) => setTitle(e.target.value)} />
        <SelectField
          label="Catégorie"
          value={category}
          options={optionsFrom(DOCUMENT_CATEGORIES, DOCUMENT_CATEGORY_LABELS)}
          onChange={(e) => setCategory(e.target.value as DocumentCategory)}
        />
        <TextField label="Date d'expiration (optionnel)" type="date" value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} />
        {(defaults?.ownerId || defaults?.propertyId) && (
          <label className="checkbox-line">
            <input type="checkbox" checked={visibleToOwner} onChange={(e) => setVisibleToOwner(e.target.checked)} />
            Partager avec le propriétaire (visible dans son espace)
          </label>
        )}
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Annuler</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Envoi…' : 'Téléverser'}</button>
        </div>
      </form>
    </Modal>
  );
}
