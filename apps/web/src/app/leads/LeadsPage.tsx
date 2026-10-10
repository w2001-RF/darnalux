import { useMemo, useState } from 'react';
import { Inbox, MessageSquareText } from 'lucide-react';
import type { LeadTab } from '@darnalux/core';
import {
  LEAD_KIND_LABELS,
  LEAD_STATUS_LABELS,
  LEAD_STATUS_TONES,
  LEAD_STATUSES,
  LEAD_TAB_LABELS,
  LEAD_TABS,
  PERMISSIONS,
  countLeadsByTab,
  hasPermission,
  leadTab,
} from '@darnalux/core';
import { useAuth } from '../../features/auth/AuthContext';
import { listLeads, listReplyTemplates } from '../../features/leads/api';
import type { LeadRow } from '../../features/leads/api';
import { useAsync } from '../../lib/useAsync';
import { formatRelative } from '../../lib/format';
import { Badge, EmptyState, PageHeader, Tabs, optionsFrom } from '../../components/ui';
import { ErrorAlert, Loading } from '../../components/Feedback';
import { LeadDetailModal } from './LeadDetailModal';
import { ReplyTemplatesModal } from './ReplyTemplatesModal';

export default function LeadsPage() {
  const { user } = useAuth();
  const canManage = hasPermission(user, PERMISSIONS.MARKETING_MANAGE);
  const [tab, setTab] = useState<LeadTab>('ESTIMATES');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [templatesOpen, setTemplatesOpen] = useState(false);

  const leads = useAsync(listLeads, []);
  const templates = useAsync(listReplyTemplates, []);

  const rows = leads.data ?? [];
  const counts = useMemo(() => countLeadsByTab(rows), [rows]);
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter(
      (r) =>
        leadTab(r) === tab &&
        (status === '' || r.status === status) &&
        (term === '' || [r.full_name, r.email, r.phone ?? '', r.address ?? '', r.zone_label ?? ''].some((v) => v.toLowerCase().includes(term))),
    );
  }, [rows, tab, status, search]);

  const selected = rows.find((r) => r.id === selectedId) ?? null;

  return (
    <div className="page-stack">
      <PageHeader
        title="Demandes"
        subtitle="Estimations, devis et messages reçus depuis la page d'accueil."
        actions={
          <button type="button" className="btn btn-ghost" onClick={() => setTemplatesOpen(true)}>
            <MessageSquareText size={16} aria-hidden="true" /> Modèles de réponse
          </button>
        }
      />
      <Tabs
        tabs={LEAD_TABS.map((id) => ({ id, label: LEAD_TAB_LABELS[id], count: counts[id] }))}
        active={tab}
        onChange={(id) => {
          setTab(id);
          setStatus('');
        }}
      />
      <div className="filters">
        <input type="search" aria-label="Rechercher" placeholder="Nom, e-mail, téléphone, adresse…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select aria-label="Statut" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tous les statuts</option>
          {optionsFrom(LEAD_STATUSES, LEAD_STATUS_LABELS).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      {leads.loading && <Loading />}
      {leads.error && <ErrorAlert>{leads.error}</ErrorAlert>}
      {leads.data && visible.length === 0 && <EmptyState icon={Inbox} title="Aucune demande" text="Rien à afficher pour ce filtre." />}
      {visible.length > 0 && (
        <section className="panel panel-flush">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Reçue</th>
                  <th>Contact</th>
                  <th>Demande</th>
                  <th>Statut</th>
                  <th>Réponse</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <LeadRowView key={r.id} lead={r} onOpen={() => setSelectedId(r.id)} />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <LeadDetailModal
        lead={selected}
        templates={templates.data ?? []}
        canManage={canManage}
        onClose={() => setSelectedId(null)}
        onChanged={leads.reload}
      />
      <ReplyTemplatesModal
        open={templatesOpen}
        canManage={canManage}
        templates={templates.data ?? []}
        onClose={() => setTemplatesOpen(false)}
        onChanged={templates.reload}
      />
    </div>
  );
}

function LeadRowView({ lead, onOpen }: { lead: LeadRow; onOpen: () => void }) {
  return (
    <tr className="row-link" onClick={onOpen}>
      <td>
        {formatRelative(lead.created_at)}
        <small className="dim cell-sub">{LEAD_KIND_LABELS[lead.kind]}</small>
      </td>
      <td>
        <button type="button" className="cell-title link-button" onClick={onOpen}>{lead.full_name}</button>
        <small className="dim cell-sub">{lead.email}</small>
      </td>
      <td>
        {lead.kind === 'QUOTE' ? (
          <>
            <span className="truncate">{lead.config_label ?? '—'}</span>
            <small className="dim cell-sub">{[lead.address, lead.zone_label].filter(Boolean).join(' · ')}</small>
          </>
        ) : (
          <span className="truncate">{lead.message}</span>
        )}
      </td>
      <td><Badge tone={LEAD_STATUS_TONES[lead.status]}>{LEAD_STATUS_LABELS[lead.status]}</Badge></td>
      <td>
        {lead.last_reply_channel ? (
          <>
            {lead.last_reply_channel === 'EMAIL' ? 'E-mail' : 'WhatsApp'}
            <small className="dim cell-sub">{lead.last_reply_at ? formatRelative(lead.last_reply_at) : ''}</small>
          </>
        ) : (
          <span className="dim">—</span>
        )}
      </td>
    </tr>
  );
}
