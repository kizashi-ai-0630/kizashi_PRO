import { clearAdminCookie } from './_admin-auth.js';

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  res.setHeader('Set-Cookie', clearAdminCookie(true));
  return res.json({ ok: true, authenticated: false });
}
