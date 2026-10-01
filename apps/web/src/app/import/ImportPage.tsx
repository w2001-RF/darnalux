import { useState } from 'react';
import { Download, Upload } from 'lucide-react';
import type { ImportEntity, ImportIssue } from '@darnalux/core';
import { IMPORT_TEMPLATES, PERMISSIONS, mapOwnerRecords, mapPropertyRecords, mapReservationRecords, parseCsv, rowsToRecords } from '@darnalux/core';
import { RequirePermission } from '../../features/auth/RequirePermission';
import type { ImportOutcome } from '../../features/import/api';
import { importOwners, importProperties, importReservations } from '../../features/import/api';
import { toUserMessage } from '../../lib/errors';
import { downloadCsv } from '../../lib/files';
import { PageHeader, Section, Tabs } from '../../components/ui';
import { ErrorAlert, InfoAlert } from '../../components/Feedback';

const ENTITY_LABELS: Record<ImportEntity, string> = {
  owners: 'Propriétaires',
  properties: 'Biens',
  reservations: 'Réservations',
};

interface Preview {
  valid: number;
  issues: ImportIssue[];
  sample: string[][];
  run: () => Promise<ImportOutcome>;
}

function Import() {
  const [entity, setEntity] = useState<ImportEntity>('owners');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [outcome, setOutcome] = useState<ImportOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  async function handleFile(file: File | undefined) {
    setPreview(null);
    setOutcome(null);
    setError(null);
    if (!file) return;
    if (/\.xlsx?$/i.test(file.name)) {
      setError('Enregistrez votre fichier Excel au format CSV (Fichier › Enregistrer sous › CSV UTF-8) puis importez-le.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Fichier trop volumineux (5 Mo maximum).');
      return;
    }
    const rows = parseCsv(await file.text());
    const records = rowsToRecords(rows);
    if (records.length === 0) {
      setError('Le fichier ne contient aucune ligne de données.');
      return;
    }
    if (entity === 'owners') {
      const mapped = mapOwnerRecords(records);
      setPreview({ valid: mapped.rows.length, issues: mapped.issues, sample: rows.slice(0, 6), run: () => importOwners(mapped.rows) });
    } else if (entity === 'properties') {
      const mapped = mapPropertyRecords(records);
      setPreview({ valid: mapped.rows.length, issues: mapped.issues, sample: rows.slice(0, 6), run: () => importProperties(mapped.rows) });
    } else {
      const mapped = mapReservationRecords(records);
      setPreview({ valid: mapped.rows.length, issues: mapped.issues, sample: rows.slice(0, 6), run: () => importReservations(mapped.rows) });
    }
  }

  async function runImport() {
    if (!preview) return;
    setRunning(true);
    setError(null);
    try {
      setOutcome(await preview.run());
      setPreview(null);
    } catch (err) {
      setError(toUserMessage(err));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="page-stack">
      <PageHeader title="Import" subtitle="Importez vos biens, propriétaires et réservations depuis un fichier CSV (Excel : exporter en CSV)." />
      <Tabs
        tabs={(Object.keys(ENTITY_LABELS) as ImportEntity[]).map((id) => ({ id, label: ENTITY_LABELS[id] }))}
        active={entity}
        onChange={(id) => {
          setEntity(id);
          setPreview(null);
          setOutcome(null);
        }}
      />
      <Section title={`1. Modèle — ${ENTITY_LABELS[entity]}`}>
        <p className="dim">Colonnes attendues (séparateur « ; » ou « , ») : <code>{IMPORT_TEMPLATES[entity].join(' ; ')}</code></p>
        {entity === 'reservations' && (
          <InfoAlert>
            Le bien est retrouvé par son nom exact. Les dates acceptent AAAA-MM-JJ ou JJ/MM/AAAA. Un voyageur est réutilisé
            s'il existe déjà avec le même email, sinon il est créé.
          </InfoAlert>
        )}
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => downloadCsv(`modele-${entity}.csv`, [IMPORT_TEMPLATES[entity]])}>
          <Download size={15} aria-hidden="true" /> Télécharger le modèle
        </button>
      </Section>
      <Section title="2. Fichier">
        <label className="btn btn-primary">
          <Upload size={15} aria-hidden="true" /> Choisir un fichier CSV
          <input type="file" accept=".csv,text/csv" hidden onChange={(e) => handleFile(e.target.files?.[0])} />
        </label>
        {error && <ErrorAlert>{error}</ErrorAlert>}
      </Section>
      {preview && (
        <Section title="3. Vérification avant import">
          <p>
            <strong>{preview.valid}</strong> ligne(s) valide(s) · <strong>{preview.issues.length}</strong> ligne(s) en erreur (ignorées)
          </p>
          {preview.issues.length > 0 && (
            <ul className="issue-list">
              {preview.issues.slice(0, 50).map((issue) => (
                <li key={issue.line}>Ligne {issue.line} : {issue.message}</li>
              ))}
            </ul>
          )}
          <div className="table-wrap">
            <table className="data-table">
              <tbody>
                {preview.sample.map((row, i) => (
                  <tr key={i}>{row.map((cell, j) => (i === 0 ? <th key={j}>{cell}</th> : <td key={j}>{cell}</td>))}</tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-primary" onClick={runImport} disabled={running || preview.valid === 0}>
              {running ? 'Import en cours…' : `Importer ${preview.valid} ligne(s)`}
            </button>
          </div>
        </Section>
      )}
      {outcome && (
        <Section title="Résultat">
          <p><strong>{outcome.created}</strong> élément(s) créé(s).</p>
          {outcome.failures.length > 0 && (
            <ul className="issue-list">
              {outcome.failures.map((f) => (
                <li key={f.line}>Ligne {f.line} : {f.message}</li>
              ))}
            </ul>
          )}
        </Section>
      )}
    </div>
  );
}

export default function ImportPage() {
  return (
    <RequirePermission permission={PERMISSIONS.IMPORT_RUN}>
      <Import />
    </RequirePermission>
  );
}
