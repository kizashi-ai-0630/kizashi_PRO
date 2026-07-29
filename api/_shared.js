import OpenAI from 'openai';

export const model = process.env.OPENAI_MODEL || process.env.MODEL || 'gpt-5-mini';
const fallbackApiKey = process.env.OPENAI_API_KEY || '';
const VALID_ROUTES = new Set(['chat', 'analysis', 'strategy', 'vision', 'memory', 'risk']);

export function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,X-OpenAI-API-Key');
}

export function apiKeyFromRequest(req) {
  const raw = req.headers?.['x-openai-api-key'];
  const header = String(Array.isArray(raw) ? raw[0] : raw || '').trim();
  return header || fallbackApiKey;
}

export function clientFromRequest(req) {
  const apiKey = apiKeyFromRequest(req);
  return apiKey ? new OpenAI({ apiKey }) : null;
}

export function sendJson(res, status, body) {
  setCors(res);
  return res.status(status).json(body);
}

export function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return {};
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const safeNumber = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;

export function normalizeRoute(value) {
  return VALID_ROUTES.has(value) ? value : 'analysis';
}

function compactContext(body = {}, route = 'analysis') {
  const { metrics = {}, diagnosis = {}, intelligence = {}, rows = [], memories = [], visionSummary = '' } = body;
  const includeStats = route !== 'chat';
  const includeTrades = ['analysis', 'strategy', 'risk', 'vision'].includes(route);
  const includeMemory = ['memory', 'risk', 'strategy', 'vision'].includes(route);
  const recentTrades = includeTrades && Array.isArray(rows)
    ? rows.slice(-20).map((row) => ({
        date: row.date, symbol: row.symbol, side: row.side, session: row.session,
        weekday: row.weekday, lot: safeNumber(row.lot), profit: safeNumber(row.profit)
      }))
    : [];

  return {
    route,
    summary: includeStats ? {
      trades: safeNumber(metrics.count), netProfit: safeNumber(metrics.netProfit),
      winRate: safeNumber(metrics.winRate), profitFactor: safeNumber(metrics.pf),
      expectancy: safeNumber(metrics.expectancy), averageWin: safeNumber(metrics.avgWin),
      averageLoss: safeNumber(metrics.avgLoss), maxDrawdown: safeNumber(metrics.maxDrawdown),
      maxWinStreak: safeNumber(metrics.maxWinStreak), maxLossStreak: safeNumber(metrics.maxLossStreak)
    } : undefined,
    diagnosis: includeStats ? {
      riskScore: safeNumber(diagnosis.riskScore), bestSession: diagnosis.bestSession,
      worstSession: diagnosis.worstSession, bestSymbol: diagnosis.bestSymbol,
      worstSymbol: diagnosis.worstSymbol, maxTrades: diagnosis.maxTrades, lotPolicy: diagnosis.lotPolicy
    } : undefined,
    intelligence: includeStats ? {
      score: safeNumber(intelligence.score), confidence: safeNumber(intelligence.confidence),
      traderType: intelligence.traderType?.name, headline: intelligence.headline,
      strengths: intelligence.strengths?.slice(0, 3), weaknesses: intelligence.weaknesses?.slice(0, 3),
      alerts: intelligence.alerts?.slice(0, 3), missions: intelligence.missions?.slice(0, 3)
    } : undefined,
    recentTrades,
    memories: includeMemory && Array.isArray(memories)
      ? memories.slice(-8).map((x) => ({
          date: String(x?.date || ''), type: String(x?.type || 'note'), text: String(x?.text || '').slice(0, 350)
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

export const instructions = `あなたはKIZASHI AI「ぴー」、みずぴ専属のFXトレードコーチです。
自然で親しみのある日本語で会話してください。雑談は1〜3文で短く、無理にFXへ結び付けません。分析・作戦相談は必要な根拠だけを使い、結論を先に伝えます。
提供されたJSONと画像だけを根拠にしてください。存在しない数字、価格、過去の出来事は作らないでください。データ不足なら断定せず、必要な情報を一つだけ聞いてください。
利益を保証せず、過大ロット、損失の取り返し、無制限ナンピンを勧めません。エントリー相談では「入る条件」「見送る条件」「損失上限」を具体的に分けます。
画像がある場合は、見える範囲で①相場環境 ②重要価格帯 ③買い条件 ④売り条件 ⑤見送り条件 ⑥リスク管理の順に分析してください。
過去メモリーやVision要約がある場合は、関連するときだけ自然に一度触れてください。
最後は、今すぐ実行できる提案を一つだけ添えてください。`;

export function buildInput(reqBody, route, image) {
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
    ? [{ type: 'input_text', text: `${contextText}\n\n添付チャート画像を分析してください。` }, { type: 'input_image', image_url: image.dataUrl, detail: 'high' }]
    : contextText;
  return [...history, { role: 'user', content: userContent }];
}

export function isTransient(error) {
  const status = Number(error?.status || 0);
  return [408, 409, 429, 500, 502, 503, 504].includes(status) || /timeout|temporar|overloaded|gateway/i.test(String(error?.message || ''));
}

export async function createWithRetry(client, baseRequest) {
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
    }
  }
  throw lastError;
}
