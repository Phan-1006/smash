import {
  processMobileMoneyPayment,
  readJsonBody,
  resolveCallbackUrlFromHeaders,
  sendVercelJson,
  type VercelReq,
  type VercelRes,
} from '../../../lib/maishapay';

export default async function handler(req: VercelReq, res: VercelRes) {
  if (req.method === 'OPTIONS') {
    sendVercelJson(req, res, 204, {});
    return;
  }
  if (req.method !== 'POST') {
    sendVercelJson(req, res, 405, { error: 'Méthode non autorisée.' });
    return;
  }
  const body = await readJsonBody(req);
  const callbackUrl = resolveCallbackUrlFromHeaders(req.headers, 'https');
  const result = await processMobileMoneyPayment(body, callbackUrl);
  sendVercelJson(req, res, result.statusCode, result.payload);
}
