import type { User } from 'firebase/auth';
import { apiUrl, parseJsonSafe } from './api';

export interface UploadedImageItem {
  url: string;
  name: string;
}

const MAX_CLIENT_DIMENSION = 1600;

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

  const res = await fetch(apiUrl('/api/admin/upload'), {
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
  if (!res.ok || !payload?.url) {
    throw new Error(payload?.error || `Échec du téléversement (HTTP ${res.status}).`);
  }

  return payload.url;
}

export async function fetchAdminUploadedImages(user: User): Promise<UploadedImageItem[]> {
  try {
    const idToken = await user.getIdToken();
    const res = await fetch(apiUrl('/api/admin/uploads'), {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });
    if (!res.ok) return [];
    const payload = await parseJsonSafe<{ files?: UploadedImageItem[] }>(res);
    return Array.isArray(payload?.files) ? payload.files : [];
  } catch {
    return [];
  }
}
