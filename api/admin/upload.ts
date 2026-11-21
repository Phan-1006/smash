import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { isAllowedOrigin, readJsonBody, sendVercelJson, type VercelReq, type VercelRes } from '../../lib/maishapay';

const ADMIN_EMAIL = 'p9695009@gmail.com';
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const ALLOWED_IMAGE_MIMES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

function getFirebaseWebApiKey(): string | null {
  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    const raw = fs.readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(raw) as { apiKey?: unknown };
    return typeof parsed.apiKey === 'string' && parsed.apiKey.length > 0 ? parsed.apiKey : null;
  } catch {
    return null;
  }
}

async function verifyAdminBearerToken(authHeader: string | undefined): Promise<string | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const idToken = authHeader.slice(7).trim();
  if (!idToken || idToken.length > 8192) return null;
  const apiKey = getFirebaseWebApiKey();
  if (!apiKey) return null;

  try {
    const resp = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );
    if (!resp.ok) return null;
    const data = (await resp.json()) as {
      users?: { email?: string; emailVerified?: boolean; disabled?: boolean }[];
    };
    const user = data.users?.[0];
    if (
      !user ||
      user.disabled ||
      !user.emailVerified ||
      !user.email ||
      user.email.toLowerCase() !== ADMIN_EMAIL
    ) {
      return null;
    }
    return user.email.toLowerCase();
  } catch {
    return null;
  }
}

function matchesImageMagicBytes(buf: Buffer, mimeType: string): boolean {
  if (buf.length < 12) return false;
  if (mimeType === 'image/jpeg') {
    return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  }
  if (mimeType === 'image/png') {
    return (
      buf[0] === 0x89 &&
      buf[1] === 0x50 &&
      buf[2] === 0x4e &&
      buf[3] === 0x47 &&
      buf[4] === 0x0d &&
      buf[5] === 0x0a &&
      buf[6] === 0x1a &&
      buf[7] === 0x0a
    );
  }
  if (mimeType === 'image/webp') {
    return (
      buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buf.subarray(8, 12).toString('ascii') === 'WEBP'
    );
  }
  return false;
}

export default async function handler(req: VercelReq, res: VercelRes): Promise<void> {
  const origin = isAllowedOrigin(req.headers.origin);
  if (req.method === 'OPTIONS') {
    sendVercelJson(req, res, 204, {});
    return;
  }

  if (req.headers.origin && !origin) {
    sendVercelJson(req, res, 403, { error: 'Origine non autorisée.' });
    return;
  }

  if (req.method !== 'POST') {
    sendVercelJson(req, res, 405, { error: 'Méthode non autorisée.' });
    return;
  }

  const adminEmail = await verifyAdminBearerToken(req.headers.authorization);
  if (!adminEmail) {
    sendVercelJson(req, res, 401, { error: 'Authentification administrateur requise.' });
    return;
  }

  const body = await readJsonBody(req);
  const mimeType = typeof body.mimeType === 'string' ? body.mimeType.trim().toLowerCase() : '';
  const ext = ALLOWED_IMAGE_MIMES[mimeType];
  if (!ext) {
    sendVercelJson(req, res, 400, {
      error: 'Format non supporté. Utilisez uniquement JPG, PNG ou WebP.',
    });
    return;
  }

  const rawBase64 = typeof body.dataBase64 === 'string' ? body.dataBase64.trim() : '';
  const cleanedBase64 = rawBase64.replace(/^data:[^;]+;base64,/, '');
  if (!cleanedBase64 || cleanedBase64.length > 7_500_000) {
    sendVercelJson(req, res, 400, { error: 'Fichier image manquant ou trop volumineux.' });
    return;
  }

  const buffer = Buffer.from(cleanedBase64, 'base64');
  if (buffer.length === 0 || buffer.length > MAX_UPLOAD_BYTES || !matchesImageMagicBytes(buffer, mimeType)) {
    sendVercelJson(req, res, 400, {
      error: 'Le contenu du fichier ne correspond pas à une image JPG, PNG ou WebP valide.',
    });
    return;
  }

  // Support Vercel Blob when BLOB_READ_WRITE_TOKEN is configured in Vercel environment
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (blobToken) {
    try {
      const fileName = `maison-smash/img_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}${ext}`;
      const blobResp = await fetch(`https://blob.vercel-storage.com/${fileName}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${blobToken}`,
          'Content-Type': mimeType,
          'x-content-type': mimeType,
        },
        body: buffer,
      });
      if (blobResp.ok) {
        const blobData = (await blobResp.json()) as { url?: string };
        if (blobData?.url) {
          sendVercelJson(req, res, 201, { url: blobData.url });
          return;
        }
      }
    } catch {
      // Fall through to helpful error below
    }
  }

  sendVercelJson(req, res, 501, {
    code: 'SERVERLESS_STORAGE_UNCONFIGURED',
    error:
      'L’envoi de fichier depuis cet appareil n’est pas activé sur cet hébergement serverless. Collez directement un lien d’image (https://...) dans le champ Lien ci-dessous.',
  });
}
