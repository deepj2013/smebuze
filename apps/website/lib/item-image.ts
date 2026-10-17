import { apiUploadFile, getStaticUrl } from '@/lib/api';

/** Resolve stored item image path (relative /uploads/... or data URL) for <img src>. */
export function itemImageSrc(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) {
    return url;
  }
  return getStaticUrl(url);
}

/** Shrink phone photos before upload so create-item does not blow the API body limit. */
export async function compressImageFile(file: File, maxEdge = 1200, quality = 0.82): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob: Blob | null = await new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/jpeg', quality);
    });
    if (!blob) return file;
    const name = file.name.replace(/\.[^.]+$/, '') || 'item';
    return new File([blob], `${name}.jpg`, { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

/** Upload one product picture; returns a stable /uploads/items/... URL. */
export async function uploadItemImage(file: File): Promise<{ url?: string; error?: string }> {
  const compressed = await compressImageFile(file);
  const res = await apiUploadFile<{ url: string }>('inventory/items/upload-image', compressed);
  if (res.error) return { error: res.error };
  if (!res.data?.url) return { error: 'Upload failed. Try a smaller picture.' };
  return { url: res.data.url };
}
