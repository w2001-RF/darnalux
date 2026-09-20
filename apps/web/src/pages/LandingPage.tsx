import { Link } from 'react-router-dom';

const stats = [['24/7', 'Suivi opérationnel'], ['100%', 'Vue centralisée'], ['1', 'Espace DarnaLux']];
const features = [
  ['Biens & propriétaires', 'Centralisez les propriétés, propriétaires, documents et informations opérationnelles.'],
  ['Réservations & calendrier', 'Visualisez les séjours, check-in, check-out et disponibilités au même endroit.'],
  ['Équipes & interventions', 'Attribuez les tâches, suivez les interventions et gardez une trace de chaque action.'],
  ['Finance & performance', 'Suivez revenus, commissions, dépenses et indicateurs par propriété.'],
  ['Marketing', 'Préparez les campagnes et rattachez leurs performances aux propriétés et réservations.'],
  ['Check-in & check-out', 'Fluidifiez l’arrivée et le départ des voyageurs avec des parcours digitaux.'],
];

export default function LandingPage() {
  return (
    <div className="landing">
      <header className="nav">
        <Link to="/" className="brand"><span className="brand-mark">D</span><span>Darna<span>Lux</span></span></Link>
        <nav>
          <a href="#fonctionnalites">Fonctionnalités</a>
          <a href="#workflow">Opérations</a>
          <a href="#vision">Vision</a>
        </nav>
        <Link className="nav-cta" to="/app">Accéder à l'espace</Link>
      </header>
      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">PLATEFORME DE CONCIERGERIE</div>
            <h1>La gestion de vos biens.<br /><em>Plus simple. Plus claire.</em></h1>
            <p>DarnaLux centralise propriétés, propriétaires, réservations, équipes, voyageurs, finances et marketing dans une seule expérience.</p>
            <div className="hero-actions">
              <Link className="primary" to="/app">Découvrir la plateforme <span>→</span></Link>
              <a className="secondary" href="#fonctionnalites">Voir les fonctionnalités</a>
            </div>
            <div className="trust"><span>●</span> Conçue pour les équipes de conciergerie modernes</div>
          </div>
          <div className="hero-card">
            <div className="card-top"><span>Vue d'ensemble</span><span className="live">● EN DIRECT</span></div>
            <div className="big-number">48 <small>séjours actifs</small></div>
            <div className="mini-grid">
              <div><b>92%</b><span>occupation</span></div>
              <div><b>126k</b><span>revenus MAD</span></div>
              <div><b>07</b><span>interventions</span></div>
              <div><b>19</b><span>check-ins</span></div>
            </div>
            <div className="activity"><i></i><span>Prochaine arrivée</span><strong>Villa Atlas · 15:00</strong></div>
          </div>
        </section>
        <section className="stats">
          {stats.map(([n, l]) => <div key={l}><strong>{n}</strong><span>{l}</span></div>)}
        </section>
        <section id="fonctionnalites" className="section">
          <div className="section-head">
            <div>
              <div className="eyebrow">UN SEUL ESPACE</div>
              <h2>Tout ce qu'il faut pour<br /><em>piloter la conciergerie.</em></h2>
            </div>
            <p>Une architecture pensée pour relier le quotidien des équipes aux données propriétaires et aux performances des biens.</p>
          </div>
          <div className="features">
            {features.map(([t, d], i) => (
              <article key={t}>
                <span className="feature-num">0{i + 1}</span>
                <h3>{t}</h3>
                <p>{d}</p>
                <span className="arrow">↗</span>
              </article>
            ))}
          </div>
        </section>
        <section id="workflow" className="workflow">
          <div className="workflow-panel">
            <div className="eyebrow">DU RÉSERVATION AU CHECK-OUT</div>
            <h2>Une continuité opérationnelle,<br /><em>du premier clic au dernier contrôle.</em></h2>
            <div className="steps">
              <div><b>01</b><span>Réservation</span><small>Airbnb · Booking · Direct</small></div>
              <div><b>02</b><span>Préparation</span><small>Tâches · documents · équipe</small></div>
              <div><b>03</b><span>Accueil</span><small>Check-in · voyageurs · support</small></div>
              <div><b>04</b><span>Départ</span><small>Check-out · inspection · finance</small></div>
            </div>
          </div>
        </section>
        <section id="vision" className="closing">
          <div className="eyebrow">DARNA LUX</div>
          <h2>Une base solide pour<br /><em>grandir sereinement.</em></h2>
          <p>Web, mobile et backend partagent le même cœur métier. Le système peut évoluer de GitHub Pages vers Vercel sans reconstruire l'application.</p>
          <Link className="primary" to="/app">Entrer dans DarnaLux →</Link>
        </section>
      </main>
      <footer>
        <span>© 2026 DarnaLux</span>
        <span>Conciergerie · Hospitality · Operations</span>
      </footer>
    </div>
  );
}
