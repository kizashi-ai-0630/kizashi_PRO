import { apiKeyFromRequest, model, sendJson, setCors } from './_shared.js';

export default function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'METHOD_NOT_ALLOWED', message: 'GETでアクセスしてください。' });
  return sendJson(res, 200, {
    ok: true,
    connected: Boolean(apiKeyFromRequest(req)),
    model,
    version: '9.18.1',
    mode: 'byok-vercel',
    features: ['smart-router', 'auto-retry', 'vision', 'guardian', 'byok']
  });
}
