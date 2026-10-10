import type { CsvCell } from '@darnalux/core';
import { toCsv } from '@darnalux/core';
import type { Bucket } from '@darnalux/data/storage';
import { signedUrl } from '@darnalux/data/storage';
import { supabase } from './supabaseClient';

export type { Bucket } from '@darnalux/data/storage';
export { removeFromBucket, signedUrl, signedUrls } from '@darnalux/data/storage';

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

export async function openSignedFile(bucket: Bucket, path: string): Promise<void> {
  const url = await signedUrl(bucket, path, 120);
  window.open(url, '_blank', 'noopener,noreferrer');
}
