import { createTrade } from './common';

function splitLine(line) {
  const out = []; let current = ''; let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') { if (quoted && line[i + 1] === '"') { current += '"'; i += 1; } else quoted = !quoted; }
    else if (ch === ',' && !quoted) { out.push(current); current = ''; }
    else current += ch;
  }
  out.push(current); return out;
}

const aliases = {
  profit: ['profit','pnl','損益','利益','net_profit','net profit','profit/loss'], session:['session','時間帯','market','市場'], weekday:['weekday','曜日','day'], symbol:['symbol','通貨ペア','pair','銘柄','item'], date:['date','日付','close_date','open_date','time','close time'], side:['side','type','売買','方向','buy/sell'], lot:['lot','lots','ロット','volume','size'], ticket:['ticket','注文番号'], openTime:['open time','open_time'], closeTime:['close time','close_time'], commission:['commission','手数料'], swap:['swap','スワップ'], taxes:['taxes','税']
};
const norm = (v) => String(v).trim().toLowerCase().replace(/[_\s-]+/g, '_');

export function parseCSV(text) {
  const lines = text.replace(/^\uFEFF/, '').trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = splitLine(lines[0]).map(norm); const indexes = {};
  Object.entries(aliases).forEach(([key, opts]) => { indexes[key] = headers.findIndex((h) => opts.map(norm).includes(h)); });
  return lines.slice(1).map((line, index) => {
    const cols = splitLine(line); const get = (key) => indexes[key] >= 0 ? String(cols[indexes[key]] ?? '').trim() : '';
    const commission = get('commission'); const swap = get('swap'); const taxes = get('taxes');
    const net = Number(String(get('profit')).replace(/[¥￥,円\s]/g, '')) + Number(String(commission || 0).replace(/,/g,'')) + Number(String(swap || 0).replace(/,/g,'')) + Number(String(taxes || 0).replace(/,/g,''));
    return createTrade({ id: `csv-${index}`, ticket:get('ticket'), openTime:get('openTime'), closeTime:get('closeTime'), date:get('date'), profit:Number.isFinite(net)?net:get('profit'), session:get('session'), weekday:get('weekday'), symbol:get('symbol'), side:get('side'), lot:get('lot'), commission, swap, taxes, source:'csv' }, index);
  }).filter((r) => r.profit !== 0 || r.symbol !== '不明');
}
