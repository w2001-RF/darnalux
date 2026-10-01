import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ExternalLink, ImagePlus, Pencil, Star, Trash2 } from 'lucide-react';
import type { BookingChannel } from '@darnalux/core';
import {
  BOOKING_CHANNELS,
  BOOKING_CHANNEL_LABELS,
  IMAGE_MIME_TYPES,
  PERMISSIONS,
  PROPERTY_STATUS_LABELS,
  PROPERTY_STATUS_TONES,
  PROPERTY_TYPE_LABELS,
  computePeriodPerformance,
  formatMoney,
  formatPercent,
  hasPermission,
  personFullName,
  startOfMonth,
  startOfNextMonth,
  validateUpload,
} from '@darnalux/core';
import { useAuth } from '../../features/auth/AuthContext';
import { isPortalUser } from '../../features/auth/portal';
import type { PropertyAccessRow, PropertyImageRow, PropertyListRow } from '../../features/properties/api';
import {
  addListing,
  deleteImage,
  deleteListing,
  getProperty,
  getPropertyAccess,
  linkOwner,
  listImages,
  listListings,
  savePropertyAccess,
  setCoverImage,
  toggleListing,
  unlinkOwner,
  uploadImage,
} from '../../features/properties/api';
import { listOwnerOptions } from '../../features/owners/api';
import { listReservations, listReservationsForPeriod } from '../../features/reservations/api';
import { listExpenses } from '../../features/finance/api';
import { ReservationsTable } from '../../features/reservations/ReservationsTable';
import { DocumentsPanel } from '../../features/documents/DocumentsPanel';
import { useAsync } from '../../lib/useAsync';
import { toUserMessage } from '../../lib/errors';
import { signedUrls } from '../../lib/files';
import { Badge, EmptyState, Facts, PageHeader, Section, SelectField, StatCard, Tabs, TextAreaField, TextField, optionsFrom } from '../../components/ui';
import { ErrorAlert, InfoAlert, Loading } from '../../components/Feedback';

type TabId = 'overview' | 'access' | 'listings' | 'photos' | 'owners' | 'reservations' | 'documents' | 'performance';

export default function PropertyDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { user } = useAuth();
  const portal = isPortalUser(user);
  const canManage = hasPermission(user, PERMISSIONS.PROPERTIES_MANAGE);
  const canSeeAccess = hasPermission(user, PERMISSIONS.PROPERTIES_ACCESS_VIEW);
  const canSeeOwners = hasPermission(user, PERMISSIONS.OWNERS_VIEW);
  const canSeeDocs = hasPermission(user, PERMISSIONS.DOCUMENTS_VIEW) || portal;
  const canSeeFinance = hasPermission(user, PERMISSIONS.FINANCE_VIEW) || portal;
  const [tab, setTab] = useState<TabId>('overview');
  const property = useAsync(() => getProperty(id), [id]);

  if (property.loading) return <Loading />;
  if (property.error || !property.data) return <ErrorAlert>{property.error ?? 'Bien introuvable.'}</ErrorAlert>;
  const p = property.data;

  const tabs: { id: TabId; label: string }[] = [
    { id: 'overview', label: 'Aperçu' },
    ...(canSeeAccess ? [{ id: 'access' as const, label: 'Accès & procédures' }] : []),
    { id: 'listings', label: 'Annonces' },
    { id: 'photos', label: 'Photos' },
    ...(canSeeOwners ? [{ id: 'owners' as const, label: 'Propriétaires' }] : []),
    { id: 'reservations', label: 'Réservations' },
    ...(canSeeDocs ? [{ id: 'documents' as const, label: 'Documents' }] : []),
    ...(canSeeFinance ? [{ id: 'performance' as const, label: 'Performance' }] : []),
  ];

  return (
    <div className="page-stack">
      <PageHeader
        back={{ to: '/app/properties', label: 'Biens' }}
        title={p.name}
        subtitle={
          <>
            <Badge tone="info">{PROPERTY_TYPE_LABELS[p.type]}</Badge> <Badge tone={PROPERTY_STATUS_TONES[p.status]}>{PROPERTY_STATUS_LABELS[p.status]}</Badge>{' '}
            <span className="dim">{[p.address, p.city].filter(Boolean).join(', ')}</span>
          </>
        }
        actions={
          canManage && (
            <Link className="btn btn-ghost" to={`/app/properties/${p.id}/edit`}>
              <Pencil size={15} aria-hidden="true" /> Modifier
            </Link>
          )
        }
      />
      <Tabs tabs={tabs} active={tab} onChange={setTab} />
      {tab === 'overview' && <OverviewTab property={p} />}
      {tab === 'access' && canSeeAccess && <AccessTab propertyId={p.id} canEdit={canManage} />}
      {tab === 'listings' && <ListingsTab propertyId={p.id} canEdit={canManage} />}
      {tab === 'photos' && <PhotosTab property={p} canEdit={canManage} onCoverChange={property.reload} />}
      {tab === 'owners' && canSeeOwners && <OwnersTab property={p} canEdit={canManage} onChange={property.reload} />}
      {tab === 'reservations' && <PropertyReservations propertyId={p.id} portal={portal} />}
      {tab === 'documents' && canSeeDocs && (
        <DocumentsPanel filters={{ propertyId: p.id }} defaults={{ propertyId: p.id, category: 'PROPERTY' }} portal={portal} />
      )}
      {tab === 'performance' && canSeeFinance && <PerformanceTab propertyId={p.id} />}
    </div>
  );
}

function OverviewTab({ property: p }: { property: PropertyListRow }) {
  const mapUrl =
    p.latitude !== null && p.longitude !== null
      ? `https://www.openstreetmap.org/?mlat=${p.latitude}&mlon=${p.longitude}#map=17/${p.latitude}/${p.longitude}`
      : null;
  return (
    <div className="app-grid">
      <Section title="Informations">
        <Facts
          items={[
            { label: 'Capacité', value: `${p.capacity} voyageur(s)` },
            { label: 'Chambres / lits', value: `${p.bedrooms} / ${p.beds}` },
            { label: 'Salles de bain', value: p.bathrooms },
            { label: 'Commission', value: `${Number(p.commission_rate)} %` },
          ]}
        />
        {p.description && <p className="prose">{p.description}</p>}
        {p.house_rules && (
          <>
            <h3 className="section-title">Règlement intérieur</h3>
            <p className="prose">{p.house_rules}</p>
          </>
        )}
      </Section>
      <Section title="Équipements & localisation">
        {p.amenities.length > 0 ? (
          <div className="chips">
            {p.amenities.map((a) => (
              <span className="chip" key={a}>{a}</span>
            ))}
          </div>
        ) : (
          <p className="dim">Aucun équipement renseigné.</p>
        )}
        <h3 className="section-title section-gap">Localisation</h3>
        <p>{[p.address, p.city].filter(Boolean).join(', ')}</p>
        {mapUrl ? (
          <a className="btn btn-ghost btn-sm" href={mapUrl} target="_blank" rel="noreferrer">
            <ExternalLink size={14} aria-hidden="true" /> Ouvrir la carte ({Number(p.latitude).toFixed(4)}, {Number(p.longitude).toFixed(4)})
          </a>
        ) : (
          <p className="dim">Coordonnées GPS non renseignées.</p>
        )}
      </Section>
    </div>
  );
}

const EMPTY_ACCESS = (propertyId: string): PropertyAccessRow => ({
  property_id: propertyId,
  arrival_procedure: null,
  departure_procedure: null,
  access_instructions: null,
  door_code: null,
  key_location: null,
  wifi_name: null,
  wifi_password: null,
  cleaning_procedure: null,
  maintenance_procedure: null,
});

function AccessTab({ propertyId, canEdit }: { propertyId: string; canEdit: boolean }) {
  const access = useAsync(() => getPropertyAccess(propertyId), [propertyId]);
  const [form, setForm] = useState<PropertyAccessRow>(EMPTY_ACCESS(propertyId));
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm(access.data ?? EMPTY_ACCESS(propertyId));
  }, [access.data, propertyId]);

  function field(key: keyof PropertyAccessRow, label: string, multiline = false) {
    const value = form[key] ?? '';
    const onChange = (v: string) => setForm((f) => ({ ...f, [key]: v || null }));
    return multiline ? (
      <TextAreaField key={key} label={label} rows={3} value={value} onChange={(e) => onChange(e.target.value)} />
    ) : (
      <TextField key={key} label={label} value={value} onChange={(e) => onChange(e.target.value)} autoComplete="off" />
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      await savePropertyAccess(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(toUserMessage(err));
    }
  }

  if (access.loading) return <Loading />;
  if (access.error) return <ErrorAlert>{access.error}</ErrorAlert>;

  const short: [keyof PropertyAccessRow, string][] = [
    ['door_code', 'Code porte / serrure'],
    ['key_location', 'Emplacement des clés'],
    ['wifi_name', 'Réseau Wi-Fi'],
    ['wifi_password', 'Mot de passe Wi-Fi'],
  ];
  const long: [keyof PropertyAccessRow, string][] = [
    ['access_instructions', "Instructions d'accès"],
    ['arrival_procedure', "Procédure d'arrivée"],
    ['departure_procedure', 'Procédure de départ'],
    ['cleaning_procedure', 'Procédure de nettoyage'],
    ['maintenance_procedure', 'Procédure de maintenance'],
  ];

  if (!canEdit) {
    return (
      <Section title="Accès & procédures">
        <InfoAlert>Informations confidentielles : ne les partagez qu'avec les voyageurs vérifiés.</InfoAlert>
        <Facts items={short.map(([k, l]) => ({ label: l, value: form[k] || '—' }))} />
        {long.map(([k, l]) => (
          <div key={k} className="section-gap">
            <h3 className="section-title">{l}</h3>
            <p className="prose">{form[k] || '—'}</p>
          </div>
        ))}
      </Section>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Section title="Accès & procédures (confidentiel)">
        {error && <ErrorAlert>{error}</ErrorAlert>}
        <div className="form-grid">{short.map(([k, l]) => field(k, l))}</div>
        {long.map(([k, l]) => field(k, l, true))}
        <div className="form-actions">
          {saved && <span className="saved-note">Enregistré ✓</span>}
          <button type="submit" className="btn btn-primary">Enregistrer</button>
        </div>
      </Section>
    </form>
  );
}

function ListingsTab({ propertyId, canEdit }: { propertyId: string; canEdit: boolean }) {
  const listings = useAsync(() => listListings(propertyId), [propertyId]);
  const [platform, setPlatform] = useState<BookingChannel>('AIRBNB');
  const [externalId, setExternalId] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (url && !/^https:\/\//i.test(url.trim())) {
      setError("L'URL de l'annonce doit commencer par https://");
      return;
    }
    try {
      await addListing({ property_id: propertyId, platform, external_id: externalId.trim() || null, listing_url: url.trim() || null, is_active: true });
      setExternalId('');
      setUrl('');
      listings.reload();
    } catch (err) {
      setError(toUserMessage(err));
    }
  }

  async function run(action: () => Promise<void>) {
    try {
      await action();
      listings.reload();
    } catch (err) {
      setError(toUserMessage(err));
    }
  }

  return (
    <div className="page-stack">
      <InfoAlert>
        Un bien existe dans DarnaLux même sans plateforme externe. Les annonces ci-dessous sont des références saisies
        manuellement : aucune synchronisation Airbnb/Booking n'est connectée pour l'instant.
      </InfoAlert>
      <Section title="Canaux de diffusion" flush>
        {error && <div className="panel-pad"><ErrorAlert>{error}</ErrorAlert></div>}
        {listings.loading && <Loading />}
        {listings.data && listings.data.length === 0 && <EmptyState title="Aucune annonce" text="Ce bien n'est publié sur aucune plateforme." />}
        {listings.data && listings.data.length > 0 && (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Plateforme</th>
                  <th>Identifiant</th>
                  <th>Lien</th>
                  <th>Statut</th>
                  {canEdit && <th><span className="sr-only">Actions</span></th>}
                </tr>
              </thead>
              <tbody>
                {listings.data.map((l) => (
                  <tr key={l.id}>
                    <td><strong>{BOOKING_CHANNEL_LABELS[l.platform]}</strong></td>
                    <td>{l.external_id ?? '—'}</td>
                    <td>
                      {l.listing_url ? (
                        <a href={l.listing_url} target="_blank" rel="noreferrer" className="btn btn-link btn-sm">
                          Ouvrir <ExternalLink size={13} aria-hidden="true" />
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td><Badge tone={l.is_active ? 'success' : 'neutral'}>{l.is_active ? 'Active' : 'Inactive'}</Badge></td>
                    {canEdit && (
                      <td className="cell-actions">
                        <button type="button" className="btn btn-link btn-sm" onClick={() => run(() => toggleListing(l.id, !l.is_active))}>
                          {l.is_active ? 'Désactiver' : 'Activer'}
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          aria-label="Supprimer l'annonce"
                          onClick={() => window.confirm('Supprimer cette annonce ?') && run(() => deleteListing(l.id))}
                        >
                          <Trash2 size={15} aria-hidden="true" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
      {canEdit && (
        <form onSubmit={handleAdd}>
          <Section title="Ajouter une annonce">
            <div className="form-grid">
              <SelectField label="Plateforme" value={platform} options={optionsFrom(BOOKING_CHANNELS, BOOKING_CHANNEL_LABELS)} onChange={(e) => setPlatform(e.target.value as BookingChannel)} />
              <TextField label="Identifiant de l'annonce" value={externalId} onChange={(e) => setExternalId(e.target.value)} placeholder="ex : 123456789" />
              <TextField label="URL de l'annonce" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.airbnb.com/rooms/…" className="span-2" />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">Ajouter</button>
            </div>
          </Section>
        </form>
      )}
    </div>
  );
}

function PhotosTab({ property, canEdit, onCoverChange }: { property: PropertyListRow; canEdit: boolean; onCoverChange: () => void }) {
  const images = useAsync(async () => {
    const rows = await listImages(property.id);
    const urls = await signedUrls('property-images', rows.map((r) => r.storage_path), 600);
    return rows.map((row) => ({ ...row, url: urls[row.storage_path] ?? null }));
  }, [property.id]);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      let position = images.data?.length ?? 0;
      for (const file of Array.from(files)) {
        const problem = validateUpload(file, IMAGE_MIME_TYPES);
        if (problem) throw new Error(`${file.name} : ${problem}`);
        await uploadImage(property.id, file, position);
        position += 1;
      }
      images.reload();
    } catch (err) {
      setError(err instanceof Error && err.message.includes(':') ? err.message : toUserMessage(err));
    } finally {
      setUploading(false);
    }
  }

  async function run(action: () => Promise<void>, reloadCover = false) {
    try {
      await action();
      images.reload();
      if (reloadCover) onCoverChange();
    } catch (err) {
      setError(toUserMessage(err));
    }
  }

  return (
    <Section
      title="Photos"
      actions={
        canEdit && (
          <label className="btn btn-primary btn-sm">
            <ImagePlus size={15} aria-hidden="true" /> {uploading ? 'Envoi…' : 'Ajouter des photos'}
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden disabled={uploading} onChange={(e) => handleFiles(e.target.files)} />
          </label>
        )
      }
    >
      {error && <ErrorAlert>{error}</ErrorAlert>}
      {images.loading && <Loading />}
      {images.data && images.data.length === 0 && <EmptyState title="Aucune photo" text="Ajoutez des photos JPEG, PNG ou WebP (10 Mo max.)." />}
      {images.data && images.data.length > 0 && (
        <div className="photo-grid">
          {images.data.map((image: PropertyImageRow & { url: string | null }) => {
            const isCover = property.cover_image_path === image.storage_path;
            return (
              <figure key={image.id} className={'photo' + (isCover ? ' photo-cover' : '')}>
                {image.url ? <img src={image.url} alt={image.caption ?? property.name} loading="lazy" /> : <div className="photo-missing">Image indisponible</div>}
                {canEdit && (
                  <figcaption>
                    <button type="button" className="icon-btn" title="Photo de couverture" aria-label="Définir comme couverture" onClick={() => run(() => setCoverImage(property.id, image.storage_path), true)}>
                      <Star size={15} aria-hidden="true" fill={isCover ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      title="Supprimer"
                      aria-label="Supprimer la photo"
                      onClick={() =>
                        window.confirm('Supprimer cette photo ?') &&
                        run(async () => {
                          if (isCover) await setCoverImage(property.id, null);
                          await deleteImage(image);
                        }, isCover)
                      }
                    >
                      <Trash2 size={15} aria-hidden="true" />
                    </button>
                  </figcaption>
                )}
              </figure>
            );
          })}
        </div>
      )}
    </Section>
  );
}

function OwnersTab({ property, canEdit, onChange }: { property: PropertyListRow; canEdit: boolean; onChange: () => void }) {
  const owners = useAsync(() => (canEdit ? listOwnerOptions() : Promise.resolve([])), [canEdit]);
  const [ownerId, setOwnerId] = useState('');
  const [share, setShare] = useState('100');
  const [isPrimary, setIsPrimary] = useState(property.property_owners.length === 0);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<void>) {
    setError(null);
    try {
      await action();
      onChange();
    } catch (err) {
      setError(toUserMessage(err));
    }
  }

  const linkedIds = new Set(property.property_owners.map((l) => l.owner_id));

  return (
    <Section title="Propriétaires du bien" flush>
      {error && <div className="panel-pad"><ErrorAlert>{error}</ErrorAlert></div>}
      {property.property_owners.length === 0 ? (
        <EmptyState title="Aucun propriétaire associé" />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Propriétaire</th>
                <th>Rôle</th>
                <th>Quote-part</th>
                {canEdit && <th><span className="sr-only">Actions</span></th>}
              </tr>
            </thead>
            <tbody>
              {property.property_owners.map((link) => (
                <tr key={link.owner_id}>
                  <td>
                    <Link to={`/app/owners/${link.owner_id}`} className="cell-title">
                      {link.owners ? personFullName(link.owners.first_name, link.owners.last_name) : 'Propriétaire'}
                    </Link>
                  </td>
                  <td>{link.is_primary ? <Badge tone="gold">Principal</Badge> : <Badge>Co-propriétaire</Badge>}</td>
                  <td>{Number(link.share_percent)} %</td>
                  {canEdit && (
                    <td className="cell-actions">
                      {!link.is_primary && (
                        <button type="button" className="btn btn-link btn-sm" onClick={() => run(() => linkOwner(property.id, link.owner_id, true, Number(link.share_percent)))}>
                          Rendre principal
                        </button>
                      )}
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label="Retirer ce propriétaire"
                        onClick={() => window.confirm('Retirer ce propriétaire du bien ?') && run(() => unlinkOwner(property.id, link.owner_id))}
                      >
                        <Trash2 size={15} aria-hidden="true" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {canEdit && (
        <form
          className="panel-pad inline-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!ownerId) return;
            void run(() => linkOwner(property.id, ownerId, isPrimary, Number(share) || 100));
            setOwnerId('');
          }}
        >
          <SelectField
            label="Associer un propriétaire"
            value={ownerId}
            placeholder="— Choisir —"
            options={(owners.data ?? []).filter((o) => !linkedIds.has(o.id)).map((o) => ({ value: o.id, label: personFullName(o.first_name, o.last_name) }))}
            onChange={(e) => setOwnerId(e.target.value)}
          />
          <TextField label="Quote-part (%)" type="number" min={1} max={100} value={share} onChange={(e) => setShare(e.target.value)} />
          <label className="checkbox-line">
            <input type="checkbox" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} /> Principal
          </label>
          <button type="submit" className="btn btn-primary btn-sm" disabled={!ownerId}>Associer</button>
        </form>
      )}
    </Section>
  );
}

function PropertyReservations({ propertyId, portal }: { propertyId: string; portal: boolean }) {
  const reservations = useAsync(() => listReservations({ propertyId, limit: 100 }, portal), [propertyId, portal]);
  return (
    <Section title="Réservations" flush>
      {reservations.loading && <Loading />}
      {reservations.error && <div className="panel-pad"><ErrorAlert>{reservations.error}</ErrorAlert></div>}
      {reservations.data && reservations.data.length === 0 && <EmptyState title="Aucune réservation" />}
      {reservations.data && reservations.data.length > 0 && <ReservationsTable rows={reservations.data} showProperty={false} showGuest={!portal} />}
    </Section>
  );
}

function PerformanceTab({ propertyId }: { propertyId: string }) {
  const now = new Date();
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [year, monthIndex] = [Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1];
  const from = startOfMonth(year, monthIndex);
  const to = startOfNextMonth(year, monthIndex);
  const data = useAsync(async () => {
    const [reservations, expenses] = await Promise.all([listReservationsForPeriod(from, to, [propertyId]), listExpenses(from, to, [propertyId])]);
    return computePeriodPerformance({
      periodStart: from,
      periodEnd: to,
      propertyCount: 1,
      reservations: reservations.map((r) => ({
        propertyId: r.property_id,
        checkIn: r.check_in,
        checkOut: r.check_out,
        status: r.status,
        grossAmount: Number(r.gross_amount),
        commissionRate: Number(r.commission_rate),
        platformFees: Number(r.platform_fees),
      })),
      expenses: expenses.map((e) => ({ propertyId: e.property_id, amount: Number(e.amount), incurredOn: e.incurred_on, chargedToOwner: e.charged_to_owner })),
    });
  }, [propertyId, from, to]);

  return (
    <div className="page-stack">
      <div className="filters">
        <input type="month" aria-label="Mois" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
      </div>
      {data.loading && <Loading />}
      {data.error && <ErrorAlert>{data.error}</ErrorAlert>}
      {data.data && (
        <div className="kpis">
          <StatCard label="Taux d'occupation" value={formatPercent(data.data.occupancyRate)} note={`${data.data.nightsBooked} / ${data.data.nightsAvailable} nuits`} />
          <StatCard label="Revenu brut" value={formatMoney(data.data.revenue)} note={`${data.data.reservations} réservation(s)`} />
          <StatCard label="ADR (prix moyen / nuit)" value={data.data.adr === null ? '—' : formatMoney(data.data.adr)} />
          <StatCard label="RevPAR" value={data.data.revpar === null ? '—' : formatMoney(data.data.revpar)} />
          <StatCard label="Commission DarnaLux" value={formatMoney(data.data.commissions)} />
          <StatCard label="Dépenses" value={formatMoney(data.data.expenses)} />
          <StatCard label="Net propriétaire" value={formatMoney(data.data.ownerNet)} tone="success" note="Brut − commission − frais − dépenses" />
          <StatCard label="Annulations" value={data.data.cancellations} />
        </div>
      )}
    </div>
  );
}
