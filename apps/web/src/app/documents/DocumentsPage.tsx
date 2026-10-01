import { useState } from 'react';
import { DOCUMENT_CATEGORIES, DOCUMENT_CATEGORY_LABELS } from '@darnalux/core';
import { useAuth } from '../../features/auth/AuthContext';
import { isPortalUser } from '../../features/auth/portal';
import { DocumentsPanel } from '../../features/documents/DocumentsPanel';
import { PageHeader, optionsFrom } from '../../components/ui';

export default function DocumentsPage() {
  const { user } = useAuth();
  const portal = isPortalUser(user);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');

  return (
    <div className="page-stack">
      <PageHeader
        title={portal ? 'Mes documents' : 'Documents'}
        subtitle={portal ? 'Contrats, rapports et factures partagés par DarnaLux.' : 'Stockage privé : chaque ouverture génère un lien temporaire sécurisé.'}
      />
      <div className="filters">
        <input type="search" placeholder="Titre…" aria-label="Rechercher" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select aria-label="Catégorie" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Toutes les catégories</option>
          {optionsFrom(DOCUMENT_CATEGORIES, DOCUMENT_CATEGORY_LABELS).map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      <DocumentsPanel filters={{ category, search }} portal={portal} title="Tous les documents" />
    </div>
  );
}
