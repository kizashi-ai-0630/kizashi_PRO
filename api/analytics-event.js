import { analyticsKeys, analyticsStoreConfigured, normalizeEventName, normalizeProps, redisPipeline } from './_analytics-store.js';

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

function isoDay(value = new Date()) {
  return value.toISOString().slice(0, 10);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'METHOD_NOT_ALLOWED' });
  if (!analyticsStoreConfigured()) return sendJson(res, 202, { ok: true, stored: false, reason: 'ANALYTICS_STORE_NOT_CONFIGURED' });

  const name = normalizeEventName(req.body?.name);
  if (!name) return sendJson(res, 400, { error: 'INVALID_EVENT' });

  const at = new Date();
  const day = isoDay(at);
  const visitorId = String(req.body?.visitorId || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100) || 'anonymous';
  const props = normalizeProps(req.body?.props);
  const keys = analyticsKeys(day);
  const recent = JSON.stringify({ name, props, at: at.toISOString() });

  try {
    await redisPipeline([
      ['HINCRBY', keys.totals, name, 1],
      ['HINCRBY', keys.daily, name, 1],
      ['PFADD', keys.users, visitorId],
      ['PFADD', keys.dailyUsers, visitorId],
      ['LPUSH', keys.recent, recent],
      ['LTRIM', keys.recent, 0, 199],
      ['EXPIRE', keys.daily, 34560000],
      ['EXPIRE', keys.dailyUsers, 34560000],
    ]);
    return sendJson(res, 200, { ok: true, stored: true });
  } catch (error) {
    console.error('analytics-event', error);
    return sendJson(res, 202, { ok: true, stored: false, reason: 'ANALYTICS_STORE_ERROR' });
  }
}
