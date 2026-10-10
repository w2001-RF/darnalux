import { supabase } from '../../lib/supabaseClient';

export interface QuoteRequestInput {
  kind: 'QUOTE';
  full_name: string;
  email: string;
  phone: string;
  zone_id: string;
  zone_label: string;
  address: string;
  config_id: string;
  config_label: string;
  situation: string;
  support: string;
  preferred_slot: string;
  estimate_low: number | null;
  estimate_high: number | null;
  consent: boolean;
}

export interface ContactMessageInput {
  kind: 'CONTACT';
  full_name: string;
  email: string;
  phone: string;
  message: string;
  consent: boolean;
}

/** Saves a landing-page request through the public RPC (the only anon write path). */
export async function submitContactRequest(input: QuoteRequestInput | ContactMessageInput): Promise<string> {
  const { data, error } = await supabase.rpc('submit_contact_request', { p: input });
  if (error) throw error;
  return String(data);
}
