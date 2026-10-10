// Public contact details (build-time, safe for the browser). Empty values hide the contact UI.
export const CONTACT_EMAIL: string = (import.meta.env.VITE_CONTACT_EMAIL ?? '').trim();
export const CONTACT_PHONE: string = (import.meta.env.VITE_CONTACT_PHONE ?? '').trim();

export interface QuoteRequest {
  name: string;
  email: string;
  phone: string;
  slot: string;
  zone: string;
  address: string;
  config: string;
  situation: string;
  support: string;
  /** Human-readable indicative estimate shown to the visitor, if any. */
  estimate: string;
}

export function buildQuoteMailto(to: string, r: QuoteRequest): string {
  const lines = [
    'Demande de devis',
    '',
    `Nom : ${r.name}`,
    `Email : ${r.email}`,
    `Téléphone : ${r.phone}`,
    `Créneau souhaité : ${r.slot || 'non précisé'}`,
    '',
    `Zone : ${r.zone}`,
    `Adresse : ${r.address}`,
    `Configuration : ${r.config}`,
    `Situation actuelle : ${r.situation}`,
    `Accompagnement recherché : ${r.support}`,
  ];
  if (r.estimate) lines.push('', `Estimation indicative affichée : ${r.estimate}`);
  const subject = encodeURIComponent(`Demande de devis — ${r.name}`);
  return `mailto:${to}?subject=${subject}&body=${encodeURIComponent(lines.join('\n'))}`;
}
