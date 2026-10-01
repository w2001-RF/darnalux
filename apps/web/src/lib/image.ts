// Downscales a photo to at most `maxSide` pixels and re-encodes it as JPEG so
// phone pictures fit the 10 MB storage limit and upload quickly. PDFs and
// non-image files are returned untouched.
export async function compressImage(file: File, maxSide = 1800, quality = 0.85): Promise<Blob> {
  if (!file.type.startsWith('image/')) return file;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext('2d');
  if (!context) return file;
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  return blob ?? file;
}

export function extensionFor(blob: Blob): string {
  if (blob.type === 'application/pdf') return 'pdf';
  if (blob.type === 'image/png') return 'png';
  if (blob.type === 'image/webp') return 'webp';
  return 'jpg';
}
