import HeroChart from '../components/HeroChart';
import Kpis from '../components/Kpis';
import { useTradeData } from '../context/TradeDataContext';
import { useGuardian } from '../context/GuardianContext';
import { yen } from '../utils/metrics';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNotice } from '../context/NoticeContext';
import { useApiKey } from '../context/ApiKeyContext';
import { getLocalAnalytics, trackEvent } from '../utils/analytics';

const SESSIONS = [
  { name: '東京', start: 8, end: 16 },
  { name: 'ロンドン', start: 16, end: 24 },
  { name: 'NY', start: 21, end: 6 },
];

function sessionState(session, hour) {
  const active = session.start < session.end
    ? hour >= session.start && hour < session.end
    : hour >= session.start || hour < session.end;
  if (active) return { label: 'OPEN', tone: 'open' };
  const until = (session.start - hour + 24) % 24;
  return { label: until <= 3 ? 'SOON' : 'CLOSED', tone: until <= 3 ? 'soon' : 'closed' };
}

function DailyBrief({ metrics, ready, score }) {
  let title = 'まずは取引データを読み込みましょう。';
  let body = 'CSVを読み込むと、直近の成績から今日意識したいポイントを短く表示します。';
  if (ready) {
    if (metrics.count < 10) {
      title = '判断には、もう少しデータが必要です。';
      body = `現在は${metrics.count}件。まずは回数を増やし、結果よりルール遵守を優先しましょう。`;
    } else if (metrics.pf >= 1.5 && metrics.winRate >= 50) {
      title = '今の型を崩さず、再現性を優先。';
      body = `PF ${metrics.pf.toFixed(2)}、勝率 ${metrics.winRate.toFixed(1)}%。好調時ほどロットを変えず、同じ条件を丁寧に繰り返しましょう。`;
    } else if (metrics.net < 0 || metrics.pf < 1) {
      title = '今日は守ることを最優先に。';
      body = `直近の合計損益は${yen(metrics.net)}、PFは${metrics.pf.toFixed(2)}。回数を絞り、苦手な時間帯を先に確認しましょう。`;
    } else {
      title = '焦らず、条件が揃うまで待つ日。';
      body = `勝率 ${metrics.winRate.toFixed(1)}%、PF ${metrics.pf.toFixed(2)}。良い形だけを選び、無理な回数追加を避けましょう。`;
    }
  }
  return <section className="daily-brief glass-panel">
    <div className="daily-brief-head"><div className="section-kicker">🤖 AI DAILY BRIEF</div><div className="daily-rating"><small>今日の評価</small><strong>{score}</strong><span>/100</span></div></div>
    <div className="daily-brief-copy"><div><h3>Today's Insight</h3><h2>{title}</h2><p>{body}</p><hr/><h3>Today's Message</h3><p>「エントリーしない判断も、立派なトレードです。」</p></div></div>
  </section>;
}

function GuardianFocus({ go }) {
  const { enabled, symbols, rules, events } = useGuardian();
  const latest = events[0];
  const activeRules = rules.filter(rule => rule.enabled).length;
  return <section className={`guardian-focus ${enabled ? 'active' : ''}`}>
    <div className="guardian-focus-top">
      <div className="guardian-identity"><span className="guardian-emblem">🛡️</span><div><small>GUARDIAN</small><h2>{enabled ? '登録済み条件を監視中' : '監視停止中'}</h2></div></div>
      <div className="guardian-live"><i/><span>{enabled ? 'ACTIVE' : 'OFFLINE'}</span></div>
    </div>
    <div className="guardian-mobile-summary"><span><small>監視中</small><b>{activeRules}条件</b></span><span><small>最新検知</small><b>{latest?.time || '履歴なし'}</b></span></div>
    <div className="guardian-focus-grid">
      <div><small>監視対象</small><strong>{symbols.length}</strong><p>{symbols.join(' · ') || '未登録'}</p></div>
      <div><small>有効条件</small><strong>{activeRules}</strong><p>登録済み条件を確認中</p></div>
      <div className="latest-detection"><small>最新検知</small><strong>{latest?.time || '履歴なし'}</strong><p>{latest ? `${latest.symbol} — ${latest.message}` : '検知履歴はありません。'}</p></div>
    </div>
    <button onClick={() => go('guardian')}>Guardian Center <span>›</span></button>
  </section>;
}

function MarketClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);
  const hour = now.getHours();
  const time = new Intl.DateTimeFormat('ja-JP', { hour: '2-digit', minute: '2-digit' }).format(now);
  return <section className="market-clock glass-panel">
    <div className="market-clock-head"><div><div className="section-kicker">MARKET CLOCK</div><h2>市場セッション</h2></div><time>{time}</time></div>
    <div className="session-list">{SESSIONS.map(session => { const state = sessionState(session, hour); return <div className="session" key={session.name}><span className={`session-dot ${state.tone}`}/><div><b>{session.name}</b><small>{state.label}</small></div></div>; })}</div>
    <p>ブラウザの現在時刻を基準にした目安です。祝日・夏時間・実際の取引時間は反映していません。</p>
  </section>;
}


function useTodayActivity() {
  const read = () => {
    const today = new Date().toISOString().slice(0, 10);
    return getLocalAnalytics().filter(event => String(event.at || '').slice(0, 10) === today);
  };
  const [events, setEvents] = useState(read);
  useEffect(() => {
    const sync = () => setEvents(read());
    window.addEventListener('kizashi:analytics', sync);
    return () => window.removeEventListener('kizashi:analytics', sync);
  }, []);
  return events;
}

function TodayMission({ ready, go }) {
  const events = useTodayActivity();
  const done = {
    import: ready,
    ai: events.some(event => event.name === 'ai_chat'),
    vision: events.some(event => event.name === 'vision_upload'),
    guardian: events.some(event => event.name === 'page_view' && event.props?.page_name === 'guardian'),
  };
  const tasks = [
    ['import', '履歴を読み込む', ready ? null : 'analysis'],
    ['ai', 'きざしくんに相談', null],
    ['vision', 'スクショ解析', 'coach'],
    ['guardian', 'Guardian確認', 'guardian'],
  ];
  const complete = Object.values(done).filter(Boolean).length;
  return <section className={`today-mission ${complete === tasks.length ? 'complete' : ''}`}>
    <div className="today-mission-head"><div><small>🎯 TODAY'S MISSION</small><b>{complete === tasks.length ? '今日のミッション達成！' : '今日のミッション'}</b></div><strong>{complete}/{tasks.length}</strong></div>
    <div className="today-mission-list">{tasks.map(([key,label,target]) => <button key={key} className={done[key] ? 'done' : ''} onClick={() => target && go(target)} disabled={done[key] || !target}><span>{done[key] ? '✓' : '○'}</span>{label}</button>)}</div>
  </section>;
}

function useScoreHistory(score, ready) {
  const [delta, setDelta] = useState(null);
  useEffect(() => {
    if (!ready || !Number.isFinite(Number(score))) { setDelta(null); return; }
    try {
      const key = 'kizashi_score_history_v1';
      const today = new Date().toISOString().slice(0, 10);
      const history = JSON.parse(localStorage.getItem(key) || '{}');
      const previousDates = Object.keys(history).filter(date => date < today).sort();
      const previous = previousDates.length ? Number(history[previousDates.at(-1)]) : null;
      history[today] = Number(score);
      localStorage.setItem(key, JSON.stringify(history));
      setDelta(Number.isFinite(previous) ? Number(score) - previous : null);
    } catch { setDelta(null); }
  }, [score, ready]);
  return delta;
}




const HOME_MARKETS = [
  { symbol: 'OANDA:XAUUSD', label: 'XAU/USD' },
  { symbol: 'FX:USDJPY', label: 'USD/JPY' },
  { symbol: 'FX:EURUSD', label: 'EUR/USD' },
  { symbol: 'FX:GBPJPY', label: 'GBP/JPY' },
];
const HOME_INTERVALS = [['1','1m'],['5','5m'],['15','15m'],['60','1H'],['240','4H'],['D','1D']];

function HomeLiveMarket({ go }) {
  const [market, setMarket] = useState(HOME_MARKETS[0]);
  const [interval, setInterval] = useState('15');
  const [draft, setDraft] = useState('');
  const [reply, setReply] = useState('値動きだけで決めず、ロットと損切り位置を先に確認しよう。');
  const [chatLog, setChatLog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(0);
  const [characterMotion, setCharacterMotion] = useState('idle');
  const { apiKey, hasApiKey } = useApiKey();
  const { rows, metrics, diagnosis, intelligence } = useTradeData();
  const src = useMemo(() => {
    const params = new URLSearchParams({
      symbol: market.symbol,
      interval,
      theme: 'dark',
      style: '1',
      locale: 'ja',
      hide_side_toolbar: '1',
      allow_symbol_change: '0',
      save_image: '1',
      calendar: '0',
      studies: 'RSI@tv-basicstudies,MAExp@tv-basicstudies',
      backgroundColor: 'rgba(4, 20, 38, 1)',
      gridColor: 'rgba(80, 130, 160, 0.16)',
    });
    return `https://s.tradingview.com/widgetembed/?${params.toString()}`;
  }, [market, interval]);

  useEffect(() => {
    setLastRefresh(0);
    const timer = window.setInterval(() => setLastRefresh(value => Math.min(99, value + 1)), 1000);
    return () => window.clearInterval(timer);
  }, [market, interval]);

  useEffect(() => {
    if (loading) { setCharacterMotion('thinking'); return; }
    let timer;
    const motions = ['idle', 'wave', 'sway', 'hop'];
    const schedule = () => {
      timer = window.setTimeout(() => {
        const next = motions[Math.floor(Math.random() * motions.length)];
        setCharacterMotion(next);
        window.setTimeout(() => setCharacterMotion('idle'), next === 'idle' ? 2200 : 1300);
        schedule();
      }, 4300 + Math.floor(Math.random() * 3200));
    };
    schedule();
    return () => window.clearTimeout(timer);
  }, [loading]);

  const ask = async () => {
    const text = draft.trim();
    if (!text || loading) return;
    if (!hasApiKey) {
      setReply('AIで答えるにはOpenAI APIキーが必要だよ。管理画面で設定すれば、この場所のまま会話できるよ。');
      return;
    }

    setLoading(true);
    setReply('考え中…');
    const route = rows.length ? 'analysis' : 'chat';
    const history = chatLog.slice(-6).map(item => ({ role: item.role, text: item.text }));
    const normalizedMetrics = {
      ...metrics,
      netProfit: metrics.net,
      profitFactor: metrics.pf,
      maxDrawdown: metrics.dd,
      averageWin: metrics.avgWin,
      averageLoss: metrics.avgLoss,
    };
    try {
      trackEvent('ai_chat', { source: 'home_kizashikun', route, trade_count: rows.length, symbol: market.label, interval });
      const response = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-OpenAI-API-Key': apiKey },
        body: JSON.stringify({
          message: `${text}\n\n現在ホームで表示中: ${market.label} / ${HOME_INTERVALS.find(([v]) => v === interval)?.[1] || interval}`,
          history,
          route,
          metrics: normalizedMetrics,
          diagnosis,
          intelligence,
          rows: route === 'analysis' ? rows.slice(-20) : [],
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'AIとの通信に失敗しました。');
      const answer = String(data.answer || '').trim();
      if (!answer) throw new Error('返答を受け取れませんでした。');
      setReply(answer);
      setCharacterMotion('happy');
      window.setTimeout(() => setCharacterMotion('idle'), 1600);
      setChatLog(current => [...current, { role: 'user', text }, { role: 'assistant', text: answer }].slice(-12));
      setDraft('');
    } catch (error) {
      setReply(`${error.message} 少し待ってから、もう一度ここで送ってみてね。`);
      setCharacterMotion('warning');
    } finally {
      setLoading(false);
    }
  };

  return <section className="home-live-dashboard">
    <div className="home-live-main">
      <div className="home-live-head">
        <div><small>📈 LIVE MARKET</small><h2>リアルタイムチャート</h2></div>
        <span className="home-live-badge"><i/> LIVE</span>
      </div>
      <div className="home-live-tabs">
        <div className="home-live-symbols">{HOME_MARKETS.map(item => <button key={item.symbol} className={item.symbol === market.symbol ? 'active' : ''} onClick={() => setMarket(item)}>{item.label}</button>)}</div>
        <div className="home-live-intervals">{HOME_INTERVALS.map(([value,label]) => <button key={value} className={interval === value ? 'active' : ''} onClick={() => setInterval(value)}>{label}</button>)}</div>
      </div>
      <div className="home-live-chart">
        <iframe title={`${market.label} live chart`} src={src} loading="eager" allowFullScreen/>
      </div>
      <div className="home-live-foot"><span>ローソク足・EMA・RSIを表示 · 表示更新 {lastRefresh}秒前</span><button onClick={() => go('live')}>Live画面を開く ↗</button></div>
    </div>
    <aside className="home-kizashi-panel">
      <div className="home-kizashi-title"><span>🤖</span><b>きざしくん アシスタント</b><em>{loading ? '● 考え中' : '● オンライン'}</em></div>
      <div className={`home-kizashi-bubble ${loading ? 'loading' : ''}`}>{reply}<small>この画面のまま会話できます。売買を断定せず、判断材料を整理します。</small></div>
      <div className={`home-kizashi-character home-motion-${characterMotion}`}><img src="/assets/kizashikun.png" alt="きざしくん"/><span className="home-kizashi-expression">{characterMotion === 'thinking' ? '💭' : characterMotion === 'warning' ? '⚠️' : characterMotion === 'happy' ? '✨' : ''}</span><span className="home-kizashi-glow">K</span></div>
      <div className="home-kizashi-quick">
        <button onClick={() => setDraft('今の相場を見る時の確認ポイントを教えて')}>相場の状況を教えて</button>
        <button onClick={() => setDraft('今の自分の成績から適正ロットを考える時の確認ポイントを教えて')}>ロットの確認</button>
        <button onClick={() => setDraft('今日確認しておくべき経済指標や時間帯の注意点を整理して')}>経済指標の確認</button>
        <button onClick={() => setDraft('今の自分の成績から今日の作戦を一つに絞って')}>今日の作戦を考えて</button>
      </div>
      <div className="home-kizashi-chat"><input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') ask(); }} placeholder="きざしくんに質問してみよう…"/><button onClick={ask} disabled={loading}>{loading ? '…' : '➤'}</button></div>
    </aside>
  </section>;
}

function TradeImportCard({ go, compact = false }) {
  const input = useRef(null);
  const imageInput = useRef(null);
  const [acceptFilter, setAcceptFilter] = useState('.csv,.html,.htm,text/csv,text/html');
  const { rows, fileName, importTradeFile, clearRows } = useTradeData();
  const { notify } = useNotice();
  const ready = rows.length > 0;

  const load = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const ok = await importTradeFile(file);
    notify(ok ? '取引履歴を読み込みました' : '取引履歴の読み込みに失敗しました', ok ? 'success' : 'error', 5000);
  };

  const chooseFile = (filter) => {
    setAcceptFilter(filter);
    requestAnimationFrame(() => input.current?.click());
  };

  const chooseScreenshot = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      notify('画像ファイルを選んでください', 'error');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      notify('画像は8MB以下にしてください', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      trackEvent('vision_upload', { source: 'home', file_size: file.size, file_type: file.type || 'image' });
      try {
        sessionStorage.setItem('kizashi_pending_vision', JSON.stringify({ name: file.name, dataUrl: String(reader.result), size: file.size }));
        go('coach');
      } catch {
        notify('画像を準備できませんでした', 'error');
      }
    };
    reader.onerror = () => notify('画像を読み込めませんでした', 'error');
    reader.readAsDataURL(file);
  };

  if (compact) {
    return <section className="home-import-card home-import-compact">
      <input ref={input} type="file" accept={acceptFilter} hidden onChange={load}/>
      <input ref={imageInput} type="file" accept="image/*" hidden onChange={chooseScreenshot}/>
      <div className="home-import-compact-head">
        <div><small>TRADE DATA</small><b>{ready ? 'データ読込済み' : 'データを読み込む'}</b></div>
        {ready && <button className="home-import-compact-clear" onClick={() => { if (confirm('読み込んだ取引履歴を解除しますか？')) { clearRows(); notify('取引履歴を解除しました', 'info'); } }}>解除</button>}
      </div>
      <p>{ready ? `${rows.length}件 · ${fileName || '取引履歴'}` : 'MT4 / MT5 / スクショ'}</p>
      <div className="home-import-compact-actions">
        <button onClick={() => chooseFile('.html,.htm,text/html')}>MT4</button>
        <button onClick={() => chooseFile('.csv,text/csv')}>MT5</button>
        <button onClick={() => imageInput.current?.click()}>📷</button>
      </div>
    </section>;
  }

  return <section className="home-import-card glass-panel">
    <div className="home-import-icon">📂</div>
    <div className="home-import-copy">
      <small>TRADE DATA</small>
      <h2>{ready ? '取引履歴を変更する' : 'トレード履歴を読み込む'}</h2>
      <p>{ready ? `${fileName}・${rows.length}件を読み込み済みです。` : 'MT4（HTML）・MT5（CSV）の履歴を選ぶと、スコア・分析・AIコーチに反映されます。'}</p>
      <span>📷 チャート・取引履歴・結果画面のスクショをAIが解析します</span>
    </div>
    <div className="home-import-actions">
      <input ref={input} type="file" accept={acceptFilter} hidden onChange={load}/>
      <input ref={imageInput} type="file" accept="image/*" hidden onChange={chooseScreenshot}/>
      <button className="home-import-primary" onClick={() => chooseFile('.html,.htm,text/html')}>MT4 HTML</button>
      <button className="home-import-primary" onClick={() => chooseFile('.csv,text/csv')}>MT5 CSV</button>
      <button className="home-import-image" onClick={() => imageInput.current?.click()}>📷 スクショをAI解析</button>
      {ready && <button className="home-import-clear" onClick={() => { if (confirm('読み込んだ取引履歴を解除しますか？')) { clearRows(); notify('取引履歴を解除しました', 'info'); } }}>履歴を解除</button>}
    </div>
  </section>;
}


function BrandOcean({ go }) {
  return <section className="brand-ocean">
    <div className="brand-ocean-media" aria-hidden="true"/>
    <div className="brand-ocean-shade"/>
    <div className="brand-ocean-copy">
      <small>KIZASHI · AI TRADING ASSISTANT</small>
      <h2>深海の静けさで、<br/>相場を見る。</h2>
      <p>クジラ、深い青、光、ローソク足。KIZASHIのすべてをこの世界観に統一します。</p>
      <div className="brand-ocean-actions">
        <button onClick={() => go('live')}>LIVE MARKET <span>↗</span></button>
        <button className="ghost" onClick={() => go('coach')}>きざしくんに相談</button>
      </div>
    </div>
    <div className="brand-ocean-mark">
      <span>WHALE SIGNAL</span><b>迷いを、確信へ。</b><i/>
    </div>
  </section>;
}

function QuickActions({ go }) {
  const actions = [
    ['📈', 'Liveチャート', 'live'],
    ['🧠', '今日の作戦', 'brain'],
    ['📊', '分析を見る', 'analysis'],
    ['🤖', 'AIに相談', 'coach'],
    ['📝', '記録する', 'records'],
  ];
  return <section className="quick-actions">{actions.map(([icon, label, page]) => <button key={page} onClick={() => go(page)}><span>{icon}</span><b>{label}</b><i>›</i></button>)}</section>;
}

export default function Home({ go }) {
  const { metrics, rows, intelligence } = useTradeData();
  const ready = rows.length > 0;
  const scoreDelta = useScoreHistory(intelligence.score, ready);
  return <div className="home daily-home page-enter">
    <section className="daily-hero">
      <div className="hero-bg"/><HeroChart/>
      <div className="daily-hero-overlay"/>
      <div className="daily-hero-copy"><small>KIZASHI · DAILY DASHBOARD</small><h1>迷いを、確信へ。</h1><p className='hero-subtitle'>データとAIで、あなたのトレードを進化させる。</p><p className='hero-message'>今日も最高の一日をつくりましょう。</p><div className="hero-data-state"><span className={ready ? 'ready' : ''}/>{ready ? `${metrics.count}件の取引データを読み込み中` : '取引データを待っています'}</div></div>
      <div className="daily-hero-side">
        <TradeImportCard go={go} compact/>
        <div className="daily-score"><small>KIZASHI SCORE</small><strong>{ready ? intelligence.score : '—'}</strong>{ready && <span className={`daily-score-delta ${scoreDelta > 0 ? 'up' : scoreDelta < 0 ? 'down' : ''}`}>{scoreDelta == null ? '今日から記録開始' : scoreDelta === 0 ? '昨日と同じ' : `${scoreDelta > 0 ? '↑ +' : '↓ '}${scoreDelta} · 昨日比`}</span>}</div>
      </div>
    </section>

    <BrandOcean go={go}/>

    <TodayMission ready={ready} go={go}/>

    <HomeLiveMarket go={go}/>

    <div className="daily-main-grid">
      <GuardianFocus go={go}/>
      <MarketClock/>
    </div>

    {ready && <DailyBrief metrics={metrics} ready={ready} score={intelligence.score}/>}
    {ready && <Kpis metrics={metrics}/>}
    <QuickActions go={go}/>
  </div>;
}
