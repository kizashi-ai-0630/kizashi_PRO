import { adminAuthConfigured, adminCookie, createAdminToken, verifyAdminPassword } from './_admin-auth.js';

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  if (!adminAuthConfigured()) return res.status(503).json({ error: 'ADMIN_AUTH_NOT_CONFIGURED', message: '管理者認証が未設定です。' });
  if (!verifyAdminPassword(req.body?.password)) return res.status(401).json({ error: 'INVALID_ADMIN_PASSWORD', message: '管理者パスワードが違います。' });
  res.setHeader('Set-Cookie', adminCookie(createAdminToken(), true));
  return res.json({ ok: true, authenticated: true });
}
