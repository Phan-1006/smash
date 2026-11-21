import type { User } from 'firebase/auth';
import { apiUrl, parseJsonSafe } from './api';

export interface UploadedImageItem {
  url: string;
  name: string;
}

const MAX_CLIENT_DIMENSION = 1600;

export function isValidImageLink(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 1000) return false;
  return /^(https?:\/\/|\/)/i.test(trimmed);
}

export function sanitizeImageUrl(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim().slice(0, 1000);
  return isValidImageLink(trimmed) ? trimmed : fallback;
}

function getUniqueEndpoints(path: string): { endpoint: string; originBase: string }[] {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const configured = apiUrl(normalized);
  const candidates: { endpoint: string; originBase: string }[] = [];

  // Prefer same-origin Express endpoint first so local/AI Studio uploads always hit server.ts
  candidates.push({ endpoint: normalized, originBase: '' });

  if (configured !== normalized) {
    let originBase = '';
    try {
      originBase = new URL(configured).origin;
    } catch {
      originBase = '';
    }
    candidates.push({ endpoint: configured, originBase });
  }

  return candidates;
}

async function prepareImageForUpload(
  file: File
): Promise<{ mimeType: string; dataBase64: string }> {
  const validMimes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!validMimes.includes(file.type)) {
    throw new Error('Format accepté : JPG, PNG ou WebP uniquement.');
  }

  // If reasonably small already (< 1.5MB) and supported, read directly without re-encoding
  if (file.size <= 1_500_000) {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Impossible de lire ce fichier image.'));
      reader.readAsDataURL(file);
    });
    const base64 = dataUrl.split(',')[1] || '';
    return { mimeType: file.type, dataBase64: base64 };
  }

  // Resize/compress large photos smoothly in browser canvas
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_CLIENT_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const targetW = Math.max(1, Math.round(bitmap.width * scale));
  const targetH = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Impossible de traiter l’image dans ce navigateur.');
  }
  ctx.drawImage(bitmap, 0, 0, targetW, targetH);
  bitmap.close();

  const outMime = file.type === 'image/png' ? 'image/webp' : 'image/jpeg';
  const dataUrl = canvas.toDataURL(outMime, 0.86);
  const base64 = dataUrl.split(',')[1] || '';
  return { mimeType: outMime, dataBase64: base64 };
}

export async function uploadAdminImageFile(file: File, user: User): Promise<string> {
  const idToken = await user.getIdToken();
  const { mimeType, dataBase64 } = await prepareImageForUpload(file);
  const candidates = getUniqueEndpoints('/api/admin/upload');

  let lastStatus = 0;
  let lastError = '';

  for (const { endpoint, originBase } of candidates) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          mimeType,
          dataBase64,
        }),
      });

      const payload = await parseJsonSafe<{ url?: string; error?: string }>(res);
      if (res.ok && payload?.url) {
        if (payload.url.startsWith('/') && originBase) {
          return `${originBase}${payload.url}`;
        }
        return payload.url;
      }

      lastStatus = res.status;
      lastError = payload?.error || '';

      // Retry secondary candidate only when endpoint wasn't found/available on primary
      if (res.status !== 404 && res.status !== 501) {
        break;
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : '';
    }
  }

  if (lastStatus === 404 || lastStatus === 501) {
    throw new Error(
      lastError ||
        'Le téléversement de fichier local n’est pas disponible sur cet hébergement. Collez directement un lien d’image (https://...) dans le champ Lien ci-dessous.'
    );
  }

  throw new Error(lastError || `Échec du téléversement (HTTP ${lastStatus || 500}).`);
}

export async function fetchAdminUploadedImages(user: User): Promise<UploadedImageItem[]> {
  try {
    const idToken = await user.getIdToken();
    const candidates = getUniqueEndpoints('/api/admin/uploads');
    for (const { endpoint, originBase } of candidates) {
      try {
        const res = await fetch(endpoint, {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });
        if (!res.ok) continue;
        const payload = await parseJsonSafe<{ files?: UploadedImageItem[] }>(res);
        if (Array.isArray(payload?.files)) {
          return payload.files.map((item) => ({
            name: item.name,
            url: item.url.startsWith('/') && originBase ? `${originBase}${item.url}` : item.url,
          }));
        }
      } catch {
        // Try next candidate
      }
    }
    return [];
  } catch {
    return [];
  }
}
