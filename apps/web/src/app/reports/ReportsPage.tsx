import { useState } from 'react';
import { Download, Printer } from 'lucide-react';
import type { CsvCell } from '@darnalux/core';
import {
  BOOKING_CHANNEL_LABELS,
  PERMISSIONS,
  PROPERTY_STATUS_LABELS,
  PROPERTY_TYPE_LABELS,
  RESERVATION_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  TASK_TYPE_LABELS,
  addDays,
  formatPercent,
  hasPermission,
  nightsBetween,
  performanceByProperty,
  personFullName,
  startOfMonth,
  startOfNextMonth,
  toLocalISODate,
} from '@darnalux/core';
import { useAuth } from '../../features/auth/AuthContext';
import { RequirePermission } from '../../features/auth/RequirePermission';
import { listReservations, listReservationsForPeriod } from '../../features/reservations/api';
import { listProperties } from '../../features/properties/api';
import { listExpenses } from '../../features/finance/api';
import { listTasks } from '../../features/tasks/api';
import { useAsync } from '../../lib/useAsync';
import { downloadCsv } from '../../lib/files';
import { PageHeader, Section, Tabs } from '../../components/ui';
import { ErrorAlert, Loading } from '../../components/Feedback';

type ReportId = 'reservations' | 'revenue' | 'interventions' | 'properties';

const REPORT_LABELS: Record<ReportId, string> = {
  reservations: 'Réservations',
  revenue: 'Revenus par bien',
  interventions: 'Interventions',
  properties: 'Logements',
};

interface ReportTable {
  headers: string[];
  rows: CsvCell[][];
}

async function buildReport(report: ReportId, from: string, toExclusive: string): Promise<ReportTable> {
  if (report === 'reservations') {
    const rows = await listReservations({ from, to: addDays(toExclusive, -1), limit: 1000 });
    return {
      headers: ['Référence', 'Bien', 'Voyageur', 'Arrivée', 'Départ', 'Nuits', 'Source', 'Statut', 'Montant'],
      rows: rows.map((r) => [
        r.reference,
        r.properties?.name ?? '',
        r.guests ? personFullName(r.guests.first_name, r.guests.last_name) : '',
        r.check_in,
        r.check_out,
        nightsBetween(r.check_in, r.check_out),
        BOOKING_CHANNEL_LABELS[r.source],
        RESERVATION_STATUS_LABELS[r.status],
        Number(r.gross_amount),
      ]),
    };
  }
  if (report === 'revenue') {
    const [properties, reservations, expenses] = await Promise.all([listProperties(), listReservationsForPeriod(from, toExclusive), listExpenses(from, toExclusive)]);
    const perf = performanceByProperty(
      properties.map((p) => p.id),
      {
        periodStart: from,
        periodEnd: toExclusive,
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
      },
    );
    return {
      headers: ['Bien', 'Réservations', 'Nuits', 'Occupation', 'Revenu brut', 'Commission', 'Frais', 'Dépenses', 'Net propriétaire', 'ADR', 'RevPAR', 'Annulations'],
      rows: properties.map((p) => {
        const x = perf.get(p.id)!;
        return [p.name, x.reservations, x.nightsBooked, formatPercent(x.occupancyRate), x.revenue, x.commissions, x.platformFees, x.expenses, x.ownerNet, x.adr, x.revpar, x.cancellations];
      }),
    };
  }
  if (report === 'interventions') {
    const tasks = (await listTasks({ dueBefore: new Date(`${toExclusive}T00:00:00`).toISOString(), limit: 1000 })).filter(
      (t) => t.due_at && toLocalISODate(new Date(t.due_at)) >= from,
    );
    return {
      headers: ['Tâche', 'Type', 'Bien', 'Échéance', 'Priorité', 'Statut', 'Terminée le'],
      rows: tasks.map((t) => [
        t.title,
        TASK_TYPE_LABELS[t.type],
        t.properties?.name ?? '',
        t.due_at ? new Date(t.due_at).toLocaleString('fr-MA') : '',
        TASK_PRIORITY_LABELS[t.priority],
        TASK_STATUS_LABELS[t.status],
        t.completed_at ? new Date(t.completed_at).toLocaleString('fr-MA') : '',
      ]),
    };
  }
  const properties = await listProperties();
  return {
    headers: ['Bien', 'Type', 'Ville', 'Adresse', 'Capacité', 'Chambres', 'Commission (%)', 'Statut'],
    rows: properties.map((p) => [p.name, PROPERTY_TYPE_LABELS[p.type], p.city, p.address ?? '', p.capacity, p.bedrooms, Number(p.commission_rate), PROPERTY_STATUS_LABELS[p.status]]),
  };
}

function Reports() {
  const { user } = useAuth();
  const canExport = hasPermission(user, PERMISSIONS.REPORTS_EXPORT);
  const now = new Date();
  const [report, setReport] = useState<ReportId>('reservations');
  const [from, setFrom] = useState(startOfMonth(now.getFullYear(), now.getMonth()));
  const [to, setTo] = useState(addDays(startOfNextMonth(now.getFullYear(), now.getMonth()), -1));
  const table = useAsync(() => buildReport(report, from, addDays(to, 1)), [report, from, to]);

  return (
    <div className="page-stack">
      <PageHeader
        title="Rapports"
        subtitle="Exports CSV (Excel) et impression PDF."
        actions={
          canExport && (
            <>
              <button type="button" className="btn btn-ghost" disabled={!table.data} onClick={() => table.data && downloadCsv(`rapport-${report}-${from}-${to}.csv`, [table.data.headers, ...table.data.rows])}>
                <Download size={16} aria-hidden="true" /> CSV
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => window.print()}>
                <Printer size={16} aria-hidden="true" /> PDF
              </button>
            </>
          )
        }
      />
      <Tabs tabs={(Object.keys(REPORT_LABELS) as ReportId[]).map((id) => ({ id, label: REPORT_LABELS[id] }))} active={report} onChange={setReport} />
      {report !== 'properties' && (
        <div className="filters">
          <label className="filter-label">Du <input type="date" value={from} onChange={(e) => e.target.value && setFrom(e.target.value)} /></label>
          <label className="filter-label">Au <input type="date" value={to} onChange={(e) => e.target.value && setTo(e.target.value)} /></label>
        </div>
      )}
      {table.loading && <Loading />}
      {table.error && <ErrorAlert>{table.error}</ErrorAlert>}
      {table.data && (
        <Section title={`${REPORT_LABELS[report]} — ${table.data.rows.length} ligne(s)`} flush>
          <div className="table-wrap print-full">
            <table className="data-table">
              <thead>
                <tr>{table.data.headers.map((h) => <th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {table.data.rows.map((row, i) => (
                  <tr key={i}>{row.map((cell, j) => <td key={j} className={typeof cell === 'number' ? 'num' : undefined}>{cell === null || cell === undefined ? '—' : typeof cell === 'number' ? cell.toLocaleString('fr-MA') : String(cell)}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}
    </div>
  );
}

export default function ReportsPage() {
  return (
    <RequirePermission permission={PERMISSIONS.REPORTS_VIEW}>
      <Reports />
    </RequirePermission>
  );
}
