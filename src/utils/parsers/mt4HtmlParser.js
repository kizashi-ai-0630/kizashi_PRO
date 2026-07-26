import { cleanNumber, createTrade } from './common';
const norm = (v) => String(v || '').replace(/\u00a0/g,' ').trim().toLowerCase().replace(/[._\-\/]+/g,' ').replace(/\s+/g,' ');
const aliases = { ticket:['ticket','注文番号','チケット'], openTime:['open time','取引時刻','開始時刻','新規時刻'], type:['type','取引種別','種別'], size:['size','lots','lot','数量','ロット'], symbol:['item','symbol','通貨ペア','銘柄'], closeTime:['close time','決済時刻','終了時刻'], commission:['commission','手数料'], taxes:['taxes','税'], swap:['swap','スワップ'], profit:['profit','損益','利益'] };
function indexes(headers){ const n=headers.map(norm), out={}; Object.entries(aliases).forEach(([k,o])=>{out[k]=n.findIndex(h=>o.includes(h));}); return out; }
function isHeader(cells){ const n=cells.map(norm); return n.some(h=>aliases.type.includes(h)) && n.some(h=>aliases.profit.includes(h)) && n.some(h=>aliases.symbol.includes(h)); }

export function parseMT4HTML(htmlText) {
  if (typeof DOMParser === 'undefined') throw new Error('MT4 HTMLはブラウザ上で読み込んでください。');
  const doc = new DOMParser().parseFromString(htmlText, 'text/html');
  if (doc.querySelector('parsererror')) throw new Error('HTMLの解析に失敗しました。MT4の詳細レポートを選択してください。');
  const trades=[];
  Array.from(doc.querySelectorAll('table')).forEach((table, ti) => {
    const rows=Array.from(table.rows).map(row=>Array.from(row.cells).map(c=>c.textContent?.replace(/\u00a0/g,' ').trim()||''));
    const hi=rows.findIndex(isHeader); if(hi<0) return; const ix=indexes(rows[hi]);
    rows.slice(hi+1).forEach((cells, ri)=>{
      const get=(k)=>ix[k]>=0?String(cells[ix[k]]??'').trim():''; const type=norm(get('type'));
      if(!['buy','sell','買い','売り'].includes(type)) return;
      const symbol=get('symbol'); if(!symbol || /^(balance|credit|deposit|withdrawal)$/i.test(symbol)) return;
      const net=cleanNumber(get('profit'))+cleanNumber(get('commission'))+cleanNumber(get('swap'))+cleanNumber(get('taxes'));
      trades.push(createTrade({ id:`mt4-${ti}-${get('ticket')||ri}`, ticket:get('ticket'), openTime:get('openTime'), closeTime:get('closeTime'), profit:net, symbol, side:type==='buy'||type==='買い'?'buy':'sell', lot:get('size'), commission:get('commission'), swap:get('swap'), taxes:get('taxes'), source:'mt4-html' }, trades.length));
    });
  });
  if (!trades.length && /closed transactions/i.test(doc.body?.textContent || '')) throw new Error('決済済み取引を読み取れませんでした。MT4の「詳細レポート」または「レポート」を保存したHTMLを選択してください。');
  return trades;
}
