import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type { TaskField, TaskInput, TaskStatus } from '@darnalux/core';
import {
  PERMISSIONS,
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_TYPES,
  TASK_TYPE_LABELS,
  statusAfterAssignment,
  validateTaskInput,
} from '@darnalux/core';
import { RequirePermission } from '../../features/auth/RequirePermission';
import { createTask, getTask, listStaff, toTaskInput, updateTask } from '../../features/tasks/api';
import { listPropertyOptions } from '../../features/properties/api';
import { useAsync } from '../../lib/useAsync';
import { toUserMessage } from '../../lib/errors';
import { isoToLocalInput, localInputToIso } from '../../lib/format';
import { FormActions, PageHeader, Section, SelectField, TextAreaField, TextField, optionsFrom } from '../../components/ui';
import { ErrorAlert, Loading } from '../../components/Feedback';

function TaskForm() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [input, setInput] = useState<TaskInput>({
    propertyId: params.get('property') ?? '',
    reservationId: params.get('reservation'),
    assignedTo: null,
    type: 'CLEANING',
    title: '',
    notes: '',
    priority: 'NORMAL',
    dueAt: null,
  });
  const [status, setStatus] = useState<TaskStatus>('TODO');
  const [errors, setErrors] = useState<Partial<Record<TaskField, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const existing = useAsync(() => (id ? getTask(id) : Promise.resolve(null)), [id]);
  const properties = useAsync(listPropertyOptions, []);
  const staff = useAsync(listStaff, []);

  useEffect(() => {
    if (existing.data) {
      setInput(toTaskInput(existing.data));
      setStatus(existing.data.status);
    }
  }, [existing.data]);

  function update<K extends keyof TaskInput>(key: K, value: TaskInput[K]) {
    setInput((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const validation = validateTaskInput(input);
    setErrors(validation.errors);
    if (!validation.valid) return;
    setSaving(true);
    const nextStatus = statusAfterAssignment(status, input.assignedTo);
    try {
      if (id) {
        await updateTask(id, input, nextStatus);
        navigate(`/app/tasks/${id}`);
      } else {
        navigate(`/app/tasks/${await createTask(input, nextStatus)}`);
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
      <PageHeader title={id ? 'Modifier la tâche' : 'Nouvelle tâche'} back={{ to: id ? `/app/tasks/${id}` : '/app/tasks', label: 'Retour' }} />
      {formError && <ErrorAlert>{formError}</ErrorAlert>}
      <Section title="Tâche">
        <div className="form-grid">
          <TextField label="Titre" required value={input.title} error={errors.title} onChange={(e) => update('title', e.target.value)} placeholder="ex : Remplacer l'ampoule de la cuisine" className="span-2" />
          <SelectField label="Type" value={input.type} options={optionsFrom(TASK_TYPES, TASK_TYPE_LABELS)} onChange={(e) => update('type', e.target.value as TaskInput['type'])} />
          <SelectField label="Priorité" value={input.priority} options={optionsFrom(TASK_PRIORITIES, TASK_PRIORITY_LABELS)} onChange={(e) => update('priority', e.target.value as TaskInput['priority'])} />
          <SelectField
            label="Bien"
            required
            value={input.propertyId}
            error={errors.propertyId}
            placeholder="— Choisir un bien —"
            options={(properties.data ?? []).map((p) => ({ value: p.id, label: p.name }))}
            onChange={(e) => update('propertyId', e.target.value)}
          />
          <TextField label="Échéance" type="datetime-local" value={isoToLocalInput(input.dueAt)} error={errors.dueAt} onChange={(e) => update('dueAt', localInputToIso(e.target.value))} />
          <SelectField
            label="Assignée à"
            value={input.assignedTo ?? ''}
            placeholder="— Non assignée —"
            options={(staff.data ?? []).map((s) => ({ value: s.id, label: s.full_name ?? 'Membre de l’équipe' }))}
            onChange={(e) => update('assignedTo', e.target.value || null)}
          />
        </div>
        <TextAreaField label="Instructions / notes" rows={4} value={input.notes} onChange={(e) => update('notes', e.target.value)} />
      </Section>
      <FormActions>
        <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>Annuler</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
      </FormActions>
    </form>
  );
}

export default function TaskFormPage() {
  return (
    <RequirePermission permission={PERMISSIONS.TASKS_MANAGE}>
      <TaskForm />
    </RequirePermission>
  );
}
