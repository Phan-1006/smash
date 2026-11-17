import {
  processWebhookCallback,
  readJsonBody,
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
  const result = processWebhookCallback(body);
  sendVercelJson(req, res, result.statusCode, result.payload);
}
