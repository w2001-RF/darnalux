import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LocateFixed } from 'lucide-react';
import type { PropertyField, PropertyInput } from '@darnalux/core';
import {
  COMMON_AMENITIES,
  PERMISSIONS,
  PROPERTY_STATUSES,
  PROPERTY_STATUS_LABELS,
  PROPERTY_TYPES,
  PROPERTY_TYPE_LABELS,
  emptyPropertyInput,
  personFullName,
  validatePropertyInput,
} from '@darnalux/core';
import { createProperty, getProperty, toPropertyInput, updateProperty } from '../../features/properties/api';
import { listOwnerOptions } from '../../features/owners/api';
import { useAuth } from '../../features/auth/AuthContext';
import { hasPermission } from '@darnalux/core';
import { useAsync } from '../../lib/useAsync';
import { toUserMessage } from '../../lib/errors';
import { FormActions, PageHeader, Section, SelectField, TextAreaField, TextField, optionsFrom } from '../../components/ui';
import { ErrorAlert, Loading } from '../../components/Feedback';
import { RequirePermission } from '../../features/auth/RequirePermission';

function numberOrNull(value: string): number | null {
  if (value.trim() === '') return null;
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function PropertyForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEdit = Boolean(id);
  const [input, setInput] = useState<PropertyInput>(emptyPropertyInput);
  const [ownerId, setOwnerId] = useState('');
  const [errors, setErrors] = useState<Partial<Record<PropertyField, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

  const existing = useAsync(() => (id ? getProperty(id) : Promise.resolve(null)), [id]);
  const owners = useAsync(
    () => (hasPermission(user, PERMISSIONS.OWNERS_VIEW) && !isEdit ? listOwnerOptions() : Promise.resolve([])),
    [isEdit],
  );

  useEffect(() => {
    if (existing.data) setInput(toPropertyInput(existing.data));
  }, [existing.data]);

  function update<K extends keyof PropertyInput>(key: K, value: PropertyInput[K]) {
    setInput((current) => ({ ...current, [key]: value }));
  }

  function toggleAmenity(amenity: string) {
    setInput((current) => ({
      ...current,
      amenities: current.amenities.includes(amenity)
        ? current.amenities.filter((a) => a !== amenity)
        : [...current.amenities, amenity],
    }));
  }

  function locate() {
    if (!navigator.geolocation) {
      setFormError("La géolocalisation n'est pas disponible sur cet appareil.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setInput((current) => ({
          ...current,
          latitude: Number(position.coords.latitude.toFixed(6)),
          longitude: Number(position.coords.longitude.toFixed(6)),
        }));
        setLocating(false);
      },
      () => {
        setFormError('Position introuvable. Autorisez la localisation ou saisissez les coordonnées.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const validation = validatePropertyInput(input);
    setErrors(validation.errors);
    if (!validation.valid) return;
    setSaving(true);
    try {
      if (id) {
        await updateProperty(id, input);
        navigate(`/app/properties/${id}`);
      } else {
        const newId = await createProperty(input, ownerId || null);
        navigate(`/app/properties/${newId}`);
      }
    } catch (error) {
      setFormError(toUserMessage(error));
    } finally {
      setSaving(false);
    }
  }

  if (isEdit && existing.loading) return <Loading />;
  if (existing.error) return <ErrorAlert>{existing.error}</ErrorAlert>;

  return (
    <form className="page-stack" onSubmit={handleSubmit} noValidate>
      <PageHeader
        title={isEdit ? `Modifier ${existing.data?.name ?? 'le bien'}` : 'Ajouter un bien'}
        back={{ to: id ? `/app/properties/${id}` : '/app/properties', label: 'Retour' }}
      />
      {formError && <ErrorAlert>{formError}</ErrorAlert>}

      <Section title="Informations générales">
        <div className="form-grid">
          <TextField label="Nom du bien" required value={input.name} error={errors.name} onChange={(e) => update('name', e.target.value)} placeholder="ex : Villa Atlas" />
          <SelectField label="Type" required value={input.type} error={errors.type} options={optionsFrom(PROPERTY_TYPES, PROPERTY_TYPE_LABELS)} onChange={(e) => update('type', e.target.value as PropertyInput['type'])} />
          <SelectField label="Statut" value={input.status} error={errors.status} options={optionsFrom(PROPERTY_STATUSES, PROPERTY_STATUS_LABELS)} onChange={(e) => update('status', e.target.value as PropertyInput['status'])} />
          <TextField label="Commission DarnaLux (%)" type="number" min={0} max={100} step="0.5" value={String(input.commissionRate)} error={errors.commissionRate} onChange={(e) => update('commissionRate', Number(e.target.value))} />
          {!isEdit && (owners.data?.length ?? 0) > 0 && (
            <SelectField
              label="Propriétaire principal"
              value={ownerId}
              placeholder="— Aucun pour l'instant —"
              options={(owners.data ?? []).map((o) => ({ value: o.id, label: personFullName(o.first_name, o.last_name) }))}
              onChange={(e) => setOwnerId(e.target.value)}
            />
          )}
        </div>
        <TextAreaField label="Description" rows={4} value={input.description} onChange={(e) => update('description', e.target.value)} />
      </Section>

      <Section title="Localisation">
        <div className="form-grid">
          <TextField label="Ville" required value={input.city} error={errors.city} onChange={(e) => update('city', e.target.value)} placeholder="ex : Rabat" />
          <TextField label="Adresse complète" value={input.address} onChange={(e) => update('address', e.target.value)} placeholder="ex : 12 avenue Mohammed V, Agdal" className="span-2" />
          <TextField label="Latitude" inputMode="decimal" value={input.latitude ?? ''} error={errors.latitude} onChange={(e) => update('latitude', numberOrNull(e.target.value))} />
          <TextField label="Longitude" inputMode="decimal" value={input.longitude ?? ''} error={errors.longitude} onChange={(e) => update('longitude', numberOrNull(e.target.value))} />
        </div>
        <div className="inline-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={locate} disabled={locating}>
            <LocateFixed size={15} aria-hidden="true" /> {locating ? 'Localisation…' : 'Me localiser'}
          </button>
          {input.latitude !== null && input.longitude !== null && Number.isFinite(input.latitude) && Number.isFinite(input.longitude) && (
            <a
              className="btn btn-link btn-sm"
              href={`https://www.openstreetmap.org/?mlat=${input.latitude}&mlon=${input.longitude}#map=17/${input.latitude}/${input.longitude}`}
              target="_blank"
              rel="noreferrer"
            >
              Vérifier sur la carte
            </a>
          )}
        </div>
      </Section>

      <Section title="Capacité">
        <div className="form-grid form-grid-4">
          <TextField label="Voyageurs max." type="number" min={1} value={String(input.capacity)} error={errors.capacity} onChange={(e) => update('capacity', Number(e.target.value))} />
          <TextField label="Chambres" type="number" min={0} value={String(input.bedrooms)} error={errors.bedrooms} onChange={(e) => update('bedrooms', Number(e.target.value))} />
          <TextField label="Lits" type="number" min={0} value={String(input.beds)} error={errors.beds} onChange={(e) => update('beds', Number(e.target.value))} />
          <TextField label="Salles de bain" type="number" min={0} value={String(input.bathrooms)} error={errors.bathrooms} onChange={(e) => update('bathrooms', Number(e.target.value))} />
        </div>
      </Section>

      <Section title="Équipements et règles">
        <div className="chip-picker" role="group" aria-label="Équipements">
          {COMMON_AMENITIES.map((amenity) => (
            <label key={amenity} className={'chip-option' + (input.amenities.includes(amenity) ? ' selected' : '')}>
              <input type="checkbox" checked={input.amenities.includes(amenity)} onChange={() => toggleAmenity(amenity)} />
              {amenity}
            </label>
          ))}
        </div>
        <TextAreaField label="Règlement intérieur" rows={4} value={input.houseRules} onChange={(e) => update('houseRules', e.target.value)} placeholder="Non-fumeur, pas de fête, horaires de silence…" />
      </Section>

      <FormActions>
        <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>Annuler</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer le bien'}</button>
      </FormActions>
    </form>
  );
}

export default function PropertyFormPage() {
  return (
    <RequirePermission permission={PERMISSIONS.PROPERTIES_MANAGE}>
      <PropertyForm />
    </RequirePermission>
  );
}
