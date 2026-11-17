import type { IncomingMessage, ServerResponse } from 'node:http';

const MAISHAPAY_BASE_URL = 'https://marchand.maishapay.online';

const ALLOWED_ORIGINS = new Set<string>([
  'https://smash-flame.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]);

type VercelIncoming = IncomingMessage & {
  query?: Record<string, string | string[] | undefined>;
};

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

function mapStatus(raw: string): 'PENDING' | 'PAID' | 'FAILED' {
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

export default async function handler(req: VercelIncoming, res: ServerResponse): Promise<void> {
  if (req.method === 'OPTIONS') {
    sendJson(req, res, 204, {});
    return;
  }

  const rawQueryRef = req.query?.reference;
  let reference = Array.isArray(rawQueryRef) ? rawQueryRef[0] : rawQueryRef;
  if (!reference && req.url) {
    const pathname = req.url.split('?')[0];
    const segments = pathname.split('/').filter(Boolean);
    reference = decodeURIComponent(segments[segments.length - 1] || '');
  }

  const ref = (reference || '').trim();
  if (!ref) {
    sendJson(req, res, 400, { error: 'Référence de transaction manquante.' });
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

  if (configured) {
    try {
      const checkResp = await fetch(`${MAISHAPAY_BASE_URL}/api/transaction/rest/v2/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          gatewayMode,
          publicApiKey,
          secretApiKey,
          transactionReference: ref,
        }),
      });
      if (checkResp.ok) {
        const checkData = (await checkResp.json()) as Record<string, unknown>;
        const remoteRaw = String(checkData.transactionStatus || checkData.status || '');
        if (remoteRaw) {
          const remoteMapped = mapStatus(remoteRaw);
          const remoteMsg =
            (typeof checkData.transactionDescription === 'string' &&
              checkData.transactionDescription) ||
            (typeof checkData.message === 'string' && checkData.message) ||
            undefined;
          sendJson(req, res, 200, {
            transactionReference: ref,
            status: remoteMapped,
            gatewayMessage: remoteMsg,
            updatedAt: new Date().toISOString(),
          });
          return;
        }
      }
    } catch {
      // Fall back to pending if remote check errors transiently
    }
  }

  sendJson(req, res, 200, {
    transactionReference: ref,
    status: 'PENDING',
    updatedAt: new Date().toISOString(),
  });
}
