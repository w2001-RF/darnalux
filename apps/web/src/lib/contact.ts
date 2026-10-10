// Public contact details (build-time, safe for the browser). Empty values hide the contact UI.
export const CONTACT_EMAIL: string = (import.meta.env.VITE_CONTACT_EMAIL ?? '').trim();
export const CONTACT_PHONE: string = (import.meta.env.VITE_CONTACT_PHONE ?? '').trim();

export interface QuoteRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  zone: string;
  address: string;
  propertyType: string;
  bedrooms: string;
  standing: string;
  /** Human-readable estimate shown to the visitor, if any. */
  estimate: string;
  message: string;
}

export function buildQuoteMailto(to: string, r: QuoteRequest): string {
  const lines = [
    'Demande de devis',
    '',
    `Nom : ${r.firstName} ${r.lastName}`,
    `Email : ${r.email}`,
    `Téléphone : ${r.phone}`,
    '',
    `Zone : ${r.zone}`,
    `Adresse : ${r.address || 'non précisée'}`,
    `Type de bien : ${r.propertyType}`,
    `Chambres : ${r.bedrooms}`,
    `Standing : ${r.standing}`,
  ];
  if (r.estimate) lines.push('', `Estimation indicative affichée : ${r.estimate}`);
  if (r.message) lines.push('', 'Message :', r.message);
  const subject = encodeURIComponent(`Demande de devis — ${r.firstName} ${r.lastName}`);
  return `mailto:${to}?subject=${subject}&body=${encodeURIComponent(lines.join('\n'))}`;
}
