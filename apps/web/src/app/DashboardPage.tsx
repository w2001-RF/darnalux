// Minimal authenticated placeholder for Phase 1. Real KPIs/data will be
// wired to @darnalux/core use-cases in the properties/reservations phases.
export default function DashboardPage() {
  const activity = [
    'Check-in confirmé · Villa Atlas',
    'Intervention terminée · Riad Noor',
    'Nouvelle réservation · Appartement Océan',
    'Document propriétaire ajouté · Villa Azur',
  ];
  const arrivals = ['Villa Atlas · 15:00', 'Riad Noor · 16:30', 'Appartement Océan · 18:00'];

  return (
    <>
      <div className="kpis">
        <div><span>Biens actifs</span><b>24</b><small>+2 ce mois</small></div>
        <div><span>Réservations</span><b>48</b><small>12 check-ins</small></div>
        <div><span>Revenus du mois</span><b>126 400 MAD</b><small>+8.4%</small></div>
        <div><span>Tâches ouvertes</span><b>07</b><small>2 urgentes</small></div>
      </div>
      <div className="app-grid">
        <div className="panel">
          <div className="panel-head"><h2>Activité récente</h2><span>Voir tout →</span></div>
          {activity.map((x, i) => (
            <div className="row" key={x}>
              <i></i>
              <div><b>{x}</b><small>{i + 1} heure{i ? 's' : ''} ago</small></div>
            </div>
          ))}
        </div>
        <div className="panel">
          <div className="panel-head"><h2>Prochaines arrivées</h2><span>Calendrier →</span></div>
          {arrivals.map((x) => (
            <div className="booking" key={x}>
              <b>{x.split(' · ')[0]}</b><span>{x.split(' · ')[1]}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
