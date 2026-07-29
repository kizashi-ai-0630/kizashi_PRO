import {
  buildInput, clientFromRequest, createWithRetry, extractResponseText,
  instructions, isTransient, model, normalizeRoute, parseBody, sendJson, setCors
} from './_shared.js';

export const config = { api: { bodyParser: { sizeLimit: '14mb' } } };

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'METHOD_NOT_ALLOWED', message: 'POSTでアクセスしてください。' });

  const client = clientFromRequest(req);
  if (!client) return sendJson(res, 503, { error: 'OPENAI_API_KEY_NOT_SET', message: 'OpenAI APIキーを管理画面で設定してください。' });

  const body = parseBody(req);
  const message = String(body?.message || '').trim();
  if (!message) return sendJson(res, 400, { error: 'EMPTY_MESSAGE', message: '質問を入力してください。' });

  const route = normalizeRoute(body?.route);
  const image = route === 'vision' && body?.image && typeof body.image.dataUrl === 'string' ? body.image : null;
  const input = buildInput(body, route, image);

  try {
    const request = { model, instructions, input, max_output_tokens: route === 'chat' ? 700 : 2300 };
    if (/^gpt-5/i.test(model)) request.reasoning = { effort: 'low' };
    let response = await createWithRetry(client, request);
    let answer = extractResponseText(response);
    if (!answer) {
      response = await createWithRetry(client, {
        ...request,
        max_output_tokens: Math.max(2600, request.max_output_tokens),
        instructions: `${instructions}\n必ず日本語の本文を返してください。`
      });
      answer = extractResponseText(response);
    }
    if (!answer) return sendJson(res, 502, { error: 'EMPTY_AI_RESPONSE', message: 'AIの返答を取得できませんでした。少し待って再送してください。' });
    return sendJson(res, 200, { answer, responseId: response.id, model, status: response.status, route, retried: false });
  } catch (error) {
    const status = Number(error?.status || 500);
    const friendly = status === 401
      ? 'APIキーが無効です。管理画面で入力内容を確認してください。'
      : status === 429
        ? 'OpenAI APIの利用上限または請求設定を確認してください。'
        : isTransient(error)
          ? '通信が一時的に不安定です。少し待って再送してください。'
          : error?.message || 'AIへの接続に失敗しました。';
    return sendJson(res, status >= 400 && status < 600 ? status : 500, { error: 'OPENAI_REQUEST_FAILED', message: friendly });
  }
}
