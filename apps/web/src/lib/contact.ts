// Optional public contact details shown on the landing page (build-time, safe for the browser).
export const CONTACT_EMAIL: string = (import.meta.env.VITE_CONTACT_EMAIL ?? '').trim();
export const CONTACT_PHONE: string = (import.meta.env.VITE_CONTACT_PHONE ?? '').trim();

// Number used by the floating WhatsApp button (falls back to the contact phone).
export const WHATSAPP_NUMBER: string = (import.meta.env.VITE_WHATSAPP_NUMBER ?? '').trim() || CONTACT_PHONE;
