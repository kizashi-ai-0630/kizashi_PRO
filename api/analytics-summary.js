import { isAdminRequest } from './_admin-auth.js';
import { analyticsKeys, analyticsStoreConfigured, redisPipeline } from './_analytics-store.js';

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

function dateKey(offset = 0) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - offset);
  return date.toISOString().slice(0, 10);
}

function hashToObject(value) {
  if (!Array.isArray(value)) return {};
  const output = {};
  for (let index = 0; index < value.length; index += 2) output[value[index]] = Number(value[index + 1] || 0);
  return output;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'METHOD_NOT_ALLOWED' });
  if (!isAdminRequest(req)) return sendJson(res, 401, { error: 'ADMIN_AUTH_REQUIRED' });
  if (!analyticsStoreConfigured()) return sendJson(res, 200, { configured: false, totals: {}, users: 0, daily: [], recent: [] });

  const days = Math.min(365, Math.max(7, Number(req.query?.days || 30)));
  const dateKeys = Array.from({ length: days }, (_, index) => dateKey(days - index - 1));
  const commands = [
    ['HGETALL', analyticsKeys(dateKeys[dateKeys.length - 1]).totals],
    ['PFCOUNT', analyticsKeys(dateKeys[dateKeys.length - 1]).users],
    ['LRANGE', analyticsKeys(dateKeys[dateKeys.length - 1]).recent, 0, 49],
  ];
  dateKeys.forEach((day) => {
    const keys = analyticsKeys(day);
    commands.push(['HGETALL', keys.daily], ['PFCOUNT', keys.dailyUsers]);
  });

  try {
    const results = await redisPipeline(commands);
    const totals = hashToObject(results[0]);
    const users = Number(results[1] || 0);
    const recent = Array.isArray(results[2]) ? results[2].map((item) => { try { return JSON.parse(item); } catch { return null; } }).filter(Boolean) : [];
    const daily = dateKeys.map((day, index) => ({
      day,
      users: Number(results[4 + index * 2] || 0),
      ...hashToObject(results[3 + index * 2]),
    }));
    return sendJson(res, 200, { configured: true, totals, users, daily, recent });
  } catch (error) {
    console.error('analytics-summary', error);
    return sendJson(res, 500, { error: 'ANALYTICS_SUMMARY_FAILED', message: '累計データを取得できませんでした。' });
  }
}
