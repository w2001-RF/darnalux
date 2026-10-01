import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Plus } from 'lucide-react';
import {
  PERMISSIONS,
  PROPERTY_STATUSES,
  PROPERTY_STATUS_LABELS,
  PROPERTY_STATUS_TONES,
  PROPERTY_TYPES,
  PROPERTY_TYPE_LABELS,
  hasPermission,
  personFullName,
} from '@darnalux/core';
import { useAuth } from '../../features/auth/AuthContext';
import { listCities, listProperties } from '../../features/properties/api';
import { useAsync } from '../../lib/useAsync';
import { Badge, EmptyState, PageHeader, optionsFrom } from '../../components/ui';
import { ErrorAlert, Loading } from '../../components/Feedback';

export default function PropertiesListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canManage = hasPermission(user, PERMISSIONS.PROPERTIES_MANAGE);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [city, setCity] = useState('');
  const [status, setStatus] = useState('');

  const cities = useAsync(listCities, []);
  const properties = useAsync(() => listProperties({ search, type, city, status }), [search, type, city, status]);

  return (
    <div className="page-stack">
      <PageHeader
        title="Biens"
        subtitle="Logements gérés par DarnaLux, leurs propriétaires et leur statut."
        actions={
          canManage && (
            <Link className="btn btn-primary" to="/app/properties/new">
              <Plus size={16} aria-hidden="true" /> Ajouter un bien
            </Link>
          )
        }
      />

      <div className="filters">
        <input type="search" placeholder="Nom, ville, adresse…" aria-label="Rechercher" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select aria-label="Type" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">Tous les types</option>
          {optionsFrom(PROPERTY_TYPES, PROPERTY_TYPE_LABELS).map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select aria-label="Ville" value={city} onChange={(e) => setCity(e.target.value)}>
          <option value="">Toutes les villes</option>
          {(cities.data ?? []).map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select aria-label="Statut" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tous les statuts</option>
          {optionsFrom(PROPERTY_STATUSES, PROPERTY_STATUS_LABELS).map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {properties.loading && <Loading label="Chargement des biens…" />}
      {properties.error && <ErrorAlert>{properties.error}</ErrorAlert>}
      {properties.data && properties.data.length === 0 && (
        <EmptyState
          icon={Building2}
          title="Aucun bien trouvé"
          text={canManage ? 'Commencez par ajouter votre premier bien.' : 'Aucun bien ne correspond à ces critères.'}
          action={canManage && <Link className="btn btn-primary" to="/app/properties/new">Ajouter un bien</Link>}
        />
      )}
      {properties.data && properties.data.length > 0 && (
        <section className="panel panel-flush">
          <div className="panel-head">
            <h2>Liste des biens</h2>
            <span className="panel-head-note">{properties.data.length} bien(s)</span>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Bien</th>
                  <th>Type</th>
                  <th>Ville</th>
                  <th>Capacité</th>
                  <th>Propriétaire</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {properties.data.map((property) => {
                  const primary = property.property_owners.find((link) => link.is_primary) ?? property.property_owners[0];
                  return (
                    <tr key={property.id} className="row-link" onClick={() => navigate(`/app/properties/${property.id}`)}>
                      <td>
                        <Link className="cell-title" to={`/app/properties/${property.id}`} onClick={(e) => e.stopPropagation()}>
                          {property.name}
                        </Link>
                        <small className="dim cell-sub">{property.address ?? '—'}</small>
                      </td>
                      <td><Badge tone="info">{PROPERTY_TYPE_LABELS[property.type]}</Badge></td>
                      <td>{property.city}</td>
                      <td>{property.capacity} pers. · {property.bedrooms} ch.</td>
                      <td>{primary?.owners ? personFullName(primary.owners.first_name, primary.owners.last_name) : <span className="dim">—</span>}</td>
                      <td><Badge tone={PROPERTY_STATUS_TONES[property.status]}>{PROPERTY_STATUS_LABELS[property.status]}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
