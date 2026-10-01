import type { SupportCategory, SupportPriority, SupportStatus, SupportTicketInput } from '@darnalux/core';
import { supabase } from '../../lib/supabaseClient';
import { unwrap } from '../../lib/errors';

export interface TicketRow {
  id: string;
  created_by: string;
  subject: string;
  category: SupportCategory;
  priority: SupportPriority;
  status: SupportStatus;
  last_message_at: string;
  created_at: string;
}

export interface MessageRow {
  id: string;
  ticket_id: string;
  author_id: string;
  body: string;
  created_at: string;
}

export async function listTickets(status = ''): Promise<(TicketRow & { support_messages: { body: string; created_at: string }[] })[]> {
  let query = supabase
    .from('support_tickets')
    .select('*, support_messages(body, created_at)')
    .order('last_message_at', { ascending: false })
    .order('created_at', { referencedTable: 'support_messages', ascending: false })
    .limit(1, { referencedTable: 'support_messages' });
  if (status) query = query.eq('status', status);
  return unwrap(await query.returns<(TicketRow & { support_messages: { body: string; created_at: string }[] })[]>()) ?? [];
}

export async function getTicket(id: string): Promise<TicketRow> {
  return unwrap(await supabase.from('support_tickets').select('*').eq('id', id).single<TicketRow>());
}

export async function listMessages(ticketId: string): Promise<MessageRow[]> {
  return (
    unwrap(
      await supabase.from('support_messages').select('*').eq('ticket_id', ticketId).order('created_at').returns<MessageRow[]>(),
    ) ?? []
  );
}

export async function createTicket(input: SupportTicketInput, userId: string): Promise<string> {
  const ticket = unwrap(
    await supabase
      .from('support_tickets')
      .insert({ subject: input.subject.trim(), category: input.category, priority: input.priority, created_by: userId })
      .select('id')
      .single<{ id: string }>(),
  );
  await sendMessage(ticket.id, input.message, userId);
  return ticket.id;
}

export async function sendMessage(ticketId: string, body: string, userId: string): Promise<void> {
  unwrap(await supabase.from('support_messages').insert({ ticket_id: ticketId, body: body.trim(), author_id: userId }));
}

export async function setTicketStatus(id: string, status: SupportStatus): Promise<void> {
  unwrap(await supabase.from('support_tickets').update({ status }).eq('id', id));
}
