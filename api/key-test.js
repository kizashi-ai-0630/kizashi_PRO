import { clientFromRequest, model, sendJson, setCors } from './_shared.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'METHOD_NOT_ALLOWED', message: 'POSTでアクセスしてください。' });
  const client = clientFromRequest(req);
  if (!client) return sendJson(res, 400, { error: 'OPENAI_API_KEY_NOT_SET', message: 'OpenAI APIキーを入力してください。' });
  try {
    await client.models.list();
    return sendJson(res, 200, { ok: true, connected: true, model });
  } catch (error) {
    const status = Number(error?.status || 500);
    const message = status === 401
      ? 'APIキーが無効です。入力内容を確認してください。'
      : status === 429
        ? 'OpenAI APIの利用上限または請求設定を確認してください。'
        : status === 403
          ? 'このAPIキーには必要な権限がありません。'
          : 'OpenAIへの接続を確認できませんでした。';
    return sendJson(res, status >= 400 && status < 600 ? status : 500, { error: 'OPENAI_KEY_TEST_FAILED', message });
  }
}
