import { isAdminRequest } from './_admin-auth.js';
import { analyticsKeys, analyticsStoreConfigured, normalizeEventName, normalizeProps, redisPipeline } from './_analytics-store.js';

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}
function isoDay(value = new Date()) { return value.toISOString().slice(0, 10); }

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'METHOD_NOT_ALLOWED' });
  if (!analyticsStoreConfigured()) return sendJson(res, 202, { ok: true, stored: false, reason: 'ANALYTICS_STORE_NOT_CONFIGURED' });

  const name = normalizeEventName(req.body?.name);
  if (!name) return sendJson(res, 400, { error: 'INVALID_EVENT' });

  const at = new Date();
  const day = isoDay(at);
  const visitorId = String(req.body?.visitorId || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100) || 'anonymous';
  const admin = isAdminRequest(req);
  const props = { ...normalizeProps(req.body?.props), admin };
  const keys = analyticsKeys(day);
  const recent = JSON.stringify({ name, props, visitorId, at: at.toISOString() });

  try {
    // Read the previous app-open count before incrementing. This lets us classify
    // first-time vs repeat users without counting refreshes as new users.
    let previousOpens = null;
    if (name === 'app_open') {
      const [value] = await redisPipeline([['HGET', keys.visitorOpens, visitorId]]);
      previousOpens = Number(value || 0);
    }

    const commands = [
      ['HINCRBY', keys.totals, name, 1],
      ['HINCRBY', keys.daily, name, 1],
      ['PFADD', keys.users, visitorId],
      ['PFADD', keys.dailyUsers, visitorId],
      ['PFADD', keys.eventUsers(name), visitorId],
      ['PFADD', keys.dailyEventUsers(name), visitorId],
      ['LPUSH', keys.recent, recent],
      ['LTRIM', keys.recent, 0, 199],
      ['EXPIRE', keys.daily, 34560000],
      ['EXPIRE', keys.dailyUsers, 34560000],
      ['EXPIRE', keys.dailyEventUsers(name), 34560000],
    ];

    // Split access counts into admin-authenticated vs external traffic.
    if (name === 'app_open') {
      commands.push(['HINCRBY', keys.totals, admin ? 'admin_app_open' : 'external_app_open', 1]);
      commands.push(['HINCRBY', keys.daily, admin ? 'admin_app_open' : 'external_app_open', 1]);
      commands.push(['HINCRBY', keys.visitorOpens, visitorId, 1]);
      if (previousOpens === 0) {
        commands.push(['PFADD', keys.dailyNewUsers, visitorId]);
        commands.push(['EXPIRE', keys.dailyNewUsers, 34560000]);
      } else {
        commands.push(['PFADD', keys.repeatUsers, visitorId]);
        commands.push(['PFADD', keys.dailyRepeatUsers, visitorId]);
        commands.push(['EXPIRE', keys.dailyRepeatUsers, 34560000]);
      }
    }

    await redisPipeline(commands);
    return sendJson(res, 200, { ok: true, stored: true, admin });
  } catch (error) {
    console.error('analytics-event', error);
    return sendJson(res, 202, { ok: true, stored: false, reason: 'ANALYTICS_STORE_ERROR' });
  }
}
