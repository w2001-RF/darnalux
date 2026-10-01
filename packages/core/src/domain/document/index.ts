import type { Tone } from '../common/validation';

export type DocumentCategory = 'CONTRACT' | 'OWNER' | 'PROPERTY' | 'GUEST' | 'INVOICE' | 'REPORT' | 'OTHER';

export const DOCUMENT_CATEGORIES: readonly DocumentCategory[] = ['CONTRACT', 'OWNER', 'PROPERTY', 'GUEST', 'INVOICE', 'REPORT', 'OTHER'];

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  CONTRACT: 'Contrat',
  OWNER: 'Document propriétaire',
  PROPERTY: 'Document logement',
  GUEST: 'Document voyageur',
  INVOICE: 'Facture',
  REPORT: 'Rapport',
  OTHER: 'Autre',
};

export const DOCUMENT_CATEGORY_TONES: Record<DocumentCategory, Tone> = {
  CONTRACT: 'gold',
  OWNER: 'info',
  PROPERTY: 'info',
  GUEST: 'warning',
  INVOICE: 'success',
  REPORT: 'neutral',
  OTHER: 'neutral',
};

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const DOCUMENT_MIME_TYPES: readonly string[] = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

export const IMAGE_MIME_TYPES: readonly string[] = ['image/jpeg', 'image/png', 'image/webp'];

export function validateUpload(
  file: { type: string; size: number },
  allowed: readonly string[] = DOCUMENT_MIME_TYPES,
): string | null {
  if (file.size <= 0) return 'Le fichier est vide.';
  if (file.size > MAX_UPLOAD_BYTES) return 'Le fichier dépasse 10 Mo.';
  if (!allowed.includes(file.type)) return 'Format de fichier non autorisé.';
  return null;
}

// Storage object names are built from a sanitized file name so user input
// cannot inject path segments ("../") or unexpected characters.
export function sanitizeFileName(name: string): string {
  const cleaned = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/\.{2,}/g, '.')
    .replace(/-{2,}/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '');
  return (cleaned || 'fichier').slice(-100);
}

export function buildStoragePath(segments: readonly string[], fileName: string, uniqueId: string): string {
  const safeSegments = segments.map((segment) => sanitizeFileName(segment));
  return [...safeSegments, `${sanitizeFileName(uniqueId)}-${sanitizeFileName(fileName)}`].join('/');
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`;
}
