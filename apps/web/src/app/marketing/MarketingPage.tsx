import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Megaphone, Plus } from 'lucide-react';
import type { CampaignField, CampaignInput } from '@darnalux/core';
import {
  CAMPAIGN_CHANNELS,
  CAMPAIGN_CHANNEL_LABELS,
  CAMPAIGN_OBJECTIVES,
  CAMPAIGN_OBJECTIVE_LABELS,
  CAMPAIGN_STATUSES,
  CAMPAIGN_STATUS_LABELS,
  CAMPAIGN_STATUS_TONES,
  PERMISSIONS,
  computeCampaignKpis,
  formatMoney,
  formatPercent,
  hasPermission,
  sumMetrics,
  validateCampaignInput,
} from '@darnalux/core';
import { useAuth } from '../../features/auth/AuthContext';
import { RequirePermission } from '../../features/auth/RequirePermission';
import { createCampaign, listCampaigns, metricsOf } from '../../features/marketing/api';
import { listPropertyOptions } from '../../features/properties/api';
import { useAsync } from '../../lib/useAsync';
import { toUserMessage } from '../../lib/errors';
import { formatNumber } from '../../lib/format';
import { Badge, EmptyState, Modal, PageHeader, Section, SelectField, StatCard, TextField, optionsFrom } from '../../components/ui';
import { ErrorAlert, InfoAlert, Loading } from '../../components/Feedback';

export function emptyCampaign(): CampaignInput {
  return {
    name: '',
    propertyId: null,
    objective: 'BOOKINGS',
    channel: 'META',
    budget: 0,
    startsOn: '',
    endsOn: '',
    audience: '',
    landingUrl: '',
    status: 'DRAFT',
  };
}

export function CampaignFields({
  input,
  errors,
  onChange,
  properties,
}: {
  input: CampaignInput;
  errors: Partial<Record<CampaignField, string>>;
  onChange: (input: CampaignInput) => void;
  properties: { id: string; name: string }[];
}) {
  const set = <K extends keyof CampaignInput>(key: K, value: CampaignInput[K]) => onChange({ ...input, [key]: value });
  return (
    <div className="form-grid">
      <TextField label="Nom de la campagne" required value={input.name} error={errors.name} onChange={(e) => set('name', e.target.value)} className="span-2" />
      <SelectField label="Bien" value={input.propertyId ?? ''} placeholder="— Tous / marque DarnaLux —" options={properties.map((p) => ({ value: p.id, label: p.name }))} onChange={(e) => set('propertyId', e.target.value || null)} />
      <SelectField label="Objectif" value={input.objective} options={optionsFrom(CAMPAIGN_OBJECTIVES, CAMPAIGN_OBJECTIVE_LABELS)} onChange={(e) => set('objective', e.target.value as CampaignInput['objective'])} />
      <SelectField label="Canal" value={input.channel} options={optionsFrom(CAMPAIGN_CHANNELS, CAMPAIGN_CHANNEL_LABELS)} onChange={(e) => set('channel', e.target.value as CampaignInput['channel'])} />
      <SelectField label="Statut" value={input.status} options={optionsFrom(CAMPAIGN_STATUSES, CAMPAIGN_STATUS_LABELS)} onChange={(e) => set('status', e.target.value as CampaignInput['status'])} />
      <TextField label="Budget (MAD)" type="number" min={0} value={String(input.budget)} error={errors.budget} onChange={(e) => set('budget', Number(e.target.value))} />
      <TextField label="Début" type="date" value={input.startsOn} onChange={(e) => set('startsOn', e.target.value)} />
      <TextField label="Fin" type="date" value={input.endsOn} error={errors.endsOn} onChange={(e) => set('endsOn', e.target.value)} />
      <TextField label="Audience" value={input.audience} onChange={(e) => set('audience', e.target.value)} placeholder="ex : Familles, Europe, 30-55 ans" className="span-2" />
      <TextField label="Landing page" value={input.landingUrl} error={errors.landingUrl} onChange={(e) => set('landingUrl', e.target.value)} placeholder="https://…" className="span-2" />
    </div>
  );
}

function Marketing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canManage = hasPermission(user, PERMISSIONS.MARKETING_MANAGE);
  const campaigns = useAsync(listCampaigns, []);
  const properties = useAsync(listPropertyOptions, []);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState<CampaignInput>(emptyCampaign);
  const [errors, setErrors] = useState<Partial<Record<CampaignField, string>>>({});
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateCampaignInput(input);
    setErrors(validation.errors);
    if (!validation.valid) return;
    try {
      navigate(`/app/marketing/${await createCampaign(input)}`);
    } catch (err) {
      setError(toUserMessage(err));
    }
  }

  const totals = sumMetrics((campaigns.data ?? []).flatMap((c) => metricsOf(c.marketing_metrics)));
  const kpis = computeCampaignKpis(totals);

  return (
    <div className="page-stack">
      <PageHeader
        title="Marketing"
        subtitle="Campagnes liées aux biens et performance publicitaire (dépenses → réservations → revenus)."
        actions={
          canManage && (
            <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
              <Plus size={16} aria-hidden="true" /> Nouvelle campagne
            </button>
          )
        }
      />
      <InfoAlert>
        Aucune plateforme publicitaire (Meta, Google, TikTok) n'est connectée : les métriques sont saisies manuellement.
        Les KPI ci-dessous sont calculés à partir de ces saisies.
      </InfoAlert>
      <div className="kpis">
        <StatCard label="Dépenses" value={formatMoney(totals.spend)} />
        <StatCard label="Impressions" value={formatNumber(totals.impressions)} note={`Portée ${formatNumber(totals.reach)}`} />
        <StatCard label="Clics" value={formatNumber(totals.clicks)} note={`CTR ${formatPercent(kpis.ctr, 2)}`} />
        <StatCard label="CPC / CPM" value={kpis.cpc === null ? '—' : formatMoney(kpis.cpc)} note={kpis.cpm === null ? '' : `CPM ${formatMoney(kpis.cpm)}`} />
        <StatCard label="Réservations attribuées" value={formatNumber(totals.bookings)} note={`${formatNumber(totals.leads)} leads`} />
        <StatCard label="Revenus attribués" value={formatMoney(totals.revenue)} />
        <StatCard label="ROAS" value={kpis.roas === null ? '—' : `${kpis.roas.toFixed(2).replace('.', ',')}×`} tone={kpis.roas !== null && kpis.roas >= 1 ? 'success' : undefined} />
        <StatCard label="Coût par réservation" value={kpis.costPerBooking === null ? '—' : formatMoney(kpis.costPerBooking)} />
      </div>
      <Section title="Campagnes" flush>
        {campaigns.loading && <Loading />}
        {campaigns.error && <div className="panel-pad"><ErrorAlert>{campaigns.error}</ErrorAlert></div>}
        {campaigns.data && campaigns.data.length === 0 && <EmptyState icon={Megaphone} title="Aucune campagne" />}
        {campaigns.data && campaigns.data.length > 0 && (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Campagne</th>
                  <th>Canal</th>
                  <th>Bien</th>
                  <th className="num">Budget</th>
                  <th className="num">Dépensé</th>
                  <th className="num">Réservations</th>
                  <th className="num">ROAS</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.data.map((c) => {
                  const m = sumMetrics(metricsOf(c.marketing_metrics));
                  const k = computeCampaignKpis(m);
                  return (
                    <tr key={c.id} className="row-link" onClick={() => navigate(`/app/marketing/${c.id}`)}>
                      <td>
                        <Link className="cell-title" to={`/app/marketing/${c.id}`} onClick={(e) => e.stopPropagation()}>{c.name}</Link>
                        <small className="dim cell-sub">{CAMPAIGN_OBJECTIVE_LABELS[c.objective]}</small>
                      </td>
                      <td>{CAMPAIGN_CHANNEL_LABELS[c.channel]}</td>
                      <td>{c.properties?.name ?? '—'}</td>
                      <td className="num">{formatMoney(Number(c.budget))}</td>
                      <td className="num">{formatMoney(m.spend)}</td>
                      <td className="num">{m.bookings}</td>
                      <td className="num">{k.roas === null ? '—' : `${k.roas.toFixed(2).replace('.', ',')}×`}</td>
                      <td><Badge tone={CAMPAIGN_STATUS_TONES[c.status]}>{CAMPAIGN_STATUS_LABELS[c.status]}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>
      {canManage && (
        <Modal open={open} title="Nouvelle campagne" onClose={() => setOpen(false)} wide>
          <form className="form-stack" onSubmit={handleCreate} noValidate>
            {error && <ErrorAlert>{error}</ErrorAlert>}
            <CampaignFields input={input} errors={errors} onChange={setInput} properties={properties.data ?? []} />
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Annuler</button>
              <button type="submit" className="btn btn-primary">Créer</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default function MarketingPage() {
  return (
    <RequirePermission permission={PERMISSIONS.MARKETING_VIEW}>
      <Marketing />
    </RequirePermission>
  );
}
