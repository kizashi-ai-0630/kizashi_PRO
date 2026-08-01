import { isAdminRequest } from './_admin-auth.js';
import { analyticsKeys, analyticsStoreStatus, redisPipeline } from './_analytics-store.js';

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

function growthScore(today = {}, yesterday = {}) {
  const delta = (key) => Math.max(0, Number(today[key] || 0) - Number(yesterday[key] || 0));
  const score =
    Math.min(30, Number(today.users || 0) * 10) +
    Math.min(20, delta('ai_chat') * 2) +
    Math.min(20, delta('vision_analysis') * 4) +
    Math.min(15, delta('share_open') * 5) +
    Math.min(15, delta('feedback_send') * 5);
  return Math.min(100, Math.round(score));
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'METHOD_NOT_ALLOWED' });
  if (!isAdminRequest(req)) return sendJson(res, 401, { error: 'ADMIN_AUTH_REQUIRED' });
  const store = analyticsStoreStatus();
  if (!store.configured) return sendJson(res, 200, { configured: false, source: '', totals: {}, users: 0, daily: [], recent: [], today: {}, yesterday: {}, deltas: {}, growthScore: 0 });

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
    const today = daily[daily.length - 1] || {};
    const yesterday = daily[daily.length - 2] || {};
    const tracked = ['users', 'app_open', 'ai_chat', 'vision_analysis', 'share_open', 'feedback_send', 'trade_file_upload', 'analysis_complete'];
    const deltas = Object.fromEntries(tracked.map((key) => [key, Number(today[key] || 0) - Number(yesterday[key] || 0)]));
    return sendJson(res, 200, { configured: true, source: store.source, totals, users, daily, recent, today, yesterday, deltas, growthScore: growthScore(today, yesterday) });
  } catch (error) {
    console.error('analytics-summary', error);
    return sendJson(res, 500, { error: 'ANALYTICS_SUMMARY_FAILED', message: '累計データを取得できませんでした。', detail: String(error?.message || '').slice(0, 180) });
  }
}
