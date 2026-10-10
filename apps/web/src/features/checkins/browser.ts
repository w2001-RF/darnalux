import { supabase } from '../../lib/supabaseClient';

// `href` comes from react-router's useHref so the link keeps the deployment base path.
export function absoluteUrl(href: string): string {
  return new URL(href, window.location.origin).toString();
}

export async function uploadGuestFile(token: string, kind: 'document' | 'selfie' | 'signature', file: Blob, extension: string): Promise<string> {
  const path = `${token}/${kind}-${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from('guest-documents').upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  return path;
}
