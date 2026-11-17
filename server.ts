import 'dotenv/config';
import express, { Request, Response } from 'express';
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

async function createServer() {
  const app = express();
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
