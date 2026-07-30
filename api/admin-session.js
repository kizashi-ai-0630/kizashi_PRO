import { adminAuthConfigured, isAdminRequest } from './_admin-auth.js';

export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  return res.json({ configured: adminAuthConfigured(), authenticated: isAdminRequest(req) });
}
