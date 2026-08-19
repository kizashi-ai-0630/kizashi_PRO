const PREFIX = 'kizashi:analytics';

function firstEnv(...names) {
  for (const name of names) {
    const value = String(process.env[name] || '').trim();
    if (value) return { name, value };
  }
  return { name: '', value: '' };
}

function redisConfig() {
  // Upstash integration can expose either the native names or Vercel KV names.
  // Vercel's Upstash integration currently exposes KV_REST_API_URL /
  // KV_REST_API_TOKEN. Native Upstash env names are also supported.
  // Do not use KV_URL/REDIS_URL here because those are Redis protocol URLs,
  // while this module talks to the Upstash REST /pipeline endpoint.
  const urlEnv = firstEnv('KV_REST_API_URL', 'UPSTASH_REDIS_REST_URL');
  const tokenEnv = firstEnv('KV_REST_API_TOKEN', 'UPSTASH_REDIS_REST_TOKEN');
  const url = urlEnv.value.replace(/\/$/, '');
  const token = tokenEnv.value;
  return {
    url,
    token,
    configured: Boolean(url && token),
    source: urlEnv.name && tokenEnv.name ? `${urlEnv.name} / ${tokenEnv.name}` : '',
  };
}

export function analyticsStoreStatus() {
  const config = redisConfig();
  return { configured: config.configured, source: config.source };
}

export function analyticsStoreConfigured() {
  return redisConfig().configured;
}

export async function redisPipeline(commands) {
  const { url, token, configured } = redisConfig();
  if (!configured) throw new Error('ANALYTICS_STORE_NOT_CONFIGURED');
  const response = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`REDIS_HTTP_${response.status}:${detail.slice(0, 120)}`);
  }
  const payload = await response.json();
  return Array.isArray(payload) ? payload.map((item) => item?.result) : [];
}

export function analyticsKeys(day) {
  return {
    totals: `${PREFIX}:totals`,
    users: `${PREFIX}:users`,
    daily: `${PREFIX}:day:${day}`,
    dailyUsers: `${PREFIX}:day:${day}:users`,
    recent: `${PREFIX}:recent`,
    visitorOpens: `${PREFIX}:visitor-opens`,
    repeatUsers: `${PREFIX}:repeat-users`,
    dailyRepeatUsers: `${PREFIX}:day:${day}:repeat-users`,
    dailyNewUsers: `${PREFIX}:day:${day}:new-users`,
    eventUsers: (event) => `${PREFIX}:event:${event}:users`,
    dailyEventUsers: (event) => `${PREFIX}:day:${day}:event:${event}:users`,
  };
}

export function normalizeEventName(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9_:-]/g, '').slice(0, 64);
}

export function normalizeProps(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).slice(0, 20).map(([key, item]) => [
    String(key).slice(0, 50),
    typeof item === 'number' || typeof item === 'boolean' ? item : String(item ?? '').slice(0, 180),
  ]));
}
