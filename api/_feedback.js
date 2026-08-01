const CATEGORY_COLORS = {
  '不具合': 0xE74C3C,
  '改善提案': 0x3498DB,
  '欲しい機能': 0x9B59B6,
  'その他': 0x7F8C8D,
};

const ALLOWED_CATEGORIES = new Set(Object.keys(CATEGORY_COLORS));

function cleanText(value, maxLength) {
  return String(value || '').replace(/\u0000/g, '').trim().slice(0, maxLength);
}

export function normalizeFeedback(payload = {}) {
  const category = ALLOWED_CATEGORIES.has(payload.category) ? payload.category : 'その他';
  const message = cleanText(payload.message, 1800);
  const page = cleanText(payload.page, 180) || '#home';
  const userAgent = cleanText(payload.userAgent, 500) || 'unknown';
  const appVersion = cleanText(payload.appVersion, 80) || 'KIZASHI β';
  const visitorId = cleanText(payload.visitorId, 100) || 'anonymous';

  if (message.length < 5) {
    const error = new Error('内容を5文字以上入力してください。');
    error.code = 'FEEDBACK_TOO_SHORT';
    error.status = 400;
    throw error;
  }

  return { category, message, page, userAgent, appVersion, visitorId };
}

export function feedbackWebhookConfigured() {
  return Boolean(String(process.env.DISCORD_FEEDBACK_WEBHOOK_URL || '').trim());
}

export async function sendFeedbackToDiscord(payload) {
  const webhookUrl = String(process.env.DISCORD_FEEDBACK_WEBHOOK_URL || '').trim();
  if (!webhookUrl) {
    const error = new Error('Discordのフィードバック送信先が未設定です。');
    error.code = 'DISCORD_WEBHOOK_NOT_CONFIGURED';
    error.status = 503;
    throw error;
  }

  const data = normalizeFeedback(payload);
  const now = new Date();
  const discordPayload = {
    username: 'KIZASHI Feedback',
    allowed_mentions: { parse: [] },
    embeds: [{
      title: `💬 ${data.category}｜KIZASHI β`,
      description: data.message,
      color: CATEGORY_COLORS[data.category],
      fields: [
        { name: '画面', value: `\`${data.page}\``, inline: true },
        { name: 'バージョン', value: data.appVersion, inline: true },
        { name: '利用者ID', value: `\`${data.visitorId}\``, inline: false },
        { name: '端末', value: data.userAgent, inline: false },
      ],
      footer: { text: 'KIZASHI Feedback' },
      timestamp: now.toISOString(),
    }],
  };

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(discordPayload),
  });

  if (!response.ok) {
    const detail = (await response.text().catch(() => '')).slice(0, 300);
    const error = new Error(`Discordへの送信に失敗しました。${detail ? ` (${detail})` : ''}`);
    error.code = 'DISCORD_WEBHOOK_FAILED';
    error.status = response.status >= 400 && response.status < 600 ? response.status : 502;
    throw error;
  }

  return { ok: true, delivered: true, category: data.category, at: now.toISOString() };
}
