import { feedbackWebhookConfigured, sendFeedbackToDiscord } from './_feedback.js';

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return sendJson(res, 204, {});
  if (req.method === 'GET') return sendJson(res, 200, { ok: true, configured: feedbackWebhookConfigured() });
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'METHOD_NOT_ALLOWED', message: 'POSTで送信してください。' });

  try {
    const result = await sendFeedbackToDiscord(req.body || {});
    return sendJson(res, 200, result);
  } catch (error) {
    console.error('feedback', { code: error?.code, status: error?.status, message: error?.message });
    return sendJson(res, Number(error?.status || 500), {
      error: error?.code || 'FEEDBACK_SEND_FAILED',
      message: error?.message || 'フィードバックを送信できませんでした。',
    });
  }
}
