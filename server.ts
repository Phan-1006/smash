import 'dotenv/config';
import express, { Request, Response } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  checkTransactionStatus,
  getGatewayConfigResult,
  isAllowedOrigin,
  processCardPayment,
  processMobileMoneyPayment,
  processWebhookCallback,
  resolveCallbackUrlFromHeaders,
} from './lib/maishapay';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const ADMIN_EMAIL = 'p9695009@gmail.com';
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const ALLOWED_IMAGE_MIMES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

function getFirebaseWebApiKey(): string | null {
  try {
    const configPath = path.resolve(__dirname, 'firebase-applet-config.json');
    const raw = fs.readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(raw) as { apiKey?: unknown };
    return typeof parsed.apiKey === 'string' && parsed.apiKey.length > 0 ? parsed.apiKey : null;
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

async function verifyAdminBearerToken(authHeader: string | undefined): Promise<string | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const idToken = authHeader.slice(7).trim();
  if (!idToken || idToken.length > 8192) {
    return null;
  }
  const apiKey = getFirebaseWebApiKey();
  if (!apiKey) {
    return null;
  }
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

async function createServer() {
  const app = express();
  const uploadsDir = path.resolve(__dirname, 'public', 'uploads');
  fs.mkdirSync(uploadsDir, { recursive: true });

  app.use('/uploads', express.static(uploadsDir, { maxAge: '7d' }));

  // Larger JSON body parser strictly scoped to authenticated admin image uploads
  app.use('/api/admin/upload', express.json({ limit: '8mb' }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.use('/api', (req: Request, res: Response, next) => {
    const allowedOrigin = isAllowedOrigin(req.headers.origin);
    if (allowedOrigin) {
      res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  // List previously uploaded storefront images (admin only)
  app.get('/api/admin/uploads', async (req: Request, res: Response) => {
    const adminEmail = await verifyAdminBearerToken(req.headers.authorization);
    if (!adminEmail) {
      res.status(401).json({ error: 'Authentification administrateur requise.' });
      return;
    }
    try {
      const files = fs
        .readdirSync(uploadsDir)
        .filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f))
        .map((f) => {
          const stat = fs.statSync(path.join(uploadsDir, f));
          return { url: `/uploads/${f}`, name: f, mtimeMs: stat.mtimeMs };
        })
        .sort((a, b) => b.mtimeMs - a.mtimeMs)
        .slice(0, 60)
        .map(({ url, name }) => ({ url, name }));
      res.json({ files });
    } catch {
      res.status(500).json({ error: 'Impossible de lister les fichiers téléversés.' });
    }
  });

  // Upload storefront or product photo (admin only, validated MIME + magic bytes)
  app.post('/api/admin/upload', async (req: Request, res: Response) => {
    const adminEmail = await verifyAdminBearerToken(req.headers.authorization);
    if (!adminEmail) {
      res.status(401).json({ error: 'Authentification administrateur requise.' });
      return;
    }

    const body = (req.body || {}) as {
      mimeType?: unknown;
      dataBase64?: unknown;
    };

    const mimeType = typeof body.mimeType === 'string' ? body.mimeType.trim().toLowerCase() : '';
    const ext = ALLOWED_IMAGE_MIMES[mimeType];
    if (!ext) {
      res.status(400).json({
        error: 'Format non supporté. Utilisez uniquement JPG, PNG ou WebP.',
      });
      return;
    }

    const rawBase64 = typeof body.dataBase64 === 'string' ? body.dataBase64.trim() : '';
    const cleanedBase64 = rawBase64.replace(/^data:[^;]+;base64,/, '');
    if (!cleanedBase64 || cleanedBase64.length > 7_500_000) {
      res.status(400).json({ error: 'Fichier image manquant ou trop volumineux.' });
      return;
    }

    const buffer = Buffer.from(cleanedBase64, 'base64');
    if (buffer.length === 0 || buffer.length > MAX_UPLOAD_BYTES) {
      res.status(400).json({ error: 'La taille de l’image doit être inférieure à 5 Mo.' });
      return;
    }

    if (!matchesImageMagicBytes(buffer, mimeType)) {
      res.status(400).json({
        error: 'Le contenu du fichier ne correspond pas à une image JPG, PNG ou WebP valide.',
      });
      return;
    }

    const safeFileName = `img_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}${ext}`;
    const targetPath = path.resolve(uploadsDir, safeFileName);
    if (!targetPath.startsWith(uploadsDir + path.sep)) {
      res.status(400).json({ error: 'Chemin de destination invalide.' });
      return;
    }

    try {
      fs.writeFileSync(targetPath, buffer);
      res.status(201).json({ url: `/uploads/${safeFileName}` });
    } catch {
      res.status(500).json({ error: 'Erreur lors de l’enregistrement de l’image sur le serveur.' });
    }
  });

  // Check MaishaPay Live configuration status (never exposes keys)
  app.get('/api/payments/maishapay/config', (_req: Request, res: Response) => {
    const result = getGatewayConfigResult();
    res.status(result.statusCode).json(result.payload);
  });

  // Live MaishaPay Mobile Money v2 Collection
  app.post('/api/payments/maishapay/mobile-money', async (req: Request, res: Response) => {
    const callbackUrl = resolveCallbackUrlFromHeaders(
      req.headers as Record<string, string | string[] | undefined>,
      req.protocol || 'https'
    );
    const result = await processMobileMoneyPayment(
      (req.body || {}) as Record<string, unknown>,
      callbackUrl
    );
    res.status(result.statusCode).json(result.payload);
  });

  // Live MaishaPay Bank Card v2 Collection (Visa / Mastercard via CyberSource)
  app.post('/api/payments/maishapay/card', async (req: Request, res: Response) => {
    const callbackUrl = resolveCallbackUrlFromHeaders(
      req.headers as Record<string, string | string[] | undefined>,
      req.protocol || 'https'
    );
    const result = await processCardPayment(
      (req.body || {}) as Record<string, unknown>,
      callbackUrl
    );
    res.status(result.statusCode).json(result.payload);
  });

  // MaishaPay Async Webhook Callback
  app.post('/api/payments/maishapay/callback', (req: Request, res: Response) => {
    const result = processWebhookCallback((req.body || {}) as Record<string, unknown>);
    res.status(result.statusCode).json(result.payload);
  });

  // MaishaPay Transaction Status Poll
  app.get('/api/payments/maishapay/status/:reference', async (req: Request, res: Response) => {
    const ref = String(req.params.reference || '').trim();
    const result = await checkTransactionStatus(ref);
    res.status(result.statusCode).json(result.payload);
  });

  // Vite dev middleware or production static assets
  if (process.env.NODE_ENV !== 'production') {
    app.get('/@vite/client', (_req: Request, res: Response) => {
      res.type('application/javascript').send(`
const sheetsMap = new Map();
if (typeof document !== 'undefined') {
  document.querySelectorAll('style[data-vite-dev-id]').forEach((el) => {
    sheetsMap.set(el.getAttribute('data-vite-dev-id'), el);
  });
}
export function updateStyle(id, content) {
  let style = sheetsMap.get(id);
  if (!style) {
    style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    style.setAttribute('data-vite-dev-id', id);
    style.textContent = content;
    document.head.appendChild(style);
    sheetsMap.set(id, style);
  } else if (style.textContent !== content) {
    style.textContent = content;
  }
}
export function removeStyle(id) {
  const style = sheetsMap.get(id);
  if (style) {
    style.remove();
    sheetsMap.delete(id);
  }
}
export function createHotContext() {
  return {
    data: {},
    accept() {},
    acceptExports() {},
    dispose() {},
    prune() {},
    decline() {},
    invalidate() {},
    on() {},
    off() {},
    send() {},
  };
}
export function injectQuery(url, queryToInject) {
  if (url[0] !== '.' && url[0] !== '/') return url;
  const pathname = url.replace(/[?#].*$/, '');
  const { search, hash } = new URL(url, 'http://vite.dev');
  return \`\${pathname}?\${queryToInject}\${search ? '&' + search.slice(1) : ''}\${hash || ''}\`;
}
export class ErrorOverlay {}
`);
    });

    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false, ws: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found. Run npm run build.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Maison Smash server listening on http://0.0.0.0:${PORT}`);
  });
}

createServer().catch((err) => {
  console.error('Server startup error:', err);
  process.exit(1);
});
