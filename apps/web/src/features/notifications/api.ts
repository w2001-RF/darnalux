import { supabase } from '../../lib/supabaseClient';
import { unwrap } from '../../lib/errors';

export interface NotificationRow {
  id: string;
  recipient_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export async function listNotifications(limit = 100): Promise<NotificationRow[]> {
  return (
    unwrap(
      await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(limit).returns<NotificationRow[]>(),
    ) ?? []
  );
}

export async function countUnread(): Promise<number> {
  const { count, error } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).is('read_at', null);
  if (error) throw error;
  return count ?? 0;
}

export async function markRead(id: string): Promise<void> {
  unwrap(await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id));
}

export async function markAllRead(): Promise<void> {
  unwrap(await supabase.from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null));
}

// Live unread updates through Supabase Realtime (RLS limits rows to the recipient).
export function subscribeToNotifications(userId: string, onChange: () => void): () => void {
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${userId}` }, onChange)
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}
