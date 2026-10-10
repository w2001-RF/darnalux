import type { SupabaseClient } from '@supabase/supabase-js';

let configured: SupabaseClient | null = null;

/** Each app (Web, Mobile) calls this once with its own browser/native Supabase client. */
export function configureData(client: SupabaseClient): void {
  configured = client;
}

// Forwards every access to the configured client, so the data modules stay
// platform-independent and never create a client (or read secrets) themselves.
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, property) {
    if (!configured) throw new Error('@darnalux/data: call configureData(supabase) before using the data layer.');
    const value: unknown = Reflect.get(configured, property, configured);
    return typeof value === 'function' ? value.bind(configured) : value;
  },
});
