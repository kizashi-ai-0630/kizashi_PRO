import { isAdminRequest } from './_admin-auth.js';
import { analyticsKeys, analyticsStoreStatus, redisPipeline } from './_analytics-store.js';

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}
function dateKey(offset = 0) { const date = new Date(); date.setUTCDate(date.getUTCDate() - offset); return date.toISOString().slice(0, 10); }
function hashToObject(value) {
  if (!Array.isArray(value)) return {};
  const output = {};
  for (let index = 0; index < value.length; index += 2) output[value[index]] = Number(value[index + 1] || 0);
  return output;
}

const UNIQUE_EVENTS = ['app_open','live_open','guardian_open','ai_chat','vision_analysis','share_open','feedback_send'];

function growthScore(today = {}) {
  const score =
    Math.min(30, Number(today.new_users || 0) * 12) +
    Math.min(20, Number(today.ai_chat_users || 0) * 4) +
    Math.min(20, Number(today.vision_analysis_users || 0) * 7) +
    Math.min(15, Number(today.share_open_users || 0) * 5) +
    Math.min(15, Number(today.feedback_send_users || 0) * 8);
  return Math.min(100, Math.round(score));
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'METHOD_NOT_ALLOWED' });
  if (!isAdminRequest(req)) return sendJson(res, 401, { error: 'ADMIN_AUTH_REQUIRED' });
  const store = analyticsStoreStatus();
  if (!store.configured) return sendJson(res, 200, { configured:false, source:'', totals:{}, users:0, repeatUsers:0, unique:{}, access:{}, daily:[], recent:[], today:{}, yesterday:{}, deltas:{}, growthScore:0 });

  const days = Math.min(365, Math.max(7, Number(req.query?.days || 30)));
  const dateKeys = Array.from({ length: days }, (_, index) => dateKey(days - index - 1));
  const latestKeys = analyticsKeys(dateKeys[dateKeys.length - 1]);
  const commands = [
    ['HGETALL', latestKeys.totals],
    ['PFCOUNT', latestKeys.users],
    ['PFCOUNT', latestKeys.repeatUsers],
    ['LRANGE', latestKeys.recent, 0, 49],
    ...UNIQUE_EVENTS.map(event => ['PFCOUNT', latestKeys.eventUsers(event)]),
  ];

  dateKeys.forEach(day => {
    const keys = analyticsKeys(day);
    commands.push(['HGETALL', keys.daily]);
    commands.push(['PFCOUNT', keys.dailyUsers]);
    commands.push(['PFCOUNT', keys.dailyNewUsers]);
    commands.push(['PFCOUNT', keys.dailyRepeatUsers]);
    UNIQUE_EVENTS.forEach(event => commands.push(['PFCOUNT', keys.dailyEventUsers(event)]));
  });

  try {
    const results = await redisPipeline(commands);
    let cursor = 0;
    const totals = hashToObject(results[cursor++]);
    const users = Number(results[cursor++] || 0);
    const repeatUsers = Number(results[cursor++] || 0);
    const recentRaw = results[cursor++];
    const recent = Array.isArray(recentRaw) ? recentRaw.map(item => { try { return JSON.parse(item); } catch { return null; } }).filter(Boolean) : [];
    const unique = {};
    UNIQUE_EVENTS.forEach(event => { unique[event] = Number(results[cursor++] || 0); });

    const daily = dateKeys.map(day => {
      const raw = hashToObject(results[cursor++]);
      const row = {
        day,
        users: Number(results[cursor++] || 0),
        new_users: Number(results[cursor++] || 0),
        repeat_users: Number(results[cursor++] || 0),
        ...raw,
      };
      UNIQUE_EVENTS.forEach(event => { row[`${event}_users`] = Number(results[cursor++] || 0); });
      return row;
    });

    const today = daily[daily.length - 1] || {};
    const yesterday = daily[daily.length - 2] || {};
    const deltaKeys = ['users','new_users','repeat_users','live_open_users','guardian_open_users','ai_chat_users','vision_analysis_users','share_open_users','feedback_send_users'];
    const deltas = Object.fromEntries(deltaKeys.map(key => [key, Number(today[key] || 0) - Number(yesterday[key] || 0)]));
    const adminAccess = Number(totals.admin_app_open || 0);
    const externalAccess = Number(totals.external_app_open || 0);
    const access = {
      total: adminAccess + externalAccess,
      admin: adminAccess,
      external: externalAccess,
      legacyTotal: Number(totals.app_open || 0),
    };

    return sendJson(res, 200, {
      configured:true,
      source:store.source,
      totals,
      users,
      repeatUsers,
      unique,
      access,
      daily,
      recent,
      today,
      yesterday,
      deltas,
      growthScore:growthScore(today),
      uniqueTrackingStarted:true,
    });
  } catch (error) {
    console.error('analytics-summary', error);
    return sendJson(res, 500, { error:'ANALYTICS_SUMMARY_FAILED', message:'累計データを取得できませんでした。', detail:String(error?.message || '').slice(0,180) });
  }
}
