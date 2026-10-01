import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Ban } from 'lucide-react';
import { PERMISSIONS, hasPermission, personFullName, validateBlacklistReason } from '@darnalux/core';
import { useAuth } from '../../features/auth/AuthContext';
import { RequirePermission } from '../../features/auth/RequirePermission';
import type { GuestRow } from '../../features/guests/api';
import { listGuests, setBlacklist } from '../../features/guests/api';
import { GuestPicker } from '../../features/guests/GuestPicker';
import { useAsync } from '../../lib/useAsync';
import { toUserMessage } from '../../lib/errors';
import { formatDate } from '../../lib/format';
import { EmptyState, PageHeader, Section, TextAreaField } from '../../components/ui';
import { ErrorAlert, InfoAlert, Loading } from '../../components/Feedback';

function Blacklist() {
  const { user } = useAuth();
  const canManage = hasPermission(user, PERMISSIONS.GUESTS_BLACKLIST);
  const guests = useAsync(() => listGuests({ blacklistedOnly: true, limit: 500 }), []);
  const [selected, setSelected] = useState<GuestRow | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!selected) {
      setError('Choisissez un voyageur.');
      return;
    }
    const problem = validateBlacklistReason(reason);
    if (problem) {
      setError(problem);
      return;
    }
    try {
      await setBlacklist(selected.id, true, reason);
      setSelected(null);
      setReason('');
      guests.reload();
    } catch (err) {
      setError(toUserMessage(err));
    }
  }

  async function remove(guest: GuestRow) {
    if (!window.confirm(`Retirer ${personFullName(guest.first_name, guest.last_name)} de la liste noire ?`)) return;
    try {
      await setBlacklist(guest.id, false, null);
      guests.reload();
    } catch (err) {
      setError(toUserMessage(err));
    }
  }

  return (
    <div className="page-stack">
      <PageHeader title="Liste noire" subtitle="Voyageurs signalés : une alerte s'affiche à la création de toute nouvelle réservation." />
      <InfoAlert>
        Évaluez les voyageurs de façon factuelle et proportionnée : indiquez un motif objectif (dégradations, impayé,
        non-respect du règlement). Ces données personnelles restent internes à DarnaLux.
      </InfoAlert>
      {error && <ErrorAlert>{error}</ErrorAlert>}
      {canManage && (
        <form onSubmit={add}>
          <Section title="Ajouter un voyageur">
            <GuestPicker value={selected?.id ?? null} onChange={setSelected} />
            <TextAreaField label="Motif" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">Ajouter à la liste noire</button>
            </div>
          </Section>
        </form>
      )}
      <Section title="Voyageurs signalés" flush>
        {guests.loading && <Loading />}
        {guests.error && <div className="panel-pad"><ErrorAlert>{guests.error}</ErrorAlert></div>}
        {guests.data && guests.data.length === 0 && <EmptyState icon={Ban} title="Liste noire vide" />}
        {guests.data && guests.data.length > 0 && (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Voyageur</th>
                  <th>Motif</th>
                  <th>Depuis</th>
                  {canManage && <th><span className="sr-only">Actions</span></th>}
                </tr>
              </thead>
              <tbody>
                {guests.data.map((g) => (
                  <tr key={g.id}>
                    <td>
                      <Link className="cell-title" to={`/app/guests/${g.id}`}>{personFullName(g.first_name, g.last_name)}</Link>
                      <small className="dim cell-sub">{g.email ?? g.phone ?? ''}</small>
                    </td>
                    <td>{g.blacklist_reason}</td>
                    <td>{formatDate(g.blacklisted_at)}</td>
                    {canManage && (
                      <td className="cell-actions">
                        <button type="button" className="btn btn-link btn-sm" onClick={() => remove(g)}>Retirer</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}

export default function BlacklistPage() {
  return (
    <RequirePermission permission={PERMISSIONS.GUESTS_VIEW}>
      <Blacklist />
    </RequirePermission>
  );
}
