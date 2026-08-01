const PREFIX = 'kizashi:analytics';

function redisConfig() {
  const url = String(process.env.UPSTASH_REDIS_REST_URL || '').trim().replace(/\/$/, '');
  const token = String(process.env.UPSTASH_REDIS_REST_TOKEN || '').trim();
  return { url, token, configured: Boolean(url && token) };
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
  if (!response.ok) throw new Error(`REDIS_HTTP_${response.status}`);
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
