export function cleanNumber(raw) {
  const normalized = String(raw ?? '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/[¥￥円,%\s]/g, '')
    .replace(/\(([^)]+)\)/, '-$1');
  const value = Number(normalized.replace(/,/g, ''));
  return Number.isFinite(value) ? value : 0;
}

export function parseDate(raw) {
  if (!raw) return '不明';
  const value = String(raw).trim();
  const match = value.match(/(20\d{2})[\/.\-年](\d{1,2})[\/.\-月](\d{1,2})/);
  if (match) return `${match[1]}-${String(match[2]).padStart(2, '0')}-${String(match[3]).padStart(2, '0')}`;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? (value || '不明') : parsed.toISOString().slice(0, 10);
}

export function weekdayFromDate(date) {
  if (!date || date === '不明') return '不明';
  const parsed = new Date(`${date}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? '不明' : ['日', '月', '火', '水', '木', '金', '土'][parsed.getDay()];
}

export function sessionFromTime(raw) {
  const match = String(raw || '').match(/(?:\s|^)(\d{1,2}):(\d{2})/);
  if (!match) return '不明';
  const hour = Number(match[1]);
  if (hour >= 7 && hour < 15) return '東京';
  if (hour >= 15 && hour < 21) return 'ロンドン';
  return 'NY';
}

export function createTrade(input, index = 0) {
  const date = parseDate(input.closeTime || input.openTime || input.date);
  return {
    id: String(input.id || `trade-${date}-${index}`),
    ticket: String(input.ticket || ''),
    openTime: String(input.openTime || ''),
    closeTime: String(input.closeTime || ''),
    profit: cleanNumber(input.profit),
    session: input.session || sessionFromTime(input.closeTime || input.openTime),
    weekday: input.weekday || weekdayFromDate(date),
    symbol: String(input.symbol || '不明').toUpperCase(),
    date,
    side: String(input.side || '不明').toLowerCase(),
    lot: cleanNumber(input.lot),
    openPrice: cleanNumber(input.openPrice),
    closePrice: cleanNumber(input.closePrice),
    stopLoss: cleanNumber(input.stopLoss),
    takeProfit: cleanNumber(input.takeProfit),
    commission: cleanNumber(input.commission),
    taxes: cleanNumber(input.taxes),
    swap: cleanNumber(input.swap),
    source: input.source || 'unknown',
  };
}
