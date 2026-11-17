import crypto from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

export const MAISHAPAY_BASE_URL = 'https://marchand.maishapay.online';

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED';

export interface TransactionRecord {
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

export function isAllowedOrigin(origin: string | undefined): string | null {
  if (!origin) return null;
  const normalized = origin.replace(/\/$/, '');
  if (EXPLICIT_ALLOWED_ORIGINS.has(normalized)) {
    return normalized;
  }
  if (/^https:\/\/[a-z0-9-]+\.europe-west2\.run\.app$/i.test(normalized)) {
    return normalized;
  }
  if (/^https:\/\/smash-flame(?:-[a-z0-9-]+)?\.vercel\.app$/i.test(normalized)) {
    return normalized;
  }
  return null;
}

export function getMaishaPayCredentials() {
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

export function resolveCallbackUrlFromHeaders(
  headers: Record<string, string | string[] | undefined>,
  fallbackProtocol = 'https'
): string {
  const envUrl = process.env.APP_URL?.trim();
  if (envUrl && envUrl !== 'MY_APP_URL') {
    return `${envUrl.replace(/\/$/, '')}/api/payments/maishapay/callback`;
  }
  const rawProto = headers['x-forwarded-proto'];
  const proto =
    (Array.isArray(rawProto) ? rawProto[0] : rawProto)?.split(',')[0]?.trim() || fallbackProtocol;
  const rawHost = headers['x-forwarded-host'] || headers.host;
  const host =
    (Array.isArray(rawHost) ? rawHost[0] : rawHost)?.split(',')[0]?.trim() || 'localhost:3000';
  return `${proto}://${host}/api/payments/maishapay/callback`;
}

export function generateTxReference(): string {
  const rand = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `MS-${Date.now()}-${rand}`;
}

export function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/[\s()-]/g, '');
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.startsWith('00')) return `+${cleaned.slice(2)}`;
  if (cleaned.startsWith('0') && cleaned.length === 10) return `+243${cleaned.slice(1)}`;
  return `+${cleaned}`;
}

export function mapMaishaPayStatus(raw: string): PaymentStatus {
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

export function extractMaishaPayError(data: Record<string, unknown>, httpStatus: number): string {
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

export interface ApiResult {
  statusCode: number;
  payload: Record<string, unknown>;
}

export function getGatewayConfigResult(): ApiResult {
  const creds = getMaishaPayCredentials();
  return {
    statusCode: 200,
    payload: {
      configured: creds.isConfigured,
      gatewayMode: creds.gatewayMode,
      modeLabel: creds.gatewayMode === '1' ? 'LIVE' : 'SANDBOX',
      supportedMobileProviders: ['MPESA', 'AIRTEL', 'ORANGE', 'AFRICELL'],
    },
  };
}

export async function processMobileMoneyPayment(
  body: Record<string, unknown>,
  callbackUrl: string
): Promise<ApiResult> {
  const creds = getMaishaPayCredentials();
  if (!creds.isConfigured) {
    return {
      statusCode: 503,
      payload: {
        error:
          'Les clés API MaishaPay Live (MAISHAPAY_PUBLIC_KEY et MAISHAPAY_SECRET_KEY) ne sont pas configurées dans les variables d’environnement du serveur.',
        code: 'MAISHAPAY_CREDENTIALS_MISSING',
      },
    };
  }

  const {
    amount,
    currency,
    customerFullName,
    customerPhoneNumber,
    customerEmail,
    provider,
    transactionReference,
  } = body as {
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
    return { statusCode: 400, payload: { error: 'Montant de paiement invalide.' } };
  }

  const allowedCurrencies = new Set(['USD', 'CDF']);
  const normalizedCurrency = (currency || 'USD').toUpperCase();
  if (!allowedCurrencies.has(normalizedCurrency)) {
    return { statusCode: 400, payload: { error: 'Devise non supportée. Utilisez USD ou CDF.' } };
  }

  const allowedProviders = new Set(['MPESA', 'AIRTEL', 'ORANGE', 'AFRICELL']);
  const normalizedProvider = (provider || '').toUpperCase();
  if (!allowedProviders.has(normalizedProvider)) {
    return { statusCode: 400, payload: { error: 'Opérateur Mobile Money invalide.' } };
  }

  if (!customerPhoneNumber || customerPhoneNumber.trim().length < 8) {
    return {
      statusCode: 400,
      payload: { error: 'Numéro de téléphone Mobile Money invalide.' },
    };
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
      callbackUrl,
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
      return {
        statusCode: bodyStatusCode >= 400 && bodyStatusCode < 600 ? bodyStatusCode : 502,
        payload: {
          error: message,
          details: data,
        },
      };
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
    return {
      statusCode: 200,
      payload: {
        ...record,
        gatewayResponse: data,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur réseau vers MaishaPay';
    return {
      statusCode: 502,
      payload: {
        error: `Impossible de joindre la passerelle MaishaPay Live : ${message}`,
      },
    };
  }
}

export async function processCardPayment(
  body: Record<string, unknown>,
  callbackUrl: string
): Promise<ApiResult> {
  const creds = getMaishaPayCredentials();
  if (!creds.isConfigured) {
    return {
      statusCode: 503,
      payload: {
        error:
          'Les clés API MaishaPay Live (MAISHAPAY_PUBLIC_KEY et MAISHAPAY_SECRET_KEY) ne sont pas configurées dans les variables d’environnement du serveur.',
        code: 'MAISHAPAY_CREDENTIALS_MISSING',
      },
    };
  }

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
    return { statusCode: 400, payload: { error: 'Montant de paiement invalide.' } };
  }

  const normalizedCurrency = (currency || 'USD').toUpperCase();
  if (normalizedCurrency !== 'USD' && normalizedCurrency !== 'CDF') {
    return { statusCode: 400, payload: { error: 'Devise non supportée. Utilisez USD ou CDF.' } };
  }

  const txRef = transactionReference?.trim() || generateTxReference();
  const formattedPhone = customerPhoneNumber
    ? normalizePhone(customerPhoneNumber.trim())
    : '+243000000000';
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
      callbackUrl,
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
      return {
        statusCode: bodyStatusCode >= 400 && bodyStatusCode < 600 ? bodyStatusCode : 502,
        payload: {
          error: message,
          details: data,
        },
      };
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
    return {
      statusCode: 200,
      payload: {
        ...record,
        gatewayResponse: data,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur réseau vers MaishaPay';
    return {
      statusCode: 502,
      payload: {
        error: `Impossible de joindre MaishaPay Carte Live : ${message}`,
      },
    };
  }
}

export function processWebhookCallback(body: Record<string, unknown>): ApiResult {
  const txRef = String(
    body.transactionReference ||
      body.originatingTransactionId ||
      body.orderReference ||
      body.reference ||
      ''
  ).trim();

  if (!txRef) {
    return {
      statusCode: 400,
      payload: { received: false, error: 'Missing transactionReference' },
    };
  }

  const rawStatus = String(body.transactionStatus || body.status || body.paymentStatus || '');
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
  return {
    statusCode: 200,
    payload: { received: true, status: mappedStatus, transactionReference: txRef },
  };
}

export async function checkTransactionStatus(reference: string): Promise<ApiResult> {
  const ref = reference.trim();
  if (!ref) {
    return {
      statusCode: 400,
      payload: { error: 'Référence de transaction manquante.' },
    };
  }

  const record = transactionsStore.get(ref);
  const creds = getMaishaPayCredentials();

  // Always check remotely if configured and either no local record (serverless cold start)
  // or local record is still PENDING.
  if (creds.isConfigured && (!record || record.status === 'PENDING')) {
    try {
      const checkResp = await fetch(`${MAISHAPAY_BASE_URL}/api/transaction/rest/v2/check`, {
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
      });
      if (checkResp.ok) {
        const checkData = (await checkResp.json()) as Record<string, unknown>;
        const remoteRaw = String(checkData.transactionStatus || checkData.status || '');
        if (remoteRaw) {
          const remoteMapped = mapMaishaPayStatus(remoteRaw);
          const remoteMsg =
            (typeof checkData.transactionDescription === 'string' &&
              checkData.transactionDescription) ||
            (typeof checkData.message === 'string' && checkData.message) ||
            record?.gatewayMessage;

          if (record) {
            if (remoteMapped !== 'PENDING') {
              record.status = remoteMapped;
              record.gatewayMessage = remoteMsg;
              record.updatedAt = new Date().toISOString();
              transactionsStore.set(ref, record);
            }
            return { statusCode: 200, payload: { ...record } };
          }

          return {
            statusCode: 200,
            payload: {
              transactionReference: ref,
              status: remoteMapped,
              gatewayMessage: remoteMsg,
              updatedAt: new Date().toISOString(),
            },
          };
        }
      }
    } catch {
      // Ignore remote check errors and fall back to local store state if present
    }
  }

  if (record) {
    return { statusCode: 200, payload: { ...record } };
  }

  return {
    statusCode: 200,
    payload: {
      transactionReference: ref,
      status: 'PENDING',
      updatedAt: new Date().toISOString(),
    },
  };
}

export type VercelReq = IncomingMessage & {
  body?: unknown;
  query?: Record<string, string | string[] | undefined>;
};

export type VercelRes = ServerResponse & {
  status?: (code: number) => VercelRes;
  json?: (data: unknown) => void;
};

export function sendVercelJson(
  req: VercelReq,
  res: VercelRes,
  statusCode: number,
  payload: unknown
): void {
  const allowedOrigin = isAllowedOrigin(req.headers.origin);
  if (allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (typeof res.status === 'function' && typeof res.json === 'function') {
    const statusRes = res.status(statusCode);
    if (typeof statusRes?.json === 'function') {
      statusRes.json(payload);
      return;
    }
  }
  res.statusCode = statusCode;
  res.end(JSON.stringify(payload));
}

export async function readJsonBody(req: VercelReq): Promise<Record<string, unknown>> {
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
