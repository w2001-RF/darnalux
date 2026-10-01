import { Building2, CalendarCheck, ClipboardList, TrendingUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// Phase 1 placeholder: every figure below is demo data, labelled as such in the
// UI. Real KPIs will be wired to @darnalux/core use-cases in the
// properties/reservations phases.
const kpis: { icon: LucideIcon; label: string; value: string; note: string }[] = [
  { icon: Building2, label: 'Biens actifs', value: '24', note: '+2 ce mois' },
  { icon: CalendarCheck, label: 'Réservations', value: '48', note: '12 check-ins' },
  { icon: TrendingUp, label: 'Revenus du mois', value: '126 400 MAD', note: '+8,4 %' },
  { icon: ClipboardList, label: 'Tâches ouvertes', value: '07', note: '2 urgentes' },
];

const activity = [
  ['Check-in confirmé · Villa Atlas', 'Il y a 1 h'],
  ['Intervention terminée · Riad Noor', 'Il y a 2 h'],
  ['Nouvelle réservation · Appartement Océan', 'Il y a 3 h'],
  ['Document propriétaire ajouté · Villa Azur', 'Il y a 4 h'],
];

const arrivals = [
  ['Villa Atlas', '15:00'],
  ['Riad Noor', '16:30'],
  ['Appartement Océan', '18:00'],
];

export default function DashboardPage() {
  return (
    <div className="page-stack">
      <div className="alert alert-demo" role="note">
        <span>
          <strong>Données de démonstration.</strong> Ces indicateurs sont illustratifs et seront remplacés
          par les données réelles dans les prochaines phases.
        </span>
      </div>

      <div className="kpis">
        {kpis.map(({ icon: Icon, label, value, note }) => (
          <div className="kpi" key={label}>
            <div className="kpi-top">
              <span>{label}</span>
              <span className="kpi-icon"><Icon size={18} aria-hidden="true" /></span>
            </div>
            <b>{value}</b>
            <small>{note}</small>
          </div>
        ))}
      </div>

      <div className="app-grid">
        <section className="panel">
          <div className="panel-head">
            <h2>Activité récente</h2>
            <span className="badge badge-gold">Démo</span>
          </div>
          {activity.map(([text, when]) => (
            <div className="row" key={text}>
              <i></i>
              <div><b>{text}</b><small>{when}</small></div>
            </div>
          ))}
        </section>
        <section className="panel">
          <div className="panel-head">
            <h2>Prochaines arrivées</h2>
            <span className="badge badge-gold">Démo</span>
          </div>
          {arrivals.map(([property, time]) => (
            <div className="booking" key={property}>
              <b>{property}</b><span>{time}</span>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
