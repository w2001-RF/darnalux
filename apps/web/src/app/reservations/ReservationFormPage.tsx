import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { GuestField, GuestInput, ReservationField, ReservationInput, ReservationStatus } from '@darnalux/core';
import {
  BOOKING_CHANNELS,
  BOOKING_CHANNEL_LABELS,
  PERMISSIONS,
  RESERVATION_STATUS_LABELS,
  addDays,
  assessGuestRisk,
  computeReservationFinance,
  emptyGuestInput,
  findReservationConflicts,
  formatMoney,
  hasPermission,
  isISODate,
  nightsBetween,
  planReservationTasks,
  toLocalISODate,
  validateGuestInput,
  validateReservationInput,
} from '@darnalux/core';
import { useAuth } from '../../features/auth/AuthContext';
import { RequirePermission } from '../../features/auth/RequirePermission';
import { listPropertyOptions } from '../../features/properties/api';
import type { GuestRow } from '../../features/guests/api';
import { createGuest } from '../../features/guests/api';
import { GuestPicker } from '../../features/guests/GuestPicker';
import {
  createReservation,
  createTasksFromDrafts,
  getReservation,
  listReservationsBetween,
  toReservationInput,
  updateReservation,
} from '../../features/reservations/api';
import { useAsync } from '../../lib/useAsync';
import { toUserMessage } from '../../lib/errors';
import { formatDate } from '../../lib/format';
import { FormActions, PageHeader, Section, SelectField, TextAreaField, TextField, optionsFrom } from '../../components/ui';
import { ErrorAlert, InfoAlert, Loading } from '../../components/Feedback';

function initialInput(): ReservationInput {
  const today = toLocalISODate(new Date());
  return {
    propertyId: '',
    guestId: null,
    source: 'DIRECT',
    externalReference: '',
    checkIn: today,
    checkOut: addDays(today, 2),
    guestsCount: 1,
    grossAmount: 0,
    commissionRate: 20,
    platformFees: 0,
    smartLockCode: '',
    notes: '',
  };
}

function ReservationForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManageGuests = hasPermission(user, PERMISSIONS.GUESTS_MANAGE);
  const canCreateTasks = hasPermission(user, PERMISSIONS.TASKS_MANAGE);

  const [input, setInput] = useState<ReservationInput>(initialInput);
  const [status, setStatus] = useState<ReservationStatus>('CONFIRMED');
  const [guestMode, setGuestMode] = useState<'existing' | 'new' | 'none'>('existing');
  const [selectedGuest, setSelectedGuest] = useState<GuestRow | null>(null);
  const [newGuest, setNewGuest] = useState<GuestInput>(emptyGuestInput);
  const [createTasks, setCreateTasks] = useState(true);
  const [blacklistAck, setBlacklistAck] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<ReservationField, string>>>({});
  const [guestErrors, setGuestErrors] = useState<Partial<Record<GuestField, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const properties = useAsync(listPropertyOptions, []);
  const existing = useAsync(() => (id ? getReservation(id) : Promise.resolve(null)), [id]);
  const property = properties.data?.find((p) => p.id === input.propertyId) ?? null;

  useEffect(() => {
    if (existing.data) {
      setInput(toReservationInput(existing.data));
      setGuestMode(existing.data.guest_id ? 'existing' : 'none');
    }
  }, [existing.data]);

  const datesValid = isISODate(input.checkIn) && isISODate(input.checkOut) && input.checkOut > input.checkIn;
  const conflicts = useAsync(async () => {
    if (!input.propertyId || !datesValid) return [];
    const rows = await listReservationsBetween(input.checkIn, input.checkOut, input.propertyId);
    return findReservationConflicts(
      { id: id ?? null, propertyId: input.propertyId, checkIn: input.checkIn, checkOut: input.checkOut },
      rows.map((r) => ({ ...r, propertyId: r.property_id, checkIn: r.check_in, checkOut: r.check_out })),
    );
  }, [input.propertyId, input.checkIn, input.checkOut, id]);

  const finance = useMemo(
    () => computeReservationFinance({ grossAmount: input.grossAmount || 0, commissionRate: input.commissionRate || 0, platformFees: input.platformFees || 0 }),
    [input.grossAmount, input.commissionRate, input.platformFees],
  );
  const risk = assessGuestRisk(selectedGuest ? { isBlacklisted: selectedGuest.is_blacklisted, blacklistReason: selectedGuest.blacklist_reason } : null);

  function update<K extends keyof ReservationInput>(key: K, value: ReservationInput[K]) {
    setInput((current) => ({ ...current, [key]: value }));
  }

  function selectProperty(propertyId: string) {
    const selected = properties.data?.find((p) => p.id === propertyId);
    setInput((current) => ({
      ...current,
      propertyId,
      commissionRate: !isEdit && selected ? Number(selected.commission_rate) : current.commissionRate,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const validation = validateReservationInput(input, { capacity: property?.capacity });
    setErrors(validation.errors);
    let guestValid = true;
    if (guestMode === 'new') {
      const guestValidation = validateGuestInput(newGuest);
      setGuestErrors(guestValidation.errors);
      guestValid = guestValidation.valid;
    }
    if (!validation.valid || !guestValid) return;
    if (risk.blocked && !blacklistAck) {
      setFormError('Confirmez la réservation malgré la liste noire, ou choisissez un autre voyageur.');
      return;
    }
    setSaving(true);
    try {
      let guestId = guestMode === 'existing' ? input.guestId : null;
      if (guestMode === 'new') guestId = await createGuest(newGuest);
      const payload = { ...input, guestId };
      if (id) {
        await updateReservation(id, payload);
        navigate(`/app/reservations/${id}`);
        return;
      }
      const created = await createReservation(payload, status);
      if (createTasks && canCreateTasks) {
        await createTasksFromDrafts(planReservationTasks(payload, { propertyName: property?.name }), {
          propertyId: payload.propertyId,
          reservationId: created.id,
        });
      }
      navigate(`/app/reservations/${created.id}`);
    } catch (error) {
      setFormError(toUserMessage(error));
    } finally {
      setSaving(false);
    }
  }

  if (isEdit && existing.loading) return <Loading />;
  if (existing.error) return <ErrorAlert>{existing.error}</ErrorAlert>;

  const nights = datesValid ? nightsBetween(input.checkIn, input.checkOut) : 0;

  return (
    <form className="page-stack" onSubmit={handleSubmit} noValidate>
      <PageHeader
        title={isEdit ? `Modifier ${existing.data?.reference ?? 'la réservation'}` : 'Nouvelle réservation'}
        back={{ to: id ? `/app/reservations/${id}` : '/app/reservations', label: 'Retour' }}
      />
      {formError && <ErrorAlert>{formError}</ErrorAlert>}

      <Section title="Bien et séjour">
        <div className="form-grid">
          <SelectField
            label="Bien"
            required
            value={input.propertyId}
            error={errors.propertyId}
            placeholder="— Choisir un bien —"
            options={(properties.data ?? []).map((p) => ({ value: p.id, label: `${p.name} · ${p.city}` }))}
            onChange={(e) => selectProperty(e.target.value)}
            hint={property ? `Capacité : ${property.capacity} voyageur(s)` : undefined}
          />
          <SelectField label="Source" value={input.source} error={errors.source} options={optionsFrom(BOOKING_CHANNELS, BOOKING_CHANNEL_LABELS)} onChange={(e) => update('source', e.target.value as ReservationInput['source'])} />
          <TextField label="Arrivée (check-in)" type="date" required value={input.checkIn} error={errors.checkIn} onChange={(e) => update('checkIn', e.target.value)} />
          <TextField label="Départ (check-out)" type="date" required value={input.checkOut} error={errors.checkOut} onChange={(e) => update('checkOut', e.target.value)} hint={nights ? `${nights} nuit(s)` : undefined} />
          <TextField label="Nombre de voyageurs" type="number" min={1} value={String(input.guestsCount)} error={errors.guestsCount} onChange={(e) => update('guestsCount', Number(e.target.value))} />
          <TextField label="Référence externe (Airbnb, Booking…)" value={input.externalReference} onChange={(e) => update('externalReference', e.target.value)} />
          {!isEdit && (
            <SelectField
              label="Statut initial"
              value={status}
              options={(['PENDING', 'CONFIRMED'] as const).map((s) => ({ value: s, label: RESERVATION_STATUS_LABELS[s] }))}
              onChange={(e) => setStatus(e.target.value as ReservationStatus)}
            />
          )}
          <TextField label="Code serrure connectée (optionnel)" value={input.smartLockCode} onChange={(e) => update('smartLockCode', e.target.value)} hint="Révélé au voyageur uniquement après vérification." autoComplete="off" />
        </div>
        {conflicts.data && conflicts.data.length > 0 && (
          <ErrorAlert>
            Chevauchement avec{' '}
            {conflicts.data.map((c, i) => (
              <span key={c.id}>
                {i > 0 && ', '}
                <Link to={`/app/reservations/${c.id}`}>{c.reference}</Link> ({formatDate(c.check_in)} → {formatDate(c.check_out)})
              </span>
            ))}
            . L'enregistrement sera refusé tant que les dates se chevauchent.
          </ErrorAlert>
        )}
      </Section>

      <Section title="Voyageur">
        <div className="segmented" role="radiogroup" aria-label="Voyageur">
          {(
            [
              ['existing', 'Voyageur existant'],
              ...(canManageGuests ? [['new', 'Nouveau voyageur']] : []),
              ['none', 'Plus tard (via le check-in)'],
            ] as [typeof guestMode, string][]
          ).map(([mode, label]) => (
            <button key={mode} type="button" role="radio" aria-checked={guestMode === mode} className={guestMode === mode ? 'active' : ''} onClick={() => setGuestMode(mode)}>
              {label}
            </button>
          ))}
        </div>
        {guestMode === 'existing' && (
          <GuestPicker
            value={input.guestId}
            onChange={(guest) => {
              setSelectedGuest(guest);
              setBlacklistAck(false);
              update('guestId', guest?.id ?? null);
            }}
          />
        )}
        {guestMode === 'new' && (
          <div className="form-grid">
            <TextField label="Prénom" required value={newGuest.firstName} error={guestErrors.firstName} onChange={(e) => setNewGuest((g) => ({ ...g, firstName: e.target.value }))} />
            <TextField label="Nom" required value={newGuest.lastName} error={guestErrors.lastName} onChange={(e) => setNewGuest((g) => ({ ...g, lastName: e.target.value }))} />
            <TextField label="Email" type="email" value={newGuest.email} error={guestErrors.email} onChange={(e) => setNewGuest((g) => ({ ...g, email: e.target.value }))} />
            <TextField label="Téléphone" type="tel" value={newGuest.phone} error={guestErrors.phone} onChange={(e) => setNewGuest((g) => ({ ...g, phone: e.target.value }))} />
          </div>
        )}
        {guestMode === 'none' && <InfoAlert>La fiche voyageur sera créée automatiquement lors de la validation du check-in en ligne.</InfoAlert>}
        {risk.blocked && (
          <>
            <ErrorAlert>{risk.message}</ErrorAlert>
            <label className="checkbox-line">
              <input type="checkbox" checked={blacklistAck} onChange={(e) => setBlacklistAck(e.target.checked)} />
              Je confirme vouloir créer cette réservation malgré la liste noire.
            </label>
          </>
        )}
      </Section>

      <Section title="Finances">
        <div className="form-grid form-grid-3">
          <TextField label="Montant brut (MAD)" type="number" min={0} step="0.01" value={String(input.grossAmount)} error={errors.grossAmount} onChange={(e) => update('grossAmount', Number(e.target.value))} />
          <TextField label="Commission DarnaLux (%)" type="number" min={0} max={100} step="0.5" value={String(input.commissionRate)} error={errors.commissionRate} onChange={(e) => update('commissionRate', Number(e.target.value))} />
          <TextField label="Frais de plateforme (MAD)" type="number" min={0} step="0.01" value={String(input.platformFees)} error={errors.platformFees} onChange={(e) => update('platformFees', Number(e.target.value))} />
        </div>
        <div className="finance-preview">
          <span>Commission : <strong>{formatMoney(finance.commission)}</strong></span>
          <span>Net propriétaire (avant dépenses) : <strong>{formatMoney(finance.ownerNet)}</strong></span>
          {nights > 0 && input.grossAmount > 0 && <span>Prix moyen / nuit : <strong>{formatMoney(input.grossAmount / nights)}</strong></span>}
        </div>
        <TextAreaField label="Notes" rows={3} value={input.notes} onChange={(e) => update('notes', e.target.value)} />
      </Section>

      {!isEdit && canCreateTasks && (
        <label className="checkbox-line panel panel-tight">
          <input type="checkbox" checked={createTasks} onChange={(e) => setCreateTasks(e.target.checked)} />
          Créer automatiquement les tâches opérationnelles (préparation, accueil, départ, inspection, nettoyage)
        </label>
      )}

      <FormActions>
        <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>Annuler</button>
        <button type="submit" className="btn btn-primary" disabled={saving || Boolean(conflicts.data?.length)}>
          {saving ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer la réservation'}
        </button>
      </FormActions>
    </form>
  );
}

export default function ReservationFormPage() {
  return (
    <RequirePermission permission={PERMISSIONS.RESERVATIONS_MANAGE}>
      <ReservationForm />
    </RequirePermission>
  );
}
