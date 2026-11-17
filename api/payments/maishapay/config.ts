import {
  getGatewayConfigResult,
  sendVercelJson,
  type VercelReq,
  type VercelRes,
} from '../../../lib/maishapay';

export default function handler(req: VercelReq, res: VercelRes) {
  if (req.method === 'OPTIONS') {
    sendVercelJson(req, res, 204, {});
    return;
  }
  const result = getGatewayConfigResult();
  sendVercelJson(req, res, result.statusCode, result.payload);
}
