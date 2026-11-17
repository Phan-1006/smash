import {
  checkTransactionStatus,
  sendVercelJson,
  type VercelReq,
  type VercelRes,
} from '../../../../lib/maishapay';

export default async function handler(req: VercelReq, res: VercelRes) {
  if (req.method === 'OPTIONS') {
    sendVercelJson(req, res, 204, {});
    return;
  }
  const rawQueryRef = req.query?.reference;
  let reference = Array.isArray(rawQueryRef) ? rawQueryRef[0] : rawQueryRef;
  if (!reference && req.url) {
    const pathname = req.url.split('?')[0];
    const segments = pathname.split('/').filter(Boolean);
    reference = decodeURIComponent(segments[segments.length - 1] || '');
  }
  const result = await checkTransactionStatus(reference || '');
  sendVercelJson(req, res, result.statusCode, result.payload);
}
