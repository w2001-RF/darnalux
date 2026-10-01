import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  CalendarDays,
  KeyRound,
  Megaphone,
  Wallet,
  Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Brand } from '../components/Brand';
import { ThemeToggle } from '../components/ThemeToggle';

const stats = [['24/7', 'Suivi opérationnel'], ['100%', 'Vue centralisée'], ['1', 'Espace DarnaLux']];

const features: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Building2, title: 'Biens & propriétaires', text: 'Centralisez les propriétés, propriétaires, documents et informations opérationnelles.' },
  { icon: CalendarDays, title: 'Réservations & calendrier', text: 'Visualisez les séjours, check-in, check-out et disponibilités au même endroit.' },
  { icon: Wrench, title: 'Équipes & interventions', text: 'Attribuez les tâches, suivez les interventions et gardez une trace de chaque action.' },
  { icon: Wallet, title: 'Finance & performance', text: 'Suivez revenus, commissions, dépenses et indicateurs par propriété.' },
  { icon: Megaphone, title: 'Marketing', text: 'Préparez les campagnes et rattachez leurs performances aux propriétés et réservations.' },
  { icon: KeyRound, title: 'Check-in & check-out', text: 'Fluidifiez l’arrivée et le départ des voyageurs avec des parcours digitaux.' },
];

const steps = [
  ['01', 'Réservation', 'Airbnb · Booking · Direct'],
  ['02', 'Préparation', 'Tâches · documents · équipe'],
  ['03', 'Accueil', 'Check-in · voyageurs · support'],
  ['04', 'Départ', 'Check-out · inspection · finance'],
];

export default function LandingPage() {
  return (
    <div className="landing">
      <header className="nav">
        <Brand />
        <nav aria-label="Navigation principale">
          <a href="#fonctionnalites">Fonctionnalités</a>
          <a href="#workflow">Opérations</a>
          <a href="#vision">Vision</a>
        </nav>
        <div className="nav-actions">
          <ThemeToggle />
          <Link className="btn btn-primary btn-sm" to="/app">Accéder à l'espace</Link>
        </div>
      </header>
      <main>
        <section className="hero">
          <div className="hero-inner">
            <div className="hero-copy">
              <div className="eyebrow">Plateforme de conciergerie</div>
              <h1>La gestion de vos biens.<br /><span className="serif-em">Plus simple. Plus claire.</span></h1>
              <p className="hero-lead">
                DarnaLux centralise propriétés, propriétaires, réservations, équipes, voyageurs, finances et marketing dans une seule expérience.
              </p>
              <div className="hero-actions">
                <Link className="btn btn-primary btn-lg" to="/app">Découvrir la plateforme <ArrowRight size={18} aria-hidden="true" /></Link>
                <a className="btn btn-ghost btn-lg" href="#fonctionnalites">Voir les fonctionnalités</a>
              </div>
              <div className="trust">Conçue pour les équipes de conciergerie modernes</div>
            </div>
            <div className="hero-card" aria-label="Aperçu illustratif du tableau de bord">
              <div className="card-top">
                <span>Vue d'ensemble</span>
                <span className="demo-tag">Aperçu · données fictives</span>
              </div>
              <div className="big-number">48 <small>séjours actifs</small></div>
              <div className="mini-grid">
                <div><b>92%</b><span>occupation</span></div>
                <div><b>126k</b><span>revenus MAD</span></div>
                <div><b>07</b><span>interventions</span></div>
                <div><b>19</b><span>check-ins</span></div>
              </div>
              <div className="activity"><i></i><span>Prochaine arrivée</span><strong>Villa Atlas · 15:00</strong></div>
            </div>
          </div>
        </section>

        <div className="stats-band">
          <section className="stats" aria-label="Chiffres clés">
            {stats.map(([n, l]) => <div key={l}><strong>{n}</strong><span>{l}</span></div>)}
          </section>
        </div>

        <section id="fonctionnalites" className="section">
          <div className="section-head">
            <div>
              <div className="eyebrow">Un seul espace</div>
              <h2>Tout ce qu'il faut pour<br /><span className="serif-em">piloter la conciergerie.</span></h2>
            </div>
            <p>Une architecture pensée pour relier le quotidien des équipes aux données propriétaires et aux performances des biens.</p>
          </div>
          <div className="features">
            {features.map(({ icon: Icon, title, text }, i) => (
              <article className="feature" key={title}>
                <span className="feature-num">0{i + 1}</span>
                <span className="feature-icon"><Icon size={22} aria-hidden="true" /></span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="workflow" className="workflow">
          <div className="workflow-panel">
            <div className="eyebrow eyebrow-light">De la réservation au check-out</div>
            <h2>Une continuité opérationnelle,<br /><span className="serif-em">du premier clic au dernier contrôle.</span></h2>
            <div className="steps">
              {steps.map(([n, title, detail]) => (
                <div className="step" key={n}><b>{n}</b><span>{title}</span><small>{detail}</small></div>
              ))}
            </div>
          </div>
        </section>

        <section id="vision" className="closing">
          <div className="eyebrow eyebrow-light">DarnaLux</div>
          <h2>Une base solide pour<br /><span className="serif-em">grandir sereinement.</span></h2>
          <div className="rule" />
          <p>Web, mobile et backend partagent le même cœur métier. Le système peut évoluer de GitHub Pages vers Vercel sans reconstruire l'application.</p>
          <Link className="btn btn-gold btn-lg" to="/app">Entrer dans DarnaLux <ArrowRight size={18} aria-hidden="true" /></Link>
        </section>
      </main>
      <footer className="site-footer">
        <div className="footer-inner">
          <Brand />
          <p className="footer-tag">Votre maison, notre signature</p>
          <div className="footer-bottom">
            <span>© 2026 DarnaLux Concierge · Tous droits réservés</span>
            <span>Conciergerie · Hospitality · Operations</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
