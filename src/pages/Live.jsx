import { useMemo, useState } from 'react';

const MARKETS = [
  { symbol: 'OANDA:XAUUSD', label: 'XAU/USD', name: 'Gold' },
  { symbol: 'FX:USDJPY', label: 'USD/JPY', name: 'Dollar / Yen' },
  { symbol: 'FX:EURUSD', label: 'EUR/USD', name: 'Euro / Dollar' },
  { symbol: 'FX:GBPJPY', label: 'GBP/JPY', name: 'Pound / Yen' },
];
const INTERVALS = [
  ['1','1分'],['5','5分'],['15','15分'],['60','1時間'],['240','4時間'],['D','日足']
];

export default function Live(){
  const [market,setMarket]=useState(MARKETS[0]);
  const [interval,setInterval]=useState('15');
  const [dark,setDark]=useState(true);
  const src=useMemo(()=>{
    const params=new URLSearchParams({
      symbol:market.symbol,
      interval,
      theme:dark?'dark':'light',
      style:'1',
      locale:'ja',
      hide_side_toolbar:'0',
      allow_symbol_change:'1',
      save_image:'1',
      calendar:'1',
      studies:'RSI@tv-basicstudies,ATR@tv-basicstudies,MAExp@tv-basicstudies',
      backgroundColor:dark?'rgba(4, 24, 43, 1)':'rgba(245, 250, 252, 1)',
      gridColor:dark?'rgba(70, 111, 140, 0.18)':'rgba(18, 91, 118, 0.10)',
    });
    return `https://s.tradingview.com/widgetembed/?${params.toString()}`;
  },[market,interval,dark]);

  return <div className="page page-enter live-page">
    <div className="page-head live-head">
      <div><small>KIZASHI v11 · LIVE MODE</small><h1>リアルタイムチャート</h1><p>相場を見ながら、きざしくんと一緒に状況を整理します。</p></div>
      <span className="live-pill"><i/> LIVE</span>
    </div>

    <section className="live-toolbar glass-panel">
      <div className="market-tabs">{MARKETS.map(item=><button key={item.symbol} className={item.symbol===market.symbol?'active':''} onClick={()=>setMarket(item)}><b>{item.label}</b><small>{item.name}</small></button>)}</div>
      <div className="live-controls">
        <select value={interval} onChange={e=>setInterval(e.target.value)}>{INTERVALS.map(([value,label])=><option value={value} key={value}>{label}</option>)}</select>
        <button onClick={()=>setDark(v=>!v)}>{dark?'☀️ ライト':'🌙 ダーク'}</button>
        <button onClick={()=>window.open(`https://www.tradingview.com/chart/?symbol=${encodeURIComponent(market.symbol)}`,'_blank','noopener,noreferrer')}>全画面 ↗</button>
      </div>
    </section>

    <section className="live-chart-shell">
      <div className="live-chart-title"><div><span>{market.label}</span><small>{INTERVALS.find(([v])=>v===interval)?.[1]}</small></div><p>ローソク足・EMA・RSI・ATRを表示</p></div>
      <iframe title={`${market.label} real-time chart`} src={src} loading="eager" allowFullScreen/>
      <div className="live-data-note">価格データはTradingViewウィジェットから表示されます。銘柄や市場により遅延する場合があります。</div>
    </section>

    <section className="live-guide-grid">
      <article className="glass-panel"><span>🌊</span><div><small>KIZASHIKUN</small><h3>画面を歩くAI秘書</h3><p>ドラッグで移動できます。吹き出しを押すとAIコーチへ質問を送れます。</p></div></article>
      <article className="glass-panel"><span>🛡️</span><div><small>GUARDIAN READY</small><h3>断定ではなく判断材料</h3><p>「買い・売り」を断定せず、ボラティリティやルール確認をやさしく伝えます。</p></div></article>
      <article className="glass-panel"><span>📷</span><div><small>VISION</small><h3>チャートをスクショ解析</h3><p>必要な場面を保存して、AIコーチのVisionから分析できます。</p></div></article>
    </section>
  </div>;
}
