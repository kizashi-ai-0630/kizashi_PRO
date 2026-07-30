import crypto from 'node:crypto';

const COOKIE_NAME = 'kizashi_admin_session';
const TTL_SECONDS = 60 * 60 * 12;

function secret() {
  return String(process.env.ADMIN_SESSION_SECRET || '').trim();
}

function configuredPassword() {
  return String(process.env.ADMIN_PASSWORD || '').trim();
}

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

function sign(payload) {
  const key = secret();
  if (!key) return '';
  return crypto.createHmac('sha256', key).update(payload).digest('base64url');
}

function timingSafeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export function adminAuthConfigured() {
  return Boolean(secret() && configuredPassword());
}

export function verifyAdminPassword(input) {
  const expected = configuredPassword();
  return Boolean(expected) && timingSafeEqual(String(input || ''), expected);
}

export function createAdminToken() {
  const payload = base64url(JSON.stringify({ role: 'admin', exp: Math.floor(Date.now() / 1000) + TTL_SECONDS }));
  return `${payload}.${sign(payload)}`;
}

export function verifyAdminToken(token) {
  if (!token || !secret()) return false;
  const [payload, signature] = String(token).split('.');
  if (!payload || !signature || !timingSafeEqual(signature, sign(payload))) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return data?.role === 'admin' && Number(data?.exp) > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export function parseCookies(req) {
  const header = String(req.headers?.cookie || '');
  return Object.fromEntries(header.split(';').map((part) => part.trim()).filter(Boolean).map((part) => {
    const index = part.indexOf('=');
    return index < 0 ? [part, ''] : [decodeURIComponent(part.slice(0, index)), decodeURIComponent(part.slice(index + 1))];
  }));
}

export function isAdminRequest(req) {
  return verifyAdminToken(parseCookies(req)[COOKIE_NAME]);
}

export function adminCookie(token, secure = true) {
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${TTL_SECONDS}${secure ? '; Secure' : ''}`;
}

export function clearAdminCookie(secure = true) {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure ? '; Secure' : ''}`;
}
