import type { LeadKind, LeadStatus, ReplyTemplateInput } from '@darnalux/core';
import { supabase } from './client';
import { unwrap } from './errors';

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

// --- Staff side (RLS: marketing.view to read, marketing.manage to change) ---

export interface LeadRow {
  id: string;
  kind: LeadKind;
  status: LeadStatus;
  full_name: string;
  email: string;
  phone: string | null;
  message: string | null;
  zone_label: string | null;
  address: string | null;
  config_label: string | null;
  situation: string | null;
  support: string | null;
  preferred_slot: string | null;
  estimate_low: number | null;
  estimate_high: number | null;
  notes: string | null;
  last_reply_channel: 'EMAIL' | 'WHATSAPP' | null;
  last_reply_at: string | null;
  created_at: string;
}

export interface ReplyTemplateRow {
  id: string;
  name: string;
  applies_to: 'ALL' | LeadKind;
  subject: string;
  body: string;
}

const LEAD_COLUMNS =
  'id, kind, status, full_name, email, phone, message, zone_label, address, config_label, situation, support, preferred_slot, estimate_low, estimate_high, notes, last_reply_channel, last_reply_at, created_at';

export async function listLeads(): Promise<LeadRow[]> {
  return (
    unwrap(await supabase.from('contact_requests').select(LEAD_COLUMNS).order('created_at', { ascending: false }).limit(500).returns<LeadRow[]>()) ?? []
  );
}

export async function getLead(id: string): Promise<LeadRow> {
  return unwrap(await supabase.from('contact_requests').select(LEAD_COLUMNS).eq('id', id).single<LeadRow>());
}

export async function updateLead(
  id: string,
  changes: Partial<Pick<LeadRow, 'status' | 'notes' | 'last_reply_channel' | 'last_reply_at'>>,
): Promise<void> {
  const { error } = await supabase.from('contact_requests').update(changes).eq('id', id);
  if (error) throw error;
}

export async function listReplyTemplates(): Promise<ReplyTemplateRow[]> {
  return (
    unwrap(
      await supabase.from('reply_templates').select('id, name, applies_to, subject, body').order('name').returns<ReplyTemplateRow[]>(),
    ) ?? []
  );
}

export async function saveReplyTemplate(input: ReplyTemplateInput, userId: string, id?: string): Promise<void> {
  const { error } = id
    ? await supabase.from('reply_templates').update(input).eq('id', id)
    : await supabase.from('reply_templates').insert({ ...input, created_by: userId });
  if (error) throw error;
}

export async function deleteReplyTemplate(id: string): Promise<void> {
  const { error } = await supabase.from('reply_templates').delete().eq('id', id);
  if (error) throw error;
}
