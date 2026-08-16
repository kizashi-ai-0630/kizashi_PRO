import { isAdminRequest } from './_admin-auth.js';
import { analyticsStoreStatus, redisPipeline } from './_analytics-store.js';

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'METHOD_NOT_ALLOWED' });
  if (!isAdminRequest(req)) return sendJson(res, 401, { error: 'ADMIN_AUTH_REQUIRED' });

  const store = analyticsStoreStatus();
  if (!store.configured) {
    return sendJson(res, 200, { connected: false, configured: false, source: '' });
  }

  try {
    const [pong] = await redisPipeline([['PING']]);
    return sendJson(res, 200, {
      connected: String(pong || '').toUpperCase() === 'PONG',
      configured: true,
      source: store.source,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    return sendJson(res, 200, {
      connected: false,
      configured: true,
      source: store.source,
      error: String(error?.message || '').slice(0, 160),
      checkedAt: new Date().toISOString(),
    });
  }
}
