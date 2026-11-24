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
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';

  let national = digits;
  if (national.startsWith('00243')) {
    national = national.slice(5);
  } else if (national.startsWith('243')) {
    national = national.slice(3);
  }

  if (national.startsWith('0') && national.length === 10) {
    national = national.slice(1);
  }

  if (national.length === 9 && /^[89]\d{8}$/.test(national)) {
    return `+243${national}`;
  }

  const trimmed = phone.replace(/[\s().-]/g, '');
  if (trimmed.startsWith('+')) return trimmed;
  if (trimmed.startsWith('00')) return `+${trimmed.slice(2)}`;
  return `+${digits}`;
}

function unwrapGatewayData(raw: Record<string, unknown>): Record<string, unknown> {
  const original = raw.original;
  if (original && typeof original === 'object') {
    const origObj = original as Record<string, unknown>;
    if (origObj.data && typeof origObj.data === 'object' && !Array.isArray(origObj.data)) {
      return { ...raw, ...origObj, ...(origObj.data as Record<string, unknown>) };
    }
    return { ...raw, ...origObj };
  }
  if (raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data)) {
    return { ...raw, ...(raw.data as Record<string, unknown>) };
  }
  return raw;
}

function parseStatusCode(data: Record<string, unknown>, fallbackStatus: number): number {
  const candidates = [data.status_code, data.statusCode, data.code, data.status];
  for (const val of candidates) {
    if (typeof val === 'number' && Number.isFinite(val)) return val;
    if (typeof val === 'string' && /^\d{3}$/.test(val.trim())) return Number(val.trim());
  }
  return fallbackStatus;
}

function mapStatus(raw: string): 'PENDING' | 'PAID' | 'FAILED' {
  const s = raw.toUpperCase().trim();
  if (
    s === 'SUCCESS' ||
    s === 'SUCCESSFUL' ||
    s === 'PAID' ||
    s === 'APPROVED' ||
    s === 'COMPLETED'
  ) {
    return 'PAID';
  }
  if (
    s === 'FAILED' ||
    s === 'DECLINED' ||
    s === 'CANCELLED' ||
    s === 'CANCELED' ||
    s === 'REJECTED' ||
    s === 'EXPIRED' ||
    s === 'TIMEOUT' ||
    s === 'ERROR'
  ) {
    return 'FAILED';
  }
  return 'PENDING';
}

function extractError(
  data: Record<string, unknown>,
  httpStatus: number,
  provider?: string
): string {
  const unwrapped = unwrapGatewayData(data);
  if (unwrapped.errors && typeof unwrapped.errors === 'object') {
    const messages: string[] = [];
    for (const [field, val] of Object.entries(unwrapped.errors as Record<string, unknown>)) {
      if (Array.isArray(val)) messages.push(`${field}: ${val.join(', ')}`);
      else if (typeof val === 'string') messages.push(`${field}: ${val}`);
    }
    if (messages.length > 0) return messages.join(' | ');
  }
  const candidateKeys = [
    'transactionDescription',
    'statusDescription',
    'operatorMessage',
    'error_description',
    'statusMessage',
    'description',
    'message',
    'error',
    'reason',
    'detail',
    'title',
  ] as const;
  for (const key of candidateKeys) {
    const val = unwrapped[key];
    if (typeof val === 'string' && val.trim()) {
      return val.trim();
    }
  }
  if (typeof unwrapped.rawMessage === 'string' && unwrapped.rawMessage.trim()) {
    return `MaishaPay (${httpStatus}): ${unwrapped.rawMessage.trim().slice(0, 180)}`;
  }
  if (String(unwrapped.transactionStatus || '').toUpperCase() === 'FAILED') {
    const providerLabel = provider ? ` (${provider})` : '';
    return `Transaction refusée par l’opérateur${providerLabel}. Vérifiez que le numéro est actif, que votre solde est suffisant, ou essayez en CDF / Carte Bancaire.`;
  }
  return `Erreur passerelle MaishaPay (${httpStatus})`;
}

async function createHostedCheckoutFallback(params: {
  gatewayMode: string;
  publicApiKey: string;
  secretApiKey: string;
  txRef: string;
  amount: string;
  currency: string;
  callbackUrl: string;
}): Promise<string | undefined> {
  try {
    const form = new URLSearchParams();
    form.set('gatewayMode', params.gatewayMode);
    form.set('publicApiKey', params.publicApiKey);
    form.set('secretApiKey', params.secretApiKey);
    form.set('transactionReference', params.txRef);
    form.set('montant', params.amount);
    form.set('devise', params.currency);
    form.set('callbackUrl', params.callbackUrl);

    const resp = await fetch(`${MAISHAPAY_BASE_URL}/payment/vers1.0/merchant/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'text/html,application/xhtml+xml,application/json',
      },
      body: form.toString(),
      redirect: 'manual',
    });

    const location = resp.headers.get('location')?.trim();
    if (!location) return undefined;

    const resolved = location.startsWith('http')
      ? location
      : `${MAISHAPAY_BASE_URL}${location.startsWith('/') ? '' : '/'}${location}`;

    if (/\/checkout\/errors?\b/i.test(resolved)) {
      return undefined;
    }
    if (/^https:\/\//i.test(resolved)) {
      return resolved;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

async function tryV1MobileMoneyFallback(params: {
  gatewayMode: string;
  publicApiKey: string;
  secretApiKey: string;
  txRef: string;
  amount: number;
  currency: string;
  customerFullName: string;
  customerPhoneNumber: string;
  customerEmail: string;
  provider: string;
  callbackUrl: string;
}): Promise<Record<string, unknown> | null> {
  try {
    const resp = await fetch(`${MAISHAPAY_BASE_URL}/api/payment/rest/vers1.0/merchant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        gatewayMode: Number(params.gatewayMode) === 0 ? 0 : 1,
        publicApiKey: params.publicApiKey,
        secretApiKey: params.secretApiKey,
        transactionReference: params.txRef,
        amount: params.amount,
        currency: params.currency,
        customerFullName: params.customerFullName,
        customerPhoneNumber: params.customerPhoneNumber,
        customerEmailAddress: params.customerEmail,
        chanel: 'MOBILEMONEY',
        provider: params.provider,
        walletID: params.customerPhoneNumber,
        callbackUrl: params.callbackUrl,
      }),
    });

    const rawText = await resp.text();
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(rawText) as Record<string, unknown>;
    } catch {
      return null;
    }

    const data = unwrapGatewayData(parsed);
    const code = parseStatusCode(data, resp.status);
    const statusRaw = String(
      data.transactionStatus ||
        data.paymentStatus ||
        (typeof data.status === 'string' && !/^\d+$/.test(data.status.trim()) ? data.status : '') ||
        'PENDING'
    );
    const mapped = mapStatus(statusRaw);
    if (!resp.ok || code >= 400 || mapped === 'FAILED') {
      return null;
    }

    const paymentPageUrl =
      (typeof data.paymentPage === 'string' && data.paymentPage) ||
      (typeof data.redirectUrl === 'string' && data.redirectUrl) ||
      (typeof data.url === 'string' && data.url) ||
      undefined;

    return {
      transactionReference: params.txRef,
      channel: 'MOBILEMONEY',
      provider: params.provider,
      amount:
        params.currency === 'CDF'
          ? String(Math.round(params.amount))
          : params.amount.toFixed(2),
      currency: params.currency,
      customerPhoneNumber: params.customerPhoneNumber,
      status: mapped,
      originatingTransactionId:
        typeof data.originatingTransactionId === 'string'
          ? data.originatingTransactionId
          : typeof data.transactionId === 'string' || typeof data.transactionId === 'number'
          ? String(data.transactionId)
          : undefined,
      paymentPageUrl,
      gatewayMessage:
        (typeof data.transactionDescription === 'string' && data.transactionDescription) ||
        (typeof data.message === 'string' && data.message) ||
        'Demande USSD envoyée. Veuillez valider sur votre téléphone.',
      updatedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
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
    sendJson(req, res, 400, { error: 'Montant de paiement invalide.' });
    return;
  }

  const normalizedCurrency = (currency || 'USD').toUpperCase();
  if (normalizedCurrency !== 'USD' && normalizedCurrency !== 'CDF') {
    sendJson(req, res, 400, { error: 'Devise non supportée. Utilisez USD ou CDF.' });
    return;
  }

  const allowedProviders = new Set(['MPESA', 'AIRTEL', 'ORANGE', 'AFRICELL']);
  const normalizedProvider = (provider || '').toUpperCase();
  if (!allowedProviders.has(normalizedProvider)) {
    sendJson(req, res, 400, { error: 'Opérateur Mobile Money invalide.' });
    return;
  }

  if (!customerPhoneNumber || customerPhoneNumber.trim().length < 8) {
    sendJson(req, res, 400, { error: 'Numéro de téléphone Mobile Money invalide.' });
    return;
  }

  const txRef =
    transactionReference?.trim() || `MS-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const formattedPhone = normalizePhone(customerPhoneNumber.trim());
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
      channel: 'MOBILEMONEY',
      provider: normalizedProvider,
      walletID: formattedPhone,
      callbackUrl: resolveCallbackUrl(req),
    },
  };

  try {
    const response = await fetch(`${MAISHAPAY_BASE_URL}/api/collect/v2/store/mobileMoney`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });

    const rawText = await response.text();
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(rawText) as Record<string, unknown>;
    } catch {
      parsed = { rawMessage: rawText };
    }

    const data = unwrapGatewayData(parsed);
    const bodyStatusCode = parseStatusCode(data, response.status);

    const statusRaw = String(
      data.transactionStatus ||
        data.paymentStatus ||
        (typeof data.status === 'string' && !/^\d+$/.test(data.status.trim()) ? data.status : '') ||
        'PENDING'
    );
    const mappedGatewayStatus = mapStatus(statusRaw);

    if (!response.ok || bodyStatusCode >= 400) {
      const message = extractError(data, bodyStatusCode, normalizedProvider);
      const hasFieldErrors = Boolean(data.errors && typeof data.errors === 'object');
      if (mappedGatewayStatus === 'FAILED' && !hasFieldErrors) {
        const callbackUrl = resolveCallbackUrl(req);
        const v1Record = await tryV1MobileMoneyFallback({
          gatewayMode,
          publicApiKey,
          secretApiKey,
          txRef: `${txRef}-V1`,
          amount: Number(formattedAmount),
          currency: normalizedCurrency,
          customerFullName: (customerFullName || 'Client Maison Smash').slice(0, 80),
          customerPhoneNumber: formattedPhone,
          customerEmail: (customerEmail || 'client@maisonsmash.com').slice(0, 160),
          provider: normalizedProvider,
          callbackUrl,
        });
        if (v1Record) {
          sendJson(req, res, 200, v1Record);
          return;
        }

        const hostedFallbackUrl = await createHostedCheckoutFallback({
          gatewayMode,
          publicApiKey,
          secretApiKey,
          txRef: `${txRef}-CHK`,
          amount: formattedAmount,
          currency: normalizedCurrency,
          callbackUrl,
        });

        if (hostedFallbackUrl) {
          sendJson(req, res, 200, {
            transactionReference: `${txRef}-CHK`,
            channel: 'MOBILEMONEY',
            provider: normalizedProvider,
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
            paymentPageUrl: hostedFallbackUrl,
            gatewayMessage: `Le push USSD direct (${normalizedProvider}) n’a pas abouti. Finalisez votre paiement sur la page sécurisée MaishaPay.`,
            updatedAt: new Date().toISOString(),
          });
          return;
        }

        sendJson(req, res, 200, {
          transactionReference: txRef,
          channel: 'MOBILEMONEY',
          provider: normalizedProvider,
          amount: formattedAmount,
          currency: normalizedCurrency,
          customerPhoneNumber: formattedPhone,
          status: 'FAILED',
          originatingTransactionId:
            typeof data.originatingTransactionId === 'string'
              ? data.originatingTransactionId
              : typeof data.transactionId === 'string' || typeof data.transactionId === 'number'
              ? String(data.transactionId)
              : undefined,
          gatewayMessage: message,
          updatedAt: new Date().toISOString(),
        });
        return;
      }

      sendJson(req, res, bodyStatusCode >= 400 && bodyStatusCode < 600 ? bodyStatusCode : 502, {
        error: `[${normalizedProvider}] ${message}`,
        provider: normalizedProvider,
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
      channel: 'MOBILEMONEY',
      provider: normalizedProvider,
      amount: formattedAmount,
      currency: normalizedCurrency,
      customerPhoneNumber: formattedPhone,
      status: mapStatus(statusRaw),
      originatingTransactionId:
        typeof data.originatingTransactionId === 'string'
          ? data.originatingTransactionId
          : typeof data.transactionId === 'string' || typeof data.transactionId === 'number'
          ? String(data.transactionId)
          : undefined,
      paymentPageUrl,
      gatewayMessage:
        (typeof data.transactionDescription === 'string' && data.transactionDescription) ||
        (typeof data.message === 'string' && data.message) ||
        (paymentPageUrl
          ? 'Veuillez finaliser la validation Mobile Money sur la page sécurisée MaishaPay.'
          : 'Demande USSD envoyée. Veuillez valider sur votre téléphone.'),
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur réseau vers MaishaPay';
    sendJson(req, res, 502, {
      error: `Impossible de joindre la passerelle MaishaPay Live : ${message}`,
    });
  }
}
