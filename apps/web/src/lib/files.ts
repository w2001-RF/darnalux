import type { CsvCell } from '@darnalux/core';
import { toCsv } from '@darnalux/core';
import { supabase } from './supabaseClient';

export type Bucket = 'documents' | 'property-images' | 'guest-documents';

export function downloadBlob(fileName: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadCsv(fileName: string, rows: readonly (readonly CsvCell[])[]): void {
  downloadBlob(fileName, new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' }));
}

export function newId(): string {
  return crypto.randomUUID();
}

export async function uploadToBucket(bucket: Bucket, path: string, file: Blob, contentType?: string): Promise<string> {
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: false,
    contentType: contentType ?? (file.type || 'application/octet-stream'),
  });
  if (error) throw error;
  return path;
}

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

export async function openSignedFile(bucket: Bucket, path: string): Promise<void> {
  const url = await signedUrl(bucket, path, 120);
  window.open(url, '_blank', 'noopener,noreferrer');
}
