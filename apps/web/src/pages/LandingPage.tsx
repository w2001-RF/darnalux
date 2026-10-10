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
  MessageCircle,
  MapPin,
  Search,
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
import { ESTIMATE_ZONES, PROPERTY_CONFIGS, estimateRevenue } from '@darnalux/core';
import { buildWhatsappUrl } from '@darnalux/core';
import { CONTACT_EMAIL, CONTACT_PHONE, WHATSAPP_NUMBER } from '../lib/contact';
import { submitContactRequest } from '../features/leads/api';
import { toUserMessage } from '../lib/errors';
import '../landing.css';

const WHATSAPP_URL = buildWhatsappUrl(WHATSAPP_NUMBER, 'Bonjour DarnaLux, je souhaite des informations sur la gestion de mon bien.');

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
  configId: string;
}

type SetProfile = (update: (p: Profile) => Profile) => void;

const initialProfile: Profile = { zoneId: '', address: '', configId: '' };

const SITUATIONS = ['Déjà en location courte durée', 'Location longue durée', 'Vacant ou non utilisé', 'Usage personnel', 'À confirmer'];
const SUPPORTS = ['Gestion essentielle', 'Gestion complète', 'Je souhaite être conseillé'];

const mad = new Intl.NumberFormat('fr-FR');
const zoneLabel = (id: string) => ESTIMATE_ZONES.find((z) => z.id === id)?.label ?? '';
const configLabel = (id: string) => PROPERTY_CONFIGS.find((c) => c.id === id)?.label ?? '';

type Step = 'place' | 'analysis' | 'done';

const initialDetails = { situation: 'À confirmer', support: 'Je souhaite être conseillé', name: '', email: '', phone: '', slot: '', consent: false };

function EstimatorCard({ profile, setProfile }: { profile: Profile; setProfile: SetProfile }) {
  const [step, setStep] = useState<Step>('place');
  const [details, setDetails] = useState(initialDetails);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const patch = (changes: Partial<Profile>) => setProfile((p) => ({ ...p, ...changes }));
  const setD = (key: 'situation' | 'support' | 'name' | 'email' | 'phone' | 'slot') => (e: { target: { value: string } }) =>
    setDetails((d) => ({ ...d, [key]: e.target.value }));
  const stepIndex = step === 'place' ? 1 : 2;
  const estimate = estimateRevenue({ zoneId: profile.zoneId, configId: profile.configId });
  const zone = zoneLabel(profile.zoneId);

  function toAnalysis(event: FormEvent) {
    event.preventDefault();
    setStep('analysis');
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSending(true);
    setError('');
    try {
      await submitContactRequest({
        kind: 'QUOTE',
        full_name: details.name,
        email: details.email,
        phone: details.phone,
        zone_id: profile.zoneId,
        zone_label: zone,
        address: profile.address,
        config_id: profile.configId,
        config_label: configLabel(profile.configId),
        situation: details.situation,
        support: details.support,
        preferred_slot: details.slot,
        estimate_low: estimate?.monthlyLow ?? null,
        estimate_high: estimate?.monthlyHigh ?? null,
        consent: details.consent,
      });
      setStep('done');
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setSending(false);
    }
  }

  return (
    <div id="estimateur" className="hero-card estimator" aria-labelledby="estimator-title">
      {step === 'analysis' && (
        <ol className="stepper" aria-label={`Étape ${stepIndex} sur 2`}>
          <li className={stepIndex === 1 ? 'active' : 'done'}><b>1</b><span>Votre bien</span></li>
          <li className={stepIndex === 2 ? 'active' : ''}><b>2</b><span>Votre analyse</span></li>
        </ol>
      )}

      {step === 'place' && (
        <>
          <h2 id="estimator-title">Combien pourriez-vous gagner ?</h2>
          <p className="estimator-sub">Estimation gratuite en moins de 2 minutes</p>
          <form onSubmit={toAnalysis}>
            <label>Zone
              <select required value={profile.zoneId} onChange={(e) => patch({ zoneId: e.target.value })}>
                <option value="" disabled>Sélectionnez une zone</option>
                {ESTIMATE_ZONES.map((z) => <option key={z.id} value={z.id}>{z.label}</option>)}
              </select>
            </label>
            <label>Adresse ou quartier
              <span className="input-icon"><Search size={16} aria-hidden="true" /><input required autoComplete="street-address" placeholder="Tapez votre adresse ou quartier…" value={profile.address} onChange={(e) => patch({ address: e.target.value })} /></span>
            </label>
            <label>Configuration
              <select required value={profile.configId} onChange={(e) => patch({ configId: e.target.value })}>
                <option value="" disabled>Studio, appartement ou villa</option>
                {PROPERTY_CONFIGS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </label>
            <button type="submit" className="btn btn-gold btn-block">Voir mon estimation <ArrowRight size={18} aria-hidden="true" /></button>
          </form>
        </>
      )}

      {step === 'analysis' && (
        <>
          <div className="analysis" role="status">
            <div className="analysis-tag"><LineChart size={16} aria-hidden="true" /> Première lecture</div>
            {estimate ? (
              <>
                <h2 id="estimator-title">Analyse locale disponible à {zone}</h2>
                <div className="result-range">{mad.format(estimate.monthlyLow)} – {mad.format(estimate.monthlyHigh)} <small>MAD / mois</small></div>
                <p className="result-meta">
                  {configLabel(profile.configId)} · {profile.address}
                  <br />Revenu brut indicatif : {mad.format(estimate.nightlyLow)} – {mad.format(estimate.nightlyHigh)} MAD par nuit, pour une occupation de {Math.round(estimate.occupancyLow * 100)} % à {Math.round(estimate.occupancyHigh * 100)} %.
                </p>
              </>
            ) : (
              <>
                <h2 id="estimator-title">Analyse à confirmer{zone ? ` · ${zone}` : ''}</h2>
                <p className="result-meta">
                  {configLabel(profile.configId)} · {profile.address}. Pour éviter une promesse artificielle, la fourchette de revenus sera validée par notre équipe avec les caractéristiques réelles du bien.
                </p>
              </>
            )}
            <ul className="analysis-list">
              <li>Revenu brut potentiel</li>
              <li>Prix de départ conseillé</li>
              <li>Actions à prévoir avant la mise en ligne</li>
            </ul>
            <p className="result-disclaimer">Estimation indicative et non contractuelle, avant frais et commission.</p>
          </div>

          <form onSubmit={submit}>
              <div className="est-row">
                <label>Situation actuelle
                  <select value={details.situation} onChange={setD('situation')}>
                    {SITUATIONS.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </label>
                <label>Accompagnement recherché
                  <select value={details.support} onChange={setD('support')}>
                    {SUPPORTS.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </label>
              </div>
              <label>Prénom et nom<input required autoComplete="name" value={details.name} onChange={setD('name')} /></label>
              <div className="est-row">
                <label>Email<input required type="email" autoComplete="email" value={details.email} onChange={setD('email')} /></label>
                <label>Téléphone<input required type="tel" autoComplete="tel" value={details.phone} onChange={setD('phone')} /></label>
              </div>
              <label>Créneau souhaité<input placeholder="Ex. mardi matin" value={details.slot} onChange={setD('slot')} /></label>
              <label className="consent">
                <input type="checkbox" required checked={details.consent} onChange={(e) => setDetails((d) => ({ ...d, consent: e.target.checked }))} />
                <span>J’accepte que mes informations soient utilisées pour répondre à ma demande de devis.</span>
              </label>
              {error && <p className="form-error" role="alert">{error}</p>}
              <button type="submit" className="btn btn-gold btn-block" disabled={sending}>
                {sending ? 'Envoi en cours…' : 'Recevoir mon devis'} <ArrowRight size={18} aria-hidden="true" />
              </button>
              <button type="button" className="estimator-link" onClick={() => setStep('place')}>Modifier mon bien</button>
            </form>
        </>
      )}

      {step === 'done' && (
        <div className="analysis done" role="status">
          <div className="analysis-tag"><Check size={16} aria-hidden="true" /> Demande reçue</div>
          <h2 id="estimator-title">Votre demande est bien enregistrée.</h2>
          <p className="result-meta">
            Notre équipe vérifie votre bien, son quartier et les logements comparables, puis revient vers vous avec un devis adapté.
          </p>
          <a className="estimator-link" href="#methode">Découvrir notre méthode</a>
          <button type="button" className="estimator-link" onClick={() => { setStep('place'); setDetails(initialDetails); }}>Faire une autre estimation</button>
        </div>
      )}

      <p className="estimator-foot">Gratuit · Sans engagement</p>
    </div>
  );
}

function ContactForm() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '', consent: false });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState('');
  const set = (key: 'name' | 'email' | 'phone' | 'message') => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setStatus('sending');
    setError('');
    try {
      await submitContactRequest({
        kind: 'CONTACT',
        full_name: form.name,
        email: form.email,
        phone: form.phone,
        message: form.message,
        consent: form.consent,
      });
      setStatus('sent');
    } catch (e) {
      setError(toUserMessage(e));
      setStatus('idle');
    }
  }

  if (status === 'sent') {
    return (
      <div className="contact-form contact-sent" role="status">
        <span className="check"><Check size={14} aria-hidden="true" /></span>
        <h3>Message envoyé</h3>
        <p>Merci, nous revenons vers vous très vite.</p>
        <button type="button" className="estimator-link" onClick={() => { setForm({ name: '', email: '', phone: '', message: '', consent: false }); setStatus('idle'); }}>Envoyer un autre message</button>
      </div>
    );
  }

  return (
    <form className="contact-form" onSubmit={submit}>
      <label>Prénom et nom<input required autoComplete="name" value={form.name} onChange={set('name')} /></label>
      <div className="est-row">
        <label>Email<input required type="email" autoComplete="email" value={form.email} onChange={set('email')} /></label>
        <label>Téléphone (facultatif)<input type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} /></label>
      </div>
      <label>Votre message<textarea required rows={4} maxLength={2000} value={form.message} onChange={set('message')} /></label>
      <label className="consent">
        <input type="checkbox" required checked={form.consent} onChange={(e) => setForm((f) => ({ ...f, consent: e.target.checked }))} />
        <span>J’accepte que mes informations soient utilisées pour répondre à ma demande.</span>
      </label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button type="submit" className="btn btn-gold btn-block" disabled={status === 'sending'}>
        {status === 'sending' ? 'Envoi en cours…' : 'Nous contacter'} <ArrowRight size={18} aria-hidden="true" />
      </button>
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
          <a href="#contact">Contact</a>
        </nav>
        <div className="nav-actions">
          <ThemeToggle />
          <a className="btn btn-primary btn-sm" href="#estimateur">Estimer mes revenus</a>
        </div>
      </header>
      <main>
        <section className="hero">
          <div className="hero-inner">
            <div className="hero-copy">
              <div className="eyebrow">Acquisition propriétaires</div>
              <h1>Faites rapporter<br /><span className="serif-em">davantage</span> à votre bien<br />au Maroc</h1>
              <p className="hero-lead">
                Gestion Airbnb et location courte durée professionnelle : nous nous occupons de tout, vous encaissez les revenus.
              </p>
              <div className="hero-note">Estimation gratuite · Sans engagement · Conciergerie DarnaLux</div>
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
              <li className="pricing-cta"><a className="btn btn-gold" href="#estimateur">Demander un devis <Tag size={16} aria-hidden="true" /></a></li>
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

        <section id="contact" className="closing contact">
          <div className="contact-inner">
            <div className="contact-copy">
              <div className="eyebrow eyebrow-light">Nous contacter</div>
              <h2>Parlons de votre projet,<br /><span className="serif-em">simplement.</span></h2>
              <div className="rule" />
              <p>Une question, un projet, un bien à confier ? Écrivez-nous : nous revenons vers vous rapidement, sans engagement.</p>
              {(CONTACT_EMAIL || CONTACT_PHONE) && (
                <ul className="contact-lines">
                  {CONTACT_EMAIL && <li><Mail size={16} aria-hidden="true" /><a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></li>}
                  {CONTACT_PHONE && <li><Phone size={16} aria-hidden="true" /><a href={`tel:${CONTACT_PHONE.replace(/\s+/g, '')}`}>{CONTACT_PHONE}</a></li>}
                </ul>
              )}
              <a className="btn btn-ghost" href="#estimateur">Faire mon estimation <ArrowRight size={18} aria-hidden="true" /></a>
            </div>
            <ContactForm />
          </div>
        </section>
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
              <a href="#contact">Contact</a>
            </nav>
          </div>
          <div className="footer-bottom">
            <span>© 2026 DarnaLux Concierge · Tous droits réservés</span>
            <span>Conciergerie · Hospitality · Operations</span>
          </div>
        </div>
      </footer>
      {WHATSAPP_URL && (
        <a className="whatsapp-fab" href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" aria-label="Nous contacter sur WhatsApp">
          <MessageCircle size={26} aria-hidden="true" />
          <span>WhatsApp</span>
        </a>
      )}
    </div>
  );
}
