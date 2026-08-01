import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import { adminAuthConfigured, adminCookie, clearAdminCookie, createAdminToken, isAdminRequest, verifyAdminPassword } from '../api/_admin-auth.js';
import { feedbackWebhookConfigured, sendFeedbackToDiscord } from '../api/_feedback.js';

const app = express();
const port = Number(process.env.PORT || 8787);
const model = process.env.OPENAI_MODEL || process.env.MODEL || 'gpt-5-mini';
const fallbackApiKey = process.env.OPENAI_API_KEY || '';

function apiKeyFromRequest(req) {
  const header = String(req.get('X-OpenAI-API-Key') || '').trim();
  return header || fallbackApiKey;
}

function clientFromRequest(req) {
  const apiKey = apiKeyFromRequest(req);
  return apiKey ? new OpenAI({ apiKey }) : null;
}

app.use(cors());
app.use(express.json({ limit: '14mb' }));


app.get('/api/admin-session', (req, res) => {
  res.json({ configured: adminAuthConfigured(), authenticated: isAdminRequest(req) });
});

app.post('/api/admin-login', (req, res) => {
  if (!adminAuthConfigured()) return res.status(503).json({ error: 'ADMIN_AUTH_NOT_CONFIGURED', message: '管理者認証が未設定です。' });
  if (!verifyAdminPassword(req.body?.password)) return res.status(401).json({ error: 'INVALID_ADMIN_PASSWORD', message: '管理者パスワードが違います。' });
  res.setHeader('Set-Cookie', adminCookie(createAdminToken(), false));
  return res.json({ ok: true, authenticated: true });
});

app.post('/api/admin-logout', (req, res) => {
  res.setHeader('Set-Cookie', clearAdminCookie(false));
  return res.json({ ok: true, authenticated: false });
});

app.get('/api/feedback', (req, res) => {
  res.json({ ok: true, configured: feedbackWebhookConfigured() });
});

app.post('/api/feedback', async (req, res) => {
  try {
    const result = await sendFeedbackToDiscord(req.body || {});
    return res.json(result);
  } catch (error) {
    console.error('feedback', { code: error?.code, status: error?.status, message: error?.message });
    return res.status(Number(error?.status || 500)).json({
      error: error?.code || 'FEEDBACK_SEND_FAILED',
      message: error?.message || 'フィードバックを送信できませんでした。',
    });
  }
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const safeNumber = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
const VALID_ROUTES = new Set(['chat', 'analysis', 'strategy', 'vision', 'memory', 'risk']);

function normalizeRoute(value) {
  return VALID_ROUTES.has(value) ? value : 'analysis';
}

function compactContext(body = {}, route = 'analysis') {
  const { metrics = {}, diagnosis = {}, intelligence = {}, rows = [], memories = [], visionSummary = '' } = body;
  const includeStats = route !== 'chat';
  const includeTrades = ['analysis', 'strategy', 'risk', 'vision'].includes(route);
  const includeMemory = ['memory', 'risk', 'strategy', 'vision'].includes(route);

  const recentTrades = includeTrades && Array.isArray(rows)
    ? rows.slice(-20).map((row) => ({
        date: row.date,
        symbol: row.symbol,
        side: row.side,
        session: row.session,
        weekday: row.weekday,
        lot: safeNumber(row.lot),
        profit: safeNumber(row.profit)
      }))
    : [];

  return {
    route,
    summary: includeStats ? {
      trades: safeNumber(metrics.count),
      netProfit: safeNumber(metrics.netProfit),
      winRate: safeNumber(metrics.winRate),
      profitFactor: safeNumber(metrics.pf),
      expectancy: safeNumber(metrics.expectancy),
      averageWin: safeNumber(metrics.avgWin),
      averageLoss: safeNumber(metrics.avgLoss),
      maxDrawdown: safeNumber(metrics.maxDrawdown),
      maxWinStreak: safeNumber(metrics.maxWinStreak),
      maxLossStreak: safeNumber(metrics.maxLossStreak)
    } : undefined,
    diagnosis: includeStats ? {
      riskScore: safeNumber(diagnosis.riskScore),
      bestSession: diagnosis.bestSession,
      worstSession: diagnosis.worstSession,
      bestSymbol: diagnosis.bestSymbol,
      worstSymbol: diagnosis.worstSymbol,
      maxTrades: diagnosis.maxTrades,
      lotPolicy: diagnosis.lotPolicy
    } : undefined,
    intelligence: includeStats ? {
      score: safeNumber(intelligence.score),
      confidence: safeNumber(intelligence.confidence),
      traderType: intelligence.traderType?.name,
      headline: intelligence.headline,
      strengths: intelligence.strengths?.slice(0, 3),
      weaknesses: intelligence.weaknesses?.slice(0, 3),
      alerts: intelligence.alerts?.slice(0, 3),
      missions: intelligence.missions?.slice(0, 3)
    } : undefined,
    recentTrades,
    memories: includeMemory && Array.isArray(memories)
      ? memories.slice(-8).map((x) => ({
          date: String(x?.date || ''),
          type: String(x?.type || 'note'),
          text: String(x?.text || '').slice(0, 350)
        })).filter((x) => x.text)
      : [],
    visionSummary: visionSummary ? String(visionSummary).slice(0, 5000) : undefined
  };
}

export function extractResponseText(response) {
  if (!response) return '';
  if (typeof response.output_text === 'string' && response.output_text.trim()) return response.output_text.trim();
  const chunks = [];
  for (const item of Array.isArray(response.output) ? response.output : []) {
    if (typeof item?.text === 'string') chunks.push(item.text);
    for (const content of Array.isArray(item?.content) ? item.content : []) {
      if (typeof content?.text === 'string') chunks.push(content.text);
      if (typeof content?.text?.value === 'string') chunks.push(content.text.value);
      if (typeof content?.value === 'string') chunks.push(content.value);
    }
  }
  return chunks.join('\n').trim();
}

const instructions = `あなたはKIZASHI AI「ぴー」、みずぴ専属のFXトレードコーチです。
自然で親しみのある日本語で会話してください。雑談は1〜3文で短く、無理にFXへ結び付けません。分析・作戦相談は必要な根拠だけを使い、結論を先に伝えます。
提供されたJSONと画像だけを根拠にしてください。存在しない数字、価格、過去の出来事は作らないでください。データ不足なら断定せず、必要な情報を一つだけ聞いてください。
利益を保証せず、過大ロット、損失の取り返し、無制限ナンピンを勧めません。エントリー相談では「入る条件」「見送る条件」「損失上限」を具体的に分けます。
画像がある場合は、見える範囲で①相場環境 ②重要価格帯 ③買い条件 ④売り条件 ⑤見送り条件 ⑥リスク管理の順に分析してください。
過去メモリーやVision要約がある場合は、関連するときだけ自然に一度触れてください。
最後は、今すぐ実行できる提案を一つだけ添えてください。`;

function buildInput(reqBody, route, image) {
  const historyLimit = route === 'chat' ? 8 : 10;
  const history = Array.isArray(reqBody?.history)
    ? reqBody.history.slice(-historyLimit).map((item) => ({
        role: item.role === 'assistant' || item.role === 'ai' ? 'assistant' : 'user',
        content: String(item.content || item.text || '').slice(0, route === 'chat' ? 1200 : 2200)
      })).filter((item) => item.content)
    : [];

  const context = compactContext(reqBody, route);
  const message = String(reqBody?.message || '').trim();
  const contextText = route === 'chat'
    ? `会話モード: 雑談\nみずぴの発言：${message}`
    : `会話モード: ${route}\n利用可能なKIZASHIデータ：${JSON.stringify(context)}\n\nみずぴの質問：${message}`;

  const userContent = image
    ? [
        { type: 'input_text', text: `${contextText}\n\n添付チャート画像を分析してください。` },
        { type: 'input_image', image_url: image.dataUrl, detail: 'high' }
      ]
    : contextText;

  return [...history, { role: 'user', content: userContent }];
}

function isTransient(error) {
  const status = Number(error?.status || 0);
  return [408, 409, 429, 500, 502, 503, 504].includes(status) || /timeout|temporar|overloaded|gateway/i.test(String(error?.message || ''));
}

async function createWithRetry(client, baseRequest) {
  const delays = [0, 900, 2200];
  let lastError;
  for (let attempt = 0; attempt < delays.length; attempt += 1) {
    if (delays[attempt]) await sleep(delays[attempt]);
    try {
      const request = { ...baseRequest };
      if (attempt > 0) request.max_output_tokens = Math.max(1800, baseRequest.max_output_tokens - 300);
      return await client.responses.create(request);
    } catch (error) {
      lastError = error;
      if (!isTransient(error) || attempt === delays.length - 1) throw error;
      console.warn(`OpenAI transient error. retry=${attempt + 1}`, error?.status, error?.message);
    }
  }
  throw lastError;
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, connected: Boolean(apiKeyFromRequest(req)), model, version: '9.12.0', mode: 'byok', features: ['smart-router', 'auto-retry', 'vision-cache', 'guardian', 'byok'] });
});

app.post('/api/key-test', async (req, res) => {
  const client = clientFromRequest(req);
  if (!client) return res.status(400).json({ error: 'OPENAI_API_KEY_NOT_SET', message: 'OpenAI APIキーを入力してください。' });
  try {
    await client.models.list();
    res.json({ ok: true, connected: true, model });
  } catch (error) {
    const status = Number(error?.status || 500);
    const message = status === 401 ? 'APIキーが無効です。入力内容を確認してください。' : status === 429 ? '利用上限または請求設定を確認してください。' : 'OpenAIへの接続を確認できませんでした。';
    res.status(status >= 400 && status < 600 ? status : 500).json({ error: 'OPENAI_KEY_TEST_FAILED', message });
  }
});

app.post('/api/coach', async (req, res) => {
  const client = clientFromRequest(req);
  if (!client) return res.status(503).json({ error: 'OPENAI_API_KEY_NOT_SET', message: 'OpenAI APIキーを管理画面で設定してください。' });

  const message = String(req.body?.message || '').trim();
  if (!message) return res.status(400).json({ error: 'EMPTY_MESSAGE', message: '質問を入力してください。' });

  const route = normalizeRoute(req.body?.route);
  const image = route === 'vision' && req.body?.image && typeof req.body.image.dataUrl === 'string' ? req.body.image : null;
  const input = buildInput(req.body, route, image);

  try {
    const request = { model, instructions, input, max_output_tokens: route === 'chat' ? 700 : 2300 };
    if (/^gpt-5/i.test(model)) request.reasoning = { effort: 'low' };

    let response = await createWithRetry(client, request);
    let answer = extractResponseText(response);

    if (!answer) {
      const retryRequest = {
        ...request,
        max_output_tokens: Math.max(2600, request.max_output_tokens),
        instructions: `${instructions}\n必ず日本語の本文を返してください。`
      };
      response = await createWithRetry(client, retryRequest);
      answer = extractResponseText(response);
    }

    if (!answer) {
      const reason = response?.incomplete_details?.reason || response?.status || 'unknown';
      console.error('Empty OpenAI response', { id: response?.id, status: response?.status, reason, route });
      return res.status(502).json({ error: 'EMPTY_AI_RESPONSE', message: 'AIの返答を取得できませんでした。少し待って再送してください。' });
    }

    res.json({ answer, responseId: response.id, model, status: response.status, route, retried: false });
  } catch (error) {
    console.error('OpenAI request failed:', { status: error?.status, message: error?.message, route });
    const status = Number(error?.status || 500);
    const friendly = status === 401
      ? 'APIキーが無効です。管理画面で入力内容を確認してください。'
      : status === 429
        ? 'AIが混み合っています。少し待ってからもう一度送ってください。'
        : isTransient(error)
          ? '通信が一時的に不安定です。少し待って再送してください。'
          : error?.message || 'AIへの接続に失敗しました。';
    res.status(status >= 400 && status < 600 ? status : 500).json({ error: 'OPENAI_REQUEST_FAILED', message: friendly });
  }
});

app.listen(port, () => {
  console.log(`KIZASHI AI 9.12 BYOK server: http://localhost:${port}`);
  console.log(fallbackApiKey ? `Fallback OpenAI key available (${model})` : 'BYOK mode: API key is supplied per request');
  console.log('Smart Router / Auto Retry / Vision Cache / Guardian enabled');
});
