import { useState } from 'react';
import type { FormEvent } from 'react';
import {
  ArrowRight,
  Building2,
  Camera,
  Check,
  ChevronDown,
  ClipboardCheck,
  Eye,
  Handshake,
  KeyRound,
  LineChart,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  Tag,
  UserCheck,
  Wallet,
  Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Brand } from '../components/Brand';
import { ThemeToggle } from '../components/ThemeToggle';
import {
  ESTIMATE_ZONES,
  PROPERTY_KINDS,
  PROPERTY_KIND_LABELS,
  STANDINGS,
  STANDING_LABELS,
  estimateRevenue,
} from '@darnalux/core';
import type { PropertyKind, Standing } from '@darnalux/core';
import { CONTACT_EMAIL, CONTACT_PHONE, buildQuoteMailto } from '../lib/contact';
import '../landing.css';

const canContact = CONTACT_EMAIL !== '';

const stats = [['24/7', 'Suivi opérationnel'], ['100%', 'Vue centralisée'], ['1', 'Interlocuteur dédié']];

const audience = [
  'Optimiser les revenus de votre bien sans y consacrer vos journées',
  'Comprendre chaque décision : prix, calendrier, entretien',
  'Éviter la gestion quotidienne des voyageurs et des imprévus',
  'Garder une vue claire sur vos réservations et vos revenus',
  'Confier votre bien à une équipe qui le traite comme le sien',
];

const pillars: { icon: LucideIcon; title: string; items: string[] }[] = [
  {
    icon: Camera,
    title: 'Avant la mise en location',
    items: ['Audit du bien et recommandation tarifaire', 'Photos et annonce soignées', 'Équipement, linge et mise aux standards', 'Création des annonces'],
  },
  {
    icon: KeyRound,
    title: 'Pendant l’exploitation',
    items: ['Diffusion multi-plateformes', 'Réservations et échanges voyageurs', 'Check-in et check-out digitaux', 'Ménage, linge et maintenance'],
  },
  {
    icon: LineChart,
    title: 'Suivi et pilotage',
    items: ['Ajustement des prix selon la demande', 'Suivi des revenus et des charges', 'Rapports propriétaires clairs', 'Espace propriétaire dédié'],
  },
];

const method = [
  ['01', 'Premier échange', 'Comprendre votre bien et vos objectifs'],
  ['02', 'Évaluation', 'Recommandations et estimation des revenus'],
  ['03', 'Mise en ligne', 'Annonces, photos et optimisation'],
  ['04', 'Gestion quotidienne', 'Voyageurs, ménage, interventions'],
  ['05', 'Suivi continu', 'Rapports et amélioration permanente'],
];

const reasons: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: MapPin, title: 'Expertise locale', text: 'Une connaissance fine du marché, des quartiers et des attentes des voyageurs.' },
  { icon: Eye, title: 'Transparence', text: 'Chaque réservation, chaque dépense et chaque décision restent lisibles.' },
  { icon: Handshake, title: 'Conseil avant volume', text: 'Nous recommandons ce qui sert votre bien, pas ce qui remplit un calendrier.' },
  { icon: UserCheck, title: 'Relation directe', text: 'Un interlocuteur identifié, joignable, qui connaît votre dossier.' },
  { icon: Wrench, title: 'Équipes terrain', text: 'Ménage, contrôle et interventions coordonnés dans un même outil.' },
  { icon: Building2, title: 'Vision long terme', text: 'Préserver l’état du bien et sa réputation, saison après saison.' },
];

const platform: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: ClipboardCheck, title: 'Réservations & calendrier', text: 'Séjours, arrivées et départs visibles au même endroit.' },
  { icon: Wallet, title: 'Revenus & finances', text: 'Revenus, commissions et charges, bien par bien.' },
  { icon: Sparkles, title: 'Interventions', text: 'Chaque tâche attribuée, suivie et tracée.' },
  { icon: KeyRound, title: 'Check-in digital', text: 'Un parcours simple pour accueillir vos voyageurs.' },
];

const pricing = [
  'Du temps gagné : nous gérons le quotidien',
  'Des conseils personnalisés pour chaque bien',
  'Une surveillance régulière du logement',
];

const faqs = [
  ['Quels types de biens gérez-vous ?', 'Appartements, duplex, villas et étages de villa destinés à la location courte durée.'],
  ['Dois-je être présent pendant les séjours ?', 'Non. L’accueil, le ménage, le suivi des voyageurs et les interventions sont pris en charge par notre équipe.'],
  ['Comment suivre mes revenus ?', 'Votre espace propriétaire rassemble réservations, revenus et documents, avec des rapports réguliers.'],
  ['Comment les voyageurs sont-ils vérifiés ?', 'Chaque voyageur suit un parcours de check-in numérique, et notre équipe contrôle les pièces avant l’arrivée.'],
  ['Comment connaître le potentiel de mon bien ?', 'Demandez une estimation : nous analysons votre bien et vous proposons une recommandation personnalisée.'],
];

interface Profile {
  zoneId: string;
  address: string;
  kind: PropertyKind;
  bedrooms: number;
  standing: Standing;
}

type SetProfile = (update: (p: Profile) => Profile) => void;

const initialProfile: Profile = { zoneId: '', address: '', kind: 'APARTMENT', bedrooms: 1, standing: 'COMFORT' };

const BEDROOM_OPTIONS = [1, 2, 3, 4];
const bedroomLabel = (n: number) => (n >= 4 ? '4 chambres ou plus' : n === 1 ? '1 chambre' : `${n} chambres`);
const mad = new Intl.NumberFormat('fr-FR');
const zoneGroups = [...new Set(ESTIMATE_ZONES.map((z) => z.group))];
const zoneLabel = (id: string) => ESTIMATE_ZONES.find((z) => z.id === id)?.label ?? '';

function estimateOf(p: Profile) {
  return estimateRevenue({ kind: p.kind, zoneId: p.zoneId, bedrooms: p.kind === 'STUDIO' ? 0 : p.bedrooms, standing: p.standing });
}

function estimateText(p: Profile): string {
  const e = estimateOf(p);
  return e ? `${mad.format(e.monthlyLow)} – ${mad.format(e.monthlyHigh)} MAD / mois (brut, indicatif)` : '';
}

function ZoneSelect({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <select required value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="" disabled>Sélectionnez une zone</option>
      {zoneGroups.map((g) => (
        <optgroup key={g} label={g}>
          {ESTIMATE_ZONES.filter((z) => z.group === g).map((z) => <option key={z.id} value={z.id}>{z.label}</option>)}
        </optgroup>
      ))}
    </select>
  );
}

function KindSelect({ value, onChange }: { value: PropertyKind; onChange: (k: PropertyKind) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as PropertyKind)}>
      {PROPERTY_KINDS.map((k) => <option key={k} value={k}>{PROPERTY_KIND_LABELS[k]}</option>)}
    </select>
  );
}

function StandingSelect({ value, onChange }: { value: Standing; onChange: (s: Standing) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as Standing)}>
      {STANDINGS.map((s) => <option key={s} value={s}>{STANDING_LABELS[s]}</option>)}
    </select>
  );
}

function BedroomSelect({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(Number(e.target.value))}>
      {BEDROOM_OPTIONS.map((n) => <option key={n} value={n}>{bedroomLabel(n)}</option>)}
    </select>
  );
}

type Step = 'place' | 'details' | 'result';

function EstimatorCard({ profile, setProfile }: { profile: Profile; setProfile: SetProfile }) {
  const [step, setStep] = useState<Step>('place');
  const patch = (changes: Partial<Profile>) => setProfile((p) => ({ ...p, ...changes }));
  const stepIndex = step === 'place' ? 1 : step === 'details' ? 2 : 3;
  const estimate = step === 'result' ? estimateOf(profile) : null;

  function next(event: FormEvent, to: Step) {
    event.preventDefault();
    setStep(to);
  }

  return (
    <div className="hero-card estimator" aria-labelledby="estimator-title">
      <ol className="stepper" aria-label={`Étape ${stepIndex} sur 3`}>
        {['Votre bien', 'Détails', 'Estimation'].map((label, i) => (
          <li key={label} className={i + 1 === stepIndex ? 'active' : i + 1 < stepIndex ? 'done' : ''}>
            <b>{i + 1}</b><span>{label}</span>
          </li>
        ))}
      </ol>
      <h2 id="estimator-title">Combien pourriez-vous gagner ?</h2>
      <p className="estimator-sub">Estimation gratuite en moins de 2 minutes</p>

      {step === 'place' && (
        <form onSubmit={(e) => next(e, 'details')}>
          <label>Zone<ZoneSelect value={profile.zoneId} onChange={(zoneId) => patch({ zoneId })} /></label>
          <label>Adresse ou quartier
            <input required autoComplete="street-address" placeholder="Ex. rue, résidence, quartier…" value={profile.address} onChange={(e) => patch({ address: e.target.value })} />
          </label>
          <label>Configuration<KindSelect value={profile.kind} onChange={(kind) => patch({ kind })} /></label>
          <button type="submit" className="btn btn-gold btn-block">Continuer <ArrowRight size={18} aria-hidden="true" /></button>
        </form>
      )}

      {step === 'details' && (
        <form onSubmit={(e) => next(e, 'result')}>
          {profile.kind !== 'STUDIO' && (
            <label>Nombre de chambres<BedroomSelect value={profile.bedrooms} onChange={(bedrooms) => patch({ bedrooms })} /></label>
          )}
          <label>Standing du logement<StandingSelect value={profile.standing} onChange={(standing) => patch({ standing })} /></label>
          <button type="submit" className="btn btn-gold btn-block">Voir mon estimation <ArrowRight size={18} aria-hidden="true" /></button>
          <button type="button" className="estimator-link" onClick={() => setStep('place')}>Modifier mon bien</button>
        </form>
      )}

      {step === 'result' && (
        <div className="estimator-result" role="status">
          {estimate ? (
            <>
              <div className="result-label">Revenu mensuel brut estimé</div>
              <div className="result-range">{mad.format(estimate.monthlyLow)} – {mad.format(estimate.monthlyHigh)} <small>MAD</small></div>
              <p className="result-meta">
                {PROPERTY_KIND_LABELS[profile.kind]}{profile.kind !== 'STUDIO' ? ` · ${bedroomLabel(profile.bedrooms)}` : ''} · {zoneLabel(profile.zoneId)}
                <br />Soit {mad.format(estimate.nightlyLow)} – {mad.format(estimate.nightlyHigh)} MAD par nuit, pour un taux d’occupation de {Math.round(estimate.occupancyLow * 100)} % à {Math.round(estimate.occupancyHigh * 100)} %.
              </p>
            </>
          ) : (
            <>
              <div className="result-label">Zone à analyser</div>
              <p className="result-meta">Votre zone demande une analyse sur mesure : nous préparons une estimation personnalisée avec votre devis.</p>
            </>
          )}
          <p className="result-disclaimer">Estimation indicative et non contractuelle, avant frais et commission. Le devis l’affine selon votre bien.</p>
          {canContact && <a className="btn btn-gold btn-block" href="#devis">Obtenir mon devis <ArrowRight size={18} aria-hidden="true" /></a>}
          <button type="button" className="estimator-link" onClick={() => setStep('place')}>Refaire une estimation</button>
        </div>
      )}

      <p className="estimator-foot">Gratuit · Sans engagement</p>
    </div>
  );
}

function QuoteForm({ profile, setProfile }: { profile: Profile; setProfile: SetProfile }) {
  const [person, setPerson] = useState({ firstName: '', lastName: '', email: '', phone: '', message: '' });
  const [sent, setSent] = useState(false);
  const setP = (key: keyof typeof person) => (e: { target: { value: string } }) => setPerson((f) => ({ ...f, [key]: e.target.value }));
  const patch = (changes: Partial<Profile>) => setProfile((p) => ({ ...p, ...changes }));

  function submit(event: FormEvent) {
    event.preventDefault();
    window.location.href = buildQuoteMailto(CONTACT_EMAIL, {
      ...person,
      zone: zoneLabel(profile.zoneId),
      address: profile.address,
      propertyType: PROPERTY_KIND_LABELS[profile.kind],
      bedrooms: profile.kind === 'STUDIO' ? 'Studio' : bedroomLabel(profile.bedrooms),
      standing: STANDING_LABELS[profile.standing],
      estimate: estimateText(profile),
    });
    setSent(true);
  }

  return (
    <form className="estimate-form" onSubmit={submit}>
      <div className="form-row">
        <label>Prénom<input required autoComplete="given-name" value={person.firstName} onChange={setP('firstName')} /></label>
        <label>Nom<input required autoComplete="family-name" value={person.lastName} onChange={setP('lastName')} /></label>
      </div>
      <div className="form-row">
        <label>Email<input required type="email" autoComplete="email" value={person.email} onChange={setP('email')} /></label>
        <label>Téléphone<input required type="tel" autoComplete="tel" value={person.phone} onChange={setP('phone')} /></label>
      </div>
      <div className="form-row">
        <label>Zone<ZoneSelect value={profile.zoneId} onChange={(zoneId) => patch({ zoneId })} /></label>
        <label>Adresse ou quartier<input required value={profile.address} onChange={(e) => patch({ address: e.target.value })} /></label>
      </div>
      <div className="form-row">
        <label>Configuration<KindSelect value={profile.kind} onChange={(kind) => patch({ kind })} /></label>
        {profile.kind !== 'STUDIO' && (
          <label>Chambres<BedroomSelect value={profile.bedrooms} onChange={(bedrooms) => patch({ bedrooms })} /></label>
        )}
      </div>
      <label>Standing<StandingSelect value={profile.standing} onChange={(standing) => patch({ standing })} /></label>
      <label>Message (facultatif)<textarea rows={3} value={person.message} onChange={setP('message')} /></label>
      <button type="submit" className="btn btn-gold btn-lg">Demander mon devis <ArrowRight size={18} aria-hidden="true" /></button>
      <p className="form-note" role="status">
        {sent
          ? 'Votre application mail s’est ouverte avec votre demande. Envoyez le message pour la transmettre.'
          : 'Votre application mail s’ouvrira avec votre demande préremplie.'}
      </p>
    </form>
  );
}

export default function LandingPage() {
  const [profile, setProfile] = useState<Profile>(initialProfile);
  return (
    <div className="landing">
      <header className="nav">
        <Brand />
        <nav aria-label="Navigation principale">
          <a href="#services">Services</a>
          <a href="#methode">Méthode</a>
          <a href="#confiance">Pourquoi nous</a>
          <a href="#tarifs">Tarifs</a>
          <a href="#faq">FAQ</a>
          {canContact && <a href="#devis">Contact</a>}
        </nav>
        <div className="nav-actions">
          <ThemeToggle />
          {canContact && <a className="btn btn-primary btn-sm" href="#devis">Devis gratuit</a>}
        </div>
      </header>
      <main>
        <section className="hero">
          <div className="hero-inner">
            <div className="hero-copy">
              <div className="eyebrow">Gestion locative &amp; conciergerie</div>
              <h1>Votre bien, géré avec soin.<br /><span className="serif-em">Vos revenus, pilotés avec clarté.</span></h1>
              <p className="hero-lead">
                DarnaLux prend en charge la location courte durée de votre bien, de la mise en ligne au check-out, avec un suivi transparent à chaque étape.
              </p>
              <div className="hero-actions">
                <a className="btn btn-primary btn-lg" href={canContact ? '#devis' : '#services'}>
                  {canContact ? 'Demander un devis' : 'Découvrir nos services'} <ArrowRight size={18} aria-hidden="true" />
                </a>
                <a className="btn btn-ghost btn-lg" href="#methode">Notre méthode</a>
              </div>
              <div className="trust">Une conciergerie pensée pour les propriétaires exigeants</div>
            </div>
            <EstimatorCard profile={profile} setProfile={setProfile} />
          </div>
        </section>

        <div className="stats-band">
          <section className="stats" aria-label="Chiffres clés">
            {stats.map(([n, l]) => <div key={l}><strong>{n}</strong><span>{l}</span></div>)}
          </section>
        </div>

        <section id="proprietaires" className="section">
          <div className="split">
            <div>
              <div className="eyebrow">Pour les propriétaires</div>
              <h2>Un service pensé pour ceux qui veulent<br /><span className="serif-em">aller plus loin.</span></h2>
              <ul className="check-list">
                {audience.map((a) => (
                  <li key={a}><span className="check"><Check size={14} aria-hidden="true" /></span>{a}</li>
                ))}
              </ul>
              <p className="lead-note">Notre rôle : être le partenaire de confiance qui s’occupe de tout, pour que votre bien travaille vraiment pour vous.</p>
            </div>
            <div className="split-media" role="img" aria-label="Vue de Rabat" />
          </div>
        </section>

        <section id="services" className="section section-tight">
          <div className="section-head">
            <div>
              <div className="eyebrow">Nos services</div>
              <h2>Une prise en charge complète,<br /><span className="serif-em">de A à Z.</span></h2>
            </div>
            <p>Du premier audit au suivi mensuel, une seule équipe coordonne l’ensemble de la vie de votre bien.</p>
          </div>
          <div className="pillars">
            {pillars.map(({ icon: Icon, title, items }, i) => (
              <article className="feature pillar" key={title}>
                <span className="feature-num">0{i + 1}</span>
                <span className="feature-icon"><Icon size={22} aria-hidden="true" /></span>
                <h3>{title}</h3>
                <ul>
                  {items.map((it) => <li key={it}>{it}</li>)}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section id="methode" className="workflow">
          <div className="workflow-panel">
            <div className="eyebrow eyebrow-light">Notre méthode de travail</div>
            <h2>Un processus clair,<br /><span className="serif-em">structuré et évolutif.</span></h2>
            <div className="steps method-steps">
              {method.map(([n, title, detail]) => (
                <div className="step" key={n}><b>{n}</b><span>{title}</span><small>{detail}</small></div>
              ))}
            </div>
          </div>
        </section>

        <section id="confiance" className="section">
          <div className="section-head">
            <div>
              <div className="eyebrow">Pourquoi nous faire confiance</div>
              <h2>Ce qui fait la différence<br /><span className="serif-em">DarnaLux.</span></h2>
            </div>
            <p>Une approche de conseil plutôt que de volume, avec une exigence constante de clarté.</p>
          </div>
          <div className="features">
            {reasons.map(({ icon: Icon, title, text }) => (
              <article className="feature" key={title}>
                <span className="feature-icon"><Icon size={22} aria-hidden="true" /></span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="plateforme" className="section section-tight">
          <div className="section-head">
            <div>
              <div className="eyebrow">Transparence au quotidien</div>
              <h2>Un suivi que vous pouvez<br /><span className="serif-em">consulter à tout moment.</span></h2>
            </div>
            <p>Notre plateforme relie le terrain aux chiffres : vous savez ce qui se passe dans votre bien, et ce qu’il rapporte.</p>
          </div>
          <div className="features features-4">
            {platform.map(({ icon: Icon, title, text }) => (
              <article className="feature" key={title}>
                <span className="feature-icon"><Icon size={22} aria-hidden="true" /></span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="tarifs" className="pricing">
          <div className="pricing-inner">
            <div>
              <div className="eyebrow eyebrow-light">Nos tarifs</div>
              <h2>Une tarification claire,<br /><span className="serif-em">présentée dès le premier échange.</span></h2>
              <p>Pas de surprise : les conditions sont expliquées avant tout engagement, adaptées à votre bien et à l’accompagnement choisi.</p>
            </div>
            <ul className="pricing-list">
              {pricing.map((p) => (
                <li key={p}><span className="check"><Check size={14} aria-hidden="true" /></span>{p}</li>
              ))}
              {canContact && (
                <li className="pricing-cta"><a className="btn btn-gold" href="#devis">Demander un devis <Tag size={16} aria-hidden="true" /></a></li>
              )}
            </ul>
          </div>
        </section>

        <section id="faq" className="section">
          <div className="section-head">
            <div>
              <div className="eyebrow">Questions fréquentes</div>
              <h2>Ce que les propriétaires<br /><span className="serif-em">nous demandent.</span></h2>
            </div>
          </div>
          <div className="faq">
            {faqs.map(([q, a]) => (
              <details key={q}>
                <summary>{q}<ChevronDown size={18} aria-hidden="true" /></summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>

        {canContact && (
          <section id="devis" className="closing contact">
            <div className="contact-inner">
              <div className="contact-copy">
                <div className="eyebrow eyebrow-light">Votre devis</div>
                <h2>Recevez votre devis<br /><span className="serif-em">personnalisé.</span></h2>
                <div className="rule" />
                <p>Confirmez les informations de votre bien. Nous revenons vers vous avec un devis adapté, sans engagement.</p>
                <ul className="contact-lines">
                  <li><Mail size={16} aria-hidden="true" /><a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></li>
                  {CONTACT_PHONE && <li><Phone size={16} aria-hidden="true" /><a href={`tel:${CONTACT_PHONE.replace(/\s+/g, '')}`}>{CONTACT_PHONE}</a></li>}
                </ul>
              </div>
              <QuoteForm profile={profile} setProfile={setProfile} />
            </div>
          </section>
        )}
      </main>
      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-top">
            <div>
              <Brand />
              <p className="footer-tag">Votre maison, notre signature</p>
            </div>
            <nav className="footer-links" aria-label="Pied de page">
              <a href="#services">Services</a>
              <a href="#methode">Méthode</a>
              <a href="#tarifs">Tarifs</a>
              <a href="#faq">FAQ</a>
              {canContact && <a href="#devis">Contact</a>}
            </nav>
          </div>
          <div className="footer-bottom">
            <span>© 2026 DarnaLux Concierge · Tous droits réservés</span>
            <span>Conciergerie · Hospitality · Operations</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
