import 'dotenv/config';
import express, { Request, Response } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const MAISHAPAY_BASE_URL = 'https://marchand.maishapay.online';

type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED';

interface TransactionRecord {
  transactionReference: string;
  channel: 'MOBILEMONEY' | 'CARD';
  provider: string;
  amount: string;
  currency: string;
  customerPhoneNumber: string;
  status: PaymentStatus;
  originatingTransactionId?: string;
  paymentPageUrl?: string;
  gatewayMessage?: string;
  updatedAt: string;
}

const transactionsStore = new Map<string, TransactionRecord>();

function getMaishaPayCredentials() {
  const publicApiKey = process.env.MAISHAPAY_PUBLIC_KEY?.trim() || '';
  const secretApiKey = process.env.MAISHAPAY_SECRET_KEY?.trim() || '';
  const gatewayMode = process.env.MAISHAPAY_GATEWAY_MODE?.trim() || '1';
  return {
    publicApiKey,
    secretApiKey,
    gatewayMode,
    isConfigured:
      publicApiKey.length > 0 &&
      secretApiKey.length > 0 &&
      !publicApiKey.includes('YOUR_PUBLIC_KEY') &&
      !secretApiKey.includes('YOUR_SECRET_KEY'),
  };
}

function resolveCallbackUrl(req: Request): string {
  const envUrl = process.env.APP_URL?.trim();
  if (envUrl && envUrl !== 'MY_APP_URL') {
    return `${envUrl.replace(/\/$/, '')}/api/payments/maishapay/callback`;
  }
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
  return `${proto}://${host}/api/payments/maishapay/callback`;
}

function generateTxReference(): string {
  const rand = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `MS-${Date.now()}-${rand}`;
}

function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/[\s()-]/g, '');
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.startsWith('00')) return `+${cleaned.slice(2)}`;
  if (cleaned.startsWith('0') && cleaned.length === 10) return `+243${cleaned.slice(1)}`;
  return `+${cleaned}`;
}

function mapMaishaPayStatus(raw: string): PaymentStatus {
  const s = raw.toUpperCase();
  if (
    s === 'SUCCESS' ||
    s === 'SUCCESSFUL' ||
    s === 'PAID' ||
    s === 'APPROVED' ||
    s === 'COMPLETED' ||
    s === '200'
  ) {
    return 'PAID';
  }
  if (s === 'FAILED' || s === 'DECLINED' || s === 'CANCELLED' || s === 'REJECTED') {
    return 'FAILED';
  }
  return 'PENDING';
}

function extractMaishaPayError(data: Record<string, unknown>, httpStatus: number): string {
  if (data.errors && typeof data.errors === 'object') {
    const messages: string[] = [];
    for (const [field, val] of Object.entries(data.errors as Record<string, unknown>)) {
      if (Array.isArray(val)) {
        messages.push(`${field}: ${val.join(', ')}`);
      } else if (typeof val === 'string') {
        messages.push(`${field}: ${val}`);
      }
    }
    if (messages.length > 0) {
      return messages.join(' | ');
    }
  }
  if (typeof data.message === 'string' && data.message.trim()) return data.message;
  if (typeof data.transactionDescription === 'string' && data.transactionDescription.trim()) {
    return data.transactionDescription;
  }
  if (typeof data.error === 'string' && data.error.trim()) return data.error;
  if (typeof data.title === 'string' && data.title.trim()) return data.title;
  return `Erreur passerelle MaishaPay (${httpStatus})`;
}

const EXPLICIT_ALLOWED_ORIGINS = new Set<string>([
  'https://smash-flame.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]);

if (process.env.APP_URL && process.env.APP_URL !== 'MY_APP_URL') {
  EXPLICIT_ALLOWED_ORIGINS.add(process.env.APP_URL.trim().replace(/\/$/, ''));
}

if (process.env.ALLOWED_ORIGIN) {
  for (const entry of process.env.ALLOWED_ORIGIN.split(',')) {
    const cleaned = entry.trim().replace(/\/$/, '');
    if (cleaned) {
      EXPLICIT_ALLOWED_ORIGINS.add(cleaned);
    }
  }
}

function isAllowedOrigin(origin: string | undefined): string | null {
  if (!origin) return null;
  const normalized = origin.replace(/\/$/, '');
  if (EXPLICIT_ALLOWED_ORIGINS.has(normalized)) {
    return normalized;
  }
  if (/^https:\/\/[a-z0-9-]+\.europe-west2\.run\.app$/i.test(normalized)) {
    return normalized;
  }
  return null;
}

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
    const creds = getMaishaPayCredentials();
    res.json({
      configured: creds.isConfigured,
      gatewayMode: creds.gatewayMode,
      modeLabel: creds.gatewayMode === '1' ? 'LIVE' : 'SANDBOX',
      supportedMobileProviders: ['MPESA', 'AIRTEL', 'ORANGE', 'AFRICELL'],
    });
  });

  // Live MaishaPay Mobile Money v2 Collection
  app.post('/api/payments/maishapay/mobile-money', async (req: Request, res: Response) => {
    const creds = getMaishaPayCredentials();
    if (!creds.isConfigured) {
      res.status(503).json({
        error:
          'Les clés API MaishaPay Live (MAISHAPAY_PUBLIC_KEY et MAISHAPAY_SECRET_KEY) ne sont pas configurées dans les secrets du serveur.',
        code: 'MAISHAPAY_CREDENTIALS_MISSING',
      });
      return;
    }

    const {
      amount,
      currency,
      customerFullName,
      customerPhoneNumber,
      customerEmail,
      provider,
      transactionReference,
    } = req.body as {
      amount?: number | string;
      currency?: string;
      customerFullName?: string;
      customerPhoneNumber?: string;
      customerEmail?: string;
      provider?: string;
      transactionReference?: string;
    };

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      res.status(400).json({ error: 'Montant de paiement invalide.' });
      return;
    }

    const allowedCurrencies = new Set(['USD', 'CDF']);
    const normalizedCurrency = (currency || 'USD').toUpperCase();
    if (!allowedCurrencies.has(normalizedCurrency)) {
      res.status(400).json({ error: 'Devise non supportée. Utilisez USD ou CDF.' });
      return;
    }

    const allowedProviders = new Set(['MPESA', 'AIRTEL', 'ORANGE', 'AFRICELL']);
    const normalizedProvider = (provider || '').toUpperCase();
    if (!allowedProviders.has(normalizedProvider)) {
      res.status(400).json({ error: 'Opérateur Mobile Money invalide.' });
      return;
    }

    if (!customerPhoneNumber || customerPhoneNumber.trim().length < 8) {
      res.status(400).json({ error: 'Numéro de téléphone Mobile Money invalide.' });
      return;
    }

    const txRef = transactionReference?.trim() || generateTxReference();
    const formattedPhone = normalizePhone(customerPhoneNumber.trim());
    const formattedAmount =
      normalizedCurrency === 'CDF' ? String(Math.round(numericAmount)) : numericAmount.toFixed(2);

    const payload = {
      gatewayMode: creds.gatewayMode,
      publicApiKey: creds.publicApiKey,
      secretApiKey: creds.secretApiKey,
      transactionReference: txRef,
      order: {
        amount: formattedAmount,
        currency: normalizedCurrency,
        customerFullName: (customerFullName || 'Client Maison Smash').slice(0, 80),
        customerPhoneNumber: formattedPhone,
        customerEmailAdress: (customerEmail || 'client@maisonsmash.com').slice(0, 160),
      },
      paymentChannel: {
        channel: 'MOBILEMONEY',
        provider: normalizedProvider,
        walletID: formattedPhone,
        callbackUrl: resolveCallbackUrl(req),
      },
    };

    try {
      const response = await fetch(`${MAISHAPAY_BASE_URL}/api/collect/v2/store/mobileMoney`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const rawText = await response.text();
      let data: Record<string, unknown> = {};
      try {
        data = JSON.parse(rawText) as Record<string, unknown>;
      } catch {
        data = { rawMessage: rawText };
      }

      const bodyStatusCode = typeof data.status_code === 'number' ? data.status_code : response.status;
      if (!response.ok || bodyStatusCode >= 400) {
        const message = extractMaishaPayError(data, bodyStatusCode);
        console.error('MaishaPay Mobile Money error:', bodyStatusCode, data);
        res.status(bodyStatusCode >= 400 && bodyStatusCode < 600 ? bodyStatusCode : 502).json({
          error: message,
          details: data,
        });
        return;
      }

      const statusRaw = String(data.transactionStatus || data.status || 'PENDING');
      const normalizedStatus = mapMaishaPayStatus(statusRaw);

      const record: TransactionRecord = {
        transactionReference: txRef,
        channel: 'MOBILEMONEY',
        provider: normalizedProvider,
        amount: formattedAmount,
        currency: normalizedCurrency,
        customerPhoneNumber: formattedPhone,
        status: normalizedStatus,
        originatingTransactionId:
          typeof data.originatingTransactionId === 'string'
            ? data.originatingTransactionId
            : typeof data.transactionId === 'string' || typeof data.transactionId === 'number'
            ? String(data.transactionId)
            : undefined,
        gatewayMessage:
          (typeof data.message === 'string' && data.message) ||
          (typeof data.transactionDescription === 'string' && data.transactionDescription) ||
          'Demande USSD envoyée. Veuillez valider sur votre téléphone.',
        updatedAt: new Date().toISOString(),
      };

      transactionsStore.set(txRef, record);
      res.json({
        ...record,
        gatewayResponse: data,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur réseau vers MaishaPay';
      res.status(502).json({
        error: `Impossible de joindre la passerelle MaishaPay Live : ${message}`,
      });
    }
  });

  // Live MaishaPay Bank Card v2 Collection (Visa / Mastercard via CyberSource)
  app.post('/api/payments/maishapay/card', async (req: Request, res: Response) => {
    const creds = getMaishaPayCredentials();
    if (!creds.isConfigured) {
      res.status(503).json({
        error:
          'Les clés API MaishaPay Live (MAISHAPAY_PUBLIC_KEY et MAISHAPAY_SECRET_KEY) ne sont pas configurées dans les secrets du serveur.',
        code: 'MAISHAPAY_CREDENTIALS_MISSING',
      });
      return;
    }

    const {
      amount,
      currency,
      customerFullName,
      customerPhoneNumber,
      customerEmail,
      transactionReference,
    } = req.body as {
      amount?: number | string;
      currency?: string;
      customerFullName?: string;
      customerPhoneNumber?: string;
      customerEmail?: string;
      transactionReference?: string;
    };

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      res.status(400).json({ error: 'Montant de paiement invalide.' });
      return;
    }

    const normalizedCurrency = (currency || 'USD').toUpperCase();
    if (normalizedCurrency !== 'USD' && normalizedCurrency !== 'CDF') {
      res.status(400).json({ error: 'Devise non supportée. Utilisez USD ou CDF.' });
      return;
    }

    const txRef = transactionReference?.trim() || generateTxReference();
    const formattedPhone = customerPhoneNumber ? normalizePhone(customerPhoneNumber.trim()) : '+243000000000';
    const formattedAmount =
      normalizedCurrency === 'CDF' ? String(Math.round(numericAmount)) : numericAmount.toFixed(2);

    const payload = {
      gatewayMode: creds.gatewayMode,
      publicApiKey: creds.publicApiKey,
      secretApiKey: creds.secretApiKey,
      transactionReference: txRef,
      order: {
        amount: formattedAmount,
        currency: normalizedCurrency,
        customerFullName: (customerFullName || 'Client Maison Smash').slice(0, 80),
        customerPhoneNumber: formattedPhone,
        customerEmailAdress: (customerEmail || 'client@maisonsmash.com').slice(0, 160),
      },
      paymentChannel: {
        channel: 'CARD',
        provider: 'VISA',
        callbackUrl: resolveCallbackUrl(req),
      },
    };

    try {
      const response = await fetch(`${MAISHAPAY_BASE_URL}/api/collect/v2/store/card`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const rawText = await response.text();
      let data: Record<string, unknown> = {};
      try {
        data = JSON.parse(rawText) as Record<string, unknown>;
      } catch {
        data = { rawMessage: rawText };
      }

      const bodyStatusCode = typeof data.status_code === 'number' ? data.status_code : response.status;
      if (!response.ok || bodyStatusCode >= 400) {
        const message = extractMaishaPayError(data, bodyStatusCode);
        console.error('MaishaPay Card error:', bodyStatusCode, data);
        res.status(bodyStatusCode >= 400 && bodyStatusCode < 600 ? bodyStatusCode : 502).json({
          error: message,
          details: data,
        });
        return;
      }

      const paymentPageUrl =
        (typeof data.paymentPage === 'string' && data.paymentPage) ||
        (typeof data.redirectUrl === 'string' && data.redirectUrl) ||
        (typeof data.url === 'string' && data.url) ||
        (typeof data.checkoutUrl === 'string' && data.checkoutUrl) ||
        undefined;

      const record: TransactionRecord = {
        transactionReference: txRef,
        channel: 'CARD',
        provider: 'VISA_MASTERCARD',
        amount: formattedAmount,
        currency: normalizedCurrency,
        customerPhoneNumber: formattedPhone,
        status: 'PENDING',
        originatingTransactionId:
          typeof data.originatingTransactionId === 'string'
            ? data.originatingTransactionId
            : typeof data.transactionId === 'string' || typeof data.transactionId === 'number'
            ? String(data.transactionId)
            : undefined,
        paymentPageUrl,
        gatewayMessage:
          (typeof data.message === 'string' && data.message) ||
          'Session carte sécurisée MaishaPay initialisée.',
        updatedAt: new Date().toISOString(),
      };

      transactionsStore.set(txRef, record);
      res.json({
        ...record,
        gatewayResponse: data,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur réseau vers MaishaPay';
      res.status(502).json({
        error: `Impossible de joindre MaishaPay Carte Live : ${message}`,
      });
    }
  });

  // MaishaPay Async Webhook Callback
  app.post('/api/payments/maishapay/callback', (req: Request, res: Response) => {
    const body = req.body as Record<string, unknown>;
    const txRef = String(
      body.transactionReference || body.originatingTransactionId || body.orderReference || body.reference || ''
    ).trim();

    if (!txRef) {
      res.status(400).json({ received: false, error: 'Missing transactionReference' });
      return;
    }

    const rawStatus = String(
      body.transactionStatus || body.status || body.paymentStatus || ''
    );
    const mappedStatus = mapMaishaPayStatus(rawStatus);

    const existing = transactionsStore.get(txRef);
    const updated: TransactionRecord = {
      transactionReference: txRef,
      channel: existing?.channel || 'MOBILEMONEY',
      provider: existing?.provider || String(body.provider || 'MPESA'),
      amount: existing?.amount || String(body.amount || '0'),
      currency: existing?.currency || String(body.currency || 'USD'),
      customerPhoneNumber: existing?.customerPhoneNumber || '',
      status: mappedStatus,
      originatingTransactionId:
        existing?.originatingTransactionId ||
        (typeof body.originatingTransactionId === 'string'
          ? body.originatingTransactionId
          : undefined),
      gatewayMessage:
        typeof body.message === 'string'
          ? body.message
          : typeof body.transactionDescription === 'string'
          ? body.transactionDescription
          : mappedStatus === 'PAID'
          ? 'Paiement confirmé par MaishaPay.'
          : 'Statut mis à jour via webhook MaishaPay.',
      updatedAt: new Date().toISOString(),
    };

    transactionsStore.set(txRef, updated);
    res.json({ received: true, status: mappedStatus, transactionReference: txRef });
  });

  // MaishaPay Transaction Status Poll (checks memory + queries MaishaPay check endpoint if pending)
  app.get('/api/payments/maishapay/status/:reference', async (req: Request, res: Response) => {
    const ref = String(req.params.reference || '').trim();
    const record = transactionsStore.get(ref);
    const creds = getMaishaPayCredentials();

    if (record && record.status === 'PENDING' && creds.isConfigured) {
      try {
        const checkResp = await fetch(
          `${MAISHAPAY_BASE_URL}/api/transaction/rest/v2/check`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: JSON.stringify({
              gatewayMode: creds.gatewayMode,
              publicApiKey: creds.publicApiKey,
              secretApiKey: creds.secretApiKey,
              transactionReference: ref,
            }),
          }
        );
        if (checkResp.ok) {
          const checkData = (await checkResp.json()) as Record<string, unknown>;
          const remoteRaw = String(
            checkData.transactionStatus || checkData.status || ''
          );
          if (remoteRaw) {
            const remoteMapped = mapMaishaPayStatus(remoteRaw);
            if (remoteMapped !== 'PENDING') {
              record.status = remoteMapped;
              record.gatewayMessage =
                (typeof checkData.transactionDescription === 'string' &&
                  checkData.transactionDescription) ||
                (typeof checkData.message === 'string' && checkData.message) ||
                record.gatewayMessage;
              record.updatedAt = new Date().toISOString();
              transactionsStore.set(ref, record);
            }
          }
        }
      } catch {
        // Ignore remote check errors and return local store state
      }
    }

    if (!record) {
      res.status(404).json({ error: 'Référence de transaction introuvable.', transactionReference: ref });
      return;
    }
    res.json(record);
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
