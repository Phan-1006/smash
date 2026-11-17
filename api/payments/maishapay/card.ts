import crypto from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

const MAISHAPAY_BASE_URL = 'https://marchand.maishapay.online';

const ALLOWED_ORIGINS = new Set<string>([
  'https://smash-flame.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]);

type VercelIncoming = IncomingMessage & { body?: unknown };

function sendJson(
  req: IncomingMessage,
  res: ServerResponse,
  statusCode: number,
  payload: unknown
): void {
  const origin = req.headers.origin?.replace(/\/$/, '');
  if (
    origin &&
    (ALLOWED_ORIGINS.has(origin) ||
      /^https:\/\/smash-flame(?:-[a-z0-9-]+)?\.vercel\.app$/i.test(origin) ||
      /^https:\/\/[a-z0-9-]+\.europe-west2\.run\.app$/i.test(origin))
  ) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

async function readBody(req: VercelIncoming): Promise<Record<string, unknown>> {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body as Record<string, unknown>;
  }
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function resolveCallbackUrl(req: IncomingMessage): string {
  const envUrl = process.env.APP_URL?.trim();
  if (envUrl && envUrl !== 'MY_APP_URL') {
    return `${envUrl.replace(/\/$/, '')}/api/payments/maishapay/callback`;
  }
  const rawProto = req.headers['x-forwarded-proto'];
  const proto = (Array.isArray(rawProto) ? rawProto[0] : rawProto)?.split(',')[0]?.trim() || 'https';
  const rawHost = req.headers['x-forwarded-host'] || req.headers.host;
  const host =
    (Array.isArray(rawHost) ? rawHost[0] : rawHost)?.split(',')[0]?.trim() ||
    'smash-flame.vercel.app';
  return `${proto}://${host}/api/payments/maishapay/callback`;
}

function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/[\s()-]/g, '');
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.startsWith('00')) return `+${cleaned.slice(2)}`;
  if (cleaned.startsWith('0') && cleaned.length === 10) return `+243${cleaned.slice(1)}`;
  return `+${cleaned}`;
}

function extractError(data: Record<string, unknown>, httpStatus: number): string {
  if (data.errors && typeof data.errors === 'object') {
    const messages: string[] = [];
    for (const [field, val] of Object.entries(data.errors as Record<string, unknown>)) {
      if (Array.isArray(val)) messages.push(`${field}: ${val.join(', ')}`);
      else if (typeof val === 'string') messages.push(`${field}: ${val}`);
    }
    if (messages.length > 0) return messages.join(' | ');
  }
  if (typeof data.message === 'string' && data.message.trim()) return data.message;
  if (typeof data.transactionDescription === 'string' && data.transactionDescription.trim()) {
    return data.transactionDescription;
  }
  if (typeof data.error === 'string' && data.error.trim()) return data.error;
  if (typeof data.title === 'string' && data.title.trim()) return data.title;
  return `Erreur passerelle MaishaPay (${httpStatus})`;
}

export default async function handler(req: VercelIncoming, res: ServerResponse): Promise<void> {
  if (req.method === 'OPTIONS') {
    sendJson(req, res, 204, {});
    return;
  }
  if (req.method !== 'POST') {
    sendJson(req, res, 405, { error: 'Méthode non autorisée.' });
    return;
  }

  const publicApiKey = process.env.MAISHAPAY_PUBLIC_KEY?.trim() || '';
  const secretApiKey = process.env.MAISHAPAY_SECRET_KEY?.trim() || '';
  const gatewayMode = process.env.MAISHAPAY_GATEWAY_MODE?.trim() || '1';
  const configured =
    publicApiKey.length > 0 &&
    secretApiKey.length > 0 &&
    !publicApiKey.includes('YOUR_PUBLIC_KEY') &&
    !secretApiKey.includes('YOUR_SECRET_KEY');

  if (!configured) {
    sendJson(req, res, 503, {
      error:
        'Les clés API MaishaPay Live (MAISHAPAY_PUBLIC_KEY et MAISHAPAY_SECRET_KEY) ne sont pas configurées sur Vercel.',
      code: 'MAISHAPAY_CREDENTIALS_MISSING',
    });
    return;
  }

  const body = await readBody(req);
  const {
    amount,
    currency,
    customerFullName,
    customerPhoneNumber,
    customerEmail,
    transactionReference,
  } = body as {
    amount?: number | string;
    currency?: string;
    customerFullName?: string;
    customerPhoneNumber?: string;
    customerEmail?: string;
    transactionReference?: string;
  };

  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    sendJson(req, res, 400, { error: 'Montant de paiement invalide.' });
    return;
  }

  const normalizedCurrency = (currency || 'USD').toUpperCase();
  if (normalizedCurrency !== 'USD' && normalizedCurrency !== 'CDF') {
    sendJson(req, res, 400, { error: 'Devise non supportée. Utilisez USD ou CDF.' });
    return;
  }

  const txRef =
    transactionReference?.trim() || `MS-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const formattedPhone = customerPhoneNumber ? normalizePhone(customerPhoneNumber.trim()) : '+243000000000';
  const formattedAmount =
    normalizedCurrency === 'CDF' ? String(Math.round(numericAmount)) : numericAmount.toFixed(2);

  const payload = {
    gatewayMode,
    publicApiKey,
    secretApiKey,
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
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
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
      const message = extractError(data, bodyStatusCode);
      sendJson(req, res, bodyStatusCode >= 400 && bodyStatusCode < 600 ? bodyStatusCode : 502, {
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

    sendJson(req, res, 200, {
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
      gatewayResponse: data,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur réseau vers MaishaPay';
    sendJson(req, res, 502, {
      error: `Impossible de joindre MaishaPay Carte Live : ${message}`,
    });
  }
}
