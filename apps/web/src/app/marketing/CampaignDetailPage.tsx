import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import type { CampaignField, CampaignInput, CampaignMetrics } from '@darnalux/core';
import {
  CAMPAIGN_CHANNEL_LABELS,
  CAMPAIGN_OBJECTIVE_LABELS,
  CAMPAIGN_STATUS_LABELS,
  CAMPAIGN_STATUS_TONES,
  PERMISSIONS,
  computeCampaignKpis,
  formatMoney,
  formatPercent,
  hasPermission,
  sumMetrics,
  toLocalISODate,
  validateCampaignInput,
} from '@darnalux/core';
import { useAuth } from '../../features/auth/AuthContext';
import { RequirePermission } from '../../features/auth/RequirePermission';
import { deleteCampaign, deleteMetric, getCampaign, metricsOf, toCampaignInput, updateCampaign, upsertMetric } from '../../features/marketing/api';
import { listPropertyOptions } from '../../features/properties/api';
import { useAsync } from '../../lib/useAsync';
import { toUserMessage } from '../../lib/errors';
import { formatDate, formatNumber } from '../../lib/format';
import { Badge, EmptyState, PageHeader, Section, StatCard, TextField } from '../../components/ui';
import { ErrorAlert, Loading } from '../../components/Feedback';
import { CampaignFields, emptyCampaign } from './MarketingPage';

const EMPTY_METRICS: CampaignMetrics = { spend: 0, impressions: 0, reach: 0, clicks: 0, leads: 0, bookings: 0, revenue: 0 };
const METRIC_FIELDS: { key: keyof CampaignMetrics; label: string }[] = [
  { key: 'spend', label: 'Dépense (MAD)' },
  { key: 'impressions', label: 'Impressions' },
  { key: 'reach', label: 'Portée' },
  { key: 'clicks', label: 'Clics' },
  { key: 'leads', label: 'Leads' },
  { key: 'bookings', label: 'Réservations' },
  { key: 'revenue', label: 'Revenus (MAD)' },
];

function CampaignDetail() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManage = hasPermission(user, PERMISSIONS.MARKETING_MANAGE);
  const campaign = useAsync(() => getCampaign(id), [id]);
  const properties = useAsync(listPropertyOptions, []);
  const [input, setInput] = useState<CampaignInput>(emptyCampaign);
  const [errors, setErrors] = useState<Partial<Record<CampaignField, string>>>({});
  const [metricDate, setMetricDate] = useState(toLocalISODate(new Date()));
  const [metrics, setMetrics] = useState<CampaignMetrics>(EMPTY_METRICS);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (campaign.data) setInput(toCampaignInput(campaign.data));
  }, [campaign.data]);

  if (campaign.loading) return <Loading />;
  if (campaign.error || !campaign.data) return <ErrorAlert>{campaign.error ?? 'Campagne introuvable.'}</ErrorAlert>;
  const c = campaign.data;
  const totals = sumMetrics(metricsOf(c.marketing_metrics));
  const kpis = computeCampaignKpis(totals);

  async function run(action: () => Promise<void>) {
    setError(null);
    try {
      await action();
      campaign.reload();
    } catch (err) {
      setError(toUserMessage(err));
    }
  }

  async function saveCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateCampaignInput(input);
    setErrors(validation.errors);
    if (!validation.valid) return;
    await run(() => updateCampaign(c.id, input));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function addMetric(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (Object.values(metrics).some((v) => !Number.isFinite(v) || v < 0)) {
      setError('Les métriques doivent être des nombres positifs.');
      return;
    }
    await run(() => upsertMetric(c.id, metricDate, metrics));
    setMetrics(EMPTY_METRICS);
  }

  return (
    <div className="page-stack">
      <PageHeader
        back={{ to: '/app/marketing', label: 'Marketing' }}
        title={c.name}
        subtitle={
          <>
            <Badge tone={CAMPAIGN_STATUS_TONES[c.status]}>{CAMPAIGN_STATUS_LABELS[c.status]}</Badge> {CAMPAIGN_CHANNEL_LABELS[c.channel]} ·{' '}
            {CAMPAIGN_OBJECTIVE_LABELS[c.objective]}
            {c.properties && ` · ${c.properties.name}`}
          </>
        }
        actions={
          canManage && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => window.confirm('Supprimer cette campagne et ses métriques ?') && run(async () => { await deleteCampaign(c.id); navigate('/app/marketing'); })}>
              <Trash2 size={14} aria-hidden="true" /> Supprimer
            </button>
          )
        }
      />
      {error && <ErrorAlert>{error}</ErrorAlert>}
      <div className="kpis">
        <StatCard label="Dépensé / budget" value={formatMoney(totals.spend)} note={`sur ${formatMoney(Number(c.budget))}`} />
        <StatCard label="CTR" value={formatPercent(kpis.ctr, 2)} note={`${formatNumber(totals.clicks)} clics`} />
        <StatCard label="CPC" value={kpis.cpc === null ? '—' : formatMoney(kpis.cpc)} note={kpis.cpm === null ? '' : `CPM ${formatMoney(kpis.cpm)}`} />
        <StatCard label="ROAS" value={kpis.roas === null ? '—' : `${kpis.roas.toFixed(2).replace('.', ',')}×`} />
        <StatCard label="Coût par lead" value={kpis.costPerLead === null ? '—' : formatMoney(kpis.costPerLead)} />
        <StatCard label="CAC / coût par réservation" value={kpis.cac === null ? '—' : formatMoney(kpis.cac)} />
        <StatCard label="Réservations" value={totals.bookings} />
        <StatCard label="Revenus attribués" value={formatMoney(totals.revenue)} />
      </div>
      <Section title="Métriques quotidiennes" flush>
        {c.marketing_metrics.length === 0 ? (
          <EmptyState title="Aucune métrique saisie" />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  {METRIC_FIELDS.map((f) => <th key={f.key} className="num">{f.label}</th>)}
                  {canManage && <th><span className="sr-only">Actions</span></th>}
                </tr>
              </thead>
              <tbody>
                {c.marketing_metrics.map((m) => (
                  <tr key={m.id}>
                    <td>{formatDate(m.metric_date)}</td>
                    {METRIC_FIELDS.map((f) => (
                      <td key={f.key} className="num">{f.key === 'spend' || f.key === 'revenue' ? formatMoney(Number(m[f.key])) : formatNumber(Number(m[f.key]))}</td>
                    ))}
                    {canManage && (
                      <td className="cell-actions">
                        <button type="button" className="icon-btn" aria-label="Supprimer la ligne" onClick={() => run(() => deleteMetric(m.id))}>
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
        {canManage && (
          <form className="panel-pad form-stack" onSubmit={addMetric}>
            <div className="form-grid form-grid-4">
              <TextField label="Date" type="date" value={metricDate} onChange={(e) => setMetricDate(e.target.value)} />
              {METRIC_FIELDS.map((f) => (
                <TextField key={f.key} label={f.label} type="number" min={0} step={f.key === 'spend' || f.key === 'revenue' ? '0.01' : '1'} value={String(metrics[f.key])} onChange={(e) => setMetrics((m) => ({ ...m, [f.key]: Number(e.target.value) }))} />
              ))}
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary btn-sm">Enregistrer la journée</button>
            </div>
          </form>
        )}
      </Section>
      {canManage && (
        <form onSubmit={saveCampaign}>
          <Section title="Paramètres de la campagne">
            <CampaignFields input={input} errors={errors} onChange={setInput} properties={properties.data ?? []} />
            <div className="form-actions">
              {saved && <span className="saved-note">Enregistré ✓</span>}
              <button type="submit" className="btn btn-primary">Enregistrer</button>
            </div>
          </Section>
        </form>
      )}
    </div>
  );
}

export default function CampaignDetailPage() {
  return (
    <RequirePermission permission={PERMISSIONS.MARKETING_VIEW}>
      <CampaignDetail />
    </RequirePermission>
  );
}
