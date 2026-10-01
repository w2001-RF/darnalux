import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { OwnerField, OwnerInput } from '@darnalux/core';
import { OWNER_STATUSES, OWNER_STATUS_LABELS, PERMISSIONS, emptyOwnerInput, validateOwnerInput } from '@darnalux/core';
import { RequirePermission } from '../../features/auth/RequirePermission';
import { createOwner, getOwner, toOwnerInput, updateOwner } from '../../features/owners/api';
import { useAsync } from '../../lib/useAsync';
import { toUserMessage } from '../../lib/errors';
import { FormActions, PageHeader, Section, SelectField, TextAreaField, TextField, optionsFrom } from '../../components/ui';
import { ErrorAlert, Loading } from '../../components/Feedback';

function OwnerForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [input, setInput] = useState<OwnerInput>(emptyOwnerInput);
  const [errors, setErrors] = useState<Partial<Record<OwnerField, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const existing = useAsync(() => (id ? getOwner(id) : Promise.resolve(null)), [id]);

  useEffect(() => {
    if (existing.data) setInput(toOwnerInput(existing.data));
  }, [existing.data]);

  function update<K extends keyof OwnerInput>(key: K, value: OwnerInput[K]) {
    setInput((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const validation = validateOwnerInput(input);
    setErrors(validation.errors);
    if (!validation.valid) return;
    setSaving(true);
    try {
      if (id) {
        await updateOwner(id, input);
        navigate(`/app/owners/${id}`);
      } else {
        navigate(`/app/owners/${await createOwner(input)}`);
      }
    } catch (error) {
      setFormError(toUserMessage(error));
    } finally {
      setSaving(false);
    }
  }

  if (id && existing.loading) return <Loading />;
  if (existing.error) return <ErrorAlert>{existing.error}</ErrorAlert>;

  return (
    <form className="page-stack" onSubmit={handleSubmit} noValidate>
      <PageHeader title={id ? 'Modifier le propriétaire' : 'Nouveau propriétaire'} back={{ to: id ? `/app/owners/${id}` : '/app/owners', label: 'Retour' }} />
      {formError && <ErrorAlert>{formError}</ErrorAlert>}
      <Section title="Identité et contact">
        <div className="form-grid">
          <TextField label="Prénom" required value={input.firstName} error={errors.firstName} onChange={(e) => update('firstName', e.target.value)} />
          <TextField label="Nom" required value={input.lastName} error={errors.lastName} onChange={(e) => update('lastName', e.target.value)} />
          <TextField label="Email" type="email" value={input.email} error={errors.email} onChange={(e) => update('email', e.target.value)} />
          <TextField label="Téléphone" type="tel" value={input.phone} error={errors.phone} onChange={(e) => update('phone', e.target.value)} placeholder="+212 6…" />
          <TextField label="Adresse" value={input.address} onChange={(e) => update('address', e.target.value)} className="span-2" />
          <TextField label="Ville" value={input.city} onChange={(e) => update('city', e.target.value)} />
          <SelectField label="Statut" value={input.status} options={optionsFrom(OWNER_STATUSES, OWNER_STATUS_LABELS)} onChange={(e) => update('status', e.target.value as OwnerInput['status'])} />
        </div>
        <TextAreaField label="Notes internes (jamais visibles par le propriétaire)" rows={4} value={input.internalNotes} onChange={(e) => update('internalNotes', e.target.value)} />
      </Section>
      <FormActions>
        <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>Annuler</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
      </FormActions>
    </form>
  );
}

export default function OwnerFormPage() {
  return (
    <RequirePermission permission={PERMISSIONS.OWNERS_MANAGE}>
      <OwnerForm />
    </RequirePermission>
  );
}
