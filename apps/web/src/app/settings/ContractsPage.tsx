import { useState } from 'react';
import { CheckCircle2, Eye, FileSignature, Lock, Pencil, Plus, Trash2 } from 'lucide-react';
import { CONTRACT_PLACEHOLDERS, DEFAULT_CONTRACT_TEMPLATE, PERMISSIONS, renderContract, unknownPlaceholders } from '@darnalux/core';
import { RequirePermission } from '../../features/auth/RequirePermission';
import type { ContractTemplateRow } from '../../features/contracts/api';
import {
  activateContractTemplate,
  createContractTemplate,
  deleteContractTemplate,
  listContractTemplates,
  updateContractTemplate,
} from '../../features/contracts/api';
import { useAsync } from '../../lib/useAsync';
import { toUserMessage } from '../../lib/errors';
import { formatDateTime } from '../../lib/format';
import { Badge, Modal, PageHeader, Section, TextAreaField, TextField } from '../../components/ui';
import { ErrorAlert, InfoAlert, Loading } from '../../components/Feedback';

const SAMPLE_VALUES = {
  guest_full_name: 'Amina Benali',
  guest_document_number: 'AB123456',
  property_name: 'Villa Atlas',
  property_address: '12 avenue Mohammed V',
  property_city: 'Rabat',
  check_in: '11/04/2026',
  check_out: '18/04/2026',
  nights: 7,
  guests_count: 2,
  reservation_reference: 'DL-EXEMPLE',
  today: new Date().toLocaleDateString('fr-MA'),
  company_name: 'DarnaLux Conciergerie',
};

function Contracts() {
  const templates = useAsync(listContractTemplates, []);
  const [preview, setPreview] = useState<ContractTemplateRow | null>(null);
  const [editing, setEditing] = useState<{ id: string | null; name: string; body: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
      templates.reload();
    } catch (err) {
      setError(toUserMessage(err));
    }
  }

  async function saveEditing() {
    if (!editing) return;
    if (!editing.name.trim() || !editing.body.trim()) {
      setError('Le titre et le contenu sont obligatoires.');
      return;
    }
    await run(() => (editing.id ? updateContractTemplate(editing.id, editing.name, editing.body) : createContractTemplate(editing.name, editing.body)));
    setEditing(null);
  }

  const active = templates.data?.find((t) => t.is_active);
  const unknown = editing ? unknownPlaceholders(editing.body) : [];

  return (
    <div className="page-stack">
      <PageHeader
        title="Contrats"
        subtitle="Modèle de contrat signé électroniquement par le voyageur lors du check-in."
        actions={
          <>
            {active && <Badge tone="success">Actif : {active.name}</Badge>}
            <button type="button" className="btn btn-primary" onClick={() => setEditing({ id: null, name: 'Mon contrat personnalisé', body: DEFAULT_CONTRACT_TEMPLATE })}>
              <Plus size={16} aria-hidden="true" /> Créer mon propre contrat
            </button>
          </>
        }
      />
      {error && <ErrorAlert>{error}</ErrorAlert>}
      {templates.loading && <Loading />}
      {templates.data && (
        <div className="card-grid">
          {templates.data.map((t) => (
            <article key={t.id} className={'contract-card' + (t.is_active ? ' active' : '')}>
              <div className="contract-card-head">
                <span className="role-card-icon"><FileSignature size={20} aria-hidden="true" /></span>
                <div>
                  <h3>{t.name}</h3>
                  <div className="chips">
                    <Badge tone={t.kind === 'DEFAULT' ? 'info' : 'gold'}>{t.kind === 'DEFAULT' ? 'Par défaut' : 'Personnalisé'}</Badge>
                    {t.is_active ? <Badge tone="success">Actif</Badge> : <Badge>Inactif</Badge>}
                  </div>
                </div>
              </div>
              <p className="dim small">Mis à jour le {formatDateTime(t.updated_at)}</p>
              <div className="inline-actions">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPreview(t)}>
                  <Eye size={14} aria-hidden="true" /> Voir
                </button>
                {!t.is_locked && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing({ id: t.id, name: t.name, body: t.body })}>
                    <Pencil size={14} aria-hidden="true" /> Modifier
                  </button>
                )}
                {!t.is_active && (
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => run(() => activateContractTemplate(t.id))}>
                    <CheckCircle2 size={14} aria-hidden="true" /> Activer ce contrat
                  </button>
                )}
                {!t.is_locked && !t.is_active && (
                  <button type="button" className="icon-btn" aria-label={`Supprimer ${t.name}`} onClick={() => window.confirm('Supprimer ce contrat ?') && run(() => deleteContractTemplate(t.id))}>
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                )}
              </div>
              {t.is_locked && (
                <p className="dim small"><Lock size={12} aria-hidden="true" /> Ce contrat ne peut pas être modifié ou supprimé.</p>
              )}
            </article>
          ))}
        </div>
      )}
      <Section title="Comment utiliser les contrats">
        <div className="app-grid">
          <div>
            <h3 className="section-title">Champs disponibles</h3>
            <ul className="placeholder-list">
              {Object.entries(CONTRACT_PLACEHOLDERS).map(([key, label]) => (
                <li key={key}><code>{`{{${key}}}`}</code> <span className="dim">{label}</span></li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="section-title">Fonctionnement</h3>
            <ul className="check-list">
              <li>Un seul contrat est actif à la fois.</li>
              <li>Les champs sont remplacés automatiquement par les informations de la réservation.</li>
              <li>Le voyageur lit, accepte et signe le contrat à l'étape « Contrat » du check-in.</li>
              <li>Une copie exacte du texte signé est conservée avec la date de signature.</li>
            </ul>
            <InfoAlert>Faites valider le texte de vos contrats par un conseiller juridique avant de l'activer.</InfoAlert>
          </div>
        </div>
      </Section>

      <Modal open={Boolean(preview)} title={`Aperçu — ${preview?.name ?? ''}`} onClose={() => setPreview(null)} wide>
        <p className="dim small">Exemple rempli avec des données fictives.</p>
        <pre className="contract-text">{preview ? renderContract(preview.body, SAMPLE_VALUES) : ''}</pre>
      </Modal>

      <Modal
        open={Boolean(editing)}
        title={editing?.id ? 'Modifier le contrat' : 'Créer mon propre contrat'}
        onClose={() => setEditing(null)}
        wide
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>Annuler</button>
            <button type="button" className="btn btn-primary" onClick={saveEditing}>Enregistrer</button>
          </>
        }
      >
        {editing && (
          <div className="form-stack">
            <InfoAlert>Le contrat par défaut est préchargé comme base : modifiez-le librement.</InfoAlert>
            <TextField label="Titre du contrat" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            <TextAreaField label="Contenu du contrat" rows={18} value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} className="mono" />
            {unknown.length > 0 && <ErrorAlert>Champs inconnus : {unknown.map((u) => `{{${u}}}`).join(', ')} — ils ne seront pas remplacés.</ErrorAlert>}
          </div>
        )}
      </Modal>
    </div>
  );
}

export default function ContractsPage() {
  return (
    <RequirePermission permission={PERMISSIONS.CONTRACTS_MANAGE}>
      <Contracts />
    </RequirePermission>
  );
}
