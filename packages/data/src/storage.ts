import { supabase } from './client';

export type Bucket = 'documents' | 'property-images' | 'guest-documents';

// Private buckets only: files are served through short-lived signed URLs.
export async function signedUrl(bucket: Bucket, path: string, expiresInSeconds = 300): Promise<string> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
  if (error || !data) throw error ?? new Error('signed url');
  return data.signedUrl;
}

export async function signedUrls(bucket: Bucket, paths: string[], expiresInSeconds = 300): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data, error } = await supabase.storage.from(bucket).createSignedUrls(paths, expiresInSeconds);
  if (error) throw error;
  const result: Record<string, string> = {};
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) result[item.path] = item.signedUrl;
  }
  return result;
}

export async function removeFromBucket(bucket: Bucket, paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from(bucket).remove(paths);
  if (error) throw error;
}
