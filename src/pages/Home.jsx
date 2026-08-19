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

  return ;
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


const HOME_TOP_NAV = [
  ['home','⌂','ホーム'],
  ['live','◈','LIVE'],
  ['records','▣','記録'],
  ['coach','♙','AIコーチ'],
  ['guardian','◉','Guardian'],
  ['growth','↗','成長'],
  ['settings','⚙','設定'],
];

function HomeExactHeader({ go }) {
  return <header className="home-exact-header">
    <button className="home-exact-brand" onClick={() => go('home')}>
      <span className="home-exact-whale">🐋</span>
      <b>KIZASHI</b>
      <i>• DAILY DASHBOARD</i>
    </button>
    <nav className="home-exact-nav">
      {HOME_TOP_NAV.map(([id,icon,label]) => <button key={id} className={id === 'home' ? 'active' : ''} onClick={() => go(id)}><span>{icon}</span>{label}</button>)}
    </nav>
    <div className="home-exact-tools">
      <button aria-label="通知">♧</button><button aria-label="ヘルプ">?</button><button aria-label="プロフィール">○</button>
    </div>
  </header>;
}

const MARKET_FALLBACKS = [
  {symbol:'USD / JPY', key:'USDJPY', price:159.288, previous:159.221, decimals:3},
  {symbol:'EUR / JPY', key:'EURJPY', price:183.802, previous:183.818, decimals:3},
  {symbol:'GBP / JPY', key:'GBPJPY', price:215.066, previous:215.000, decimals:3},
  {symbol:'XAU / USD', key:'XAUUSD', price:4373.22, previous:4390.26, decimals:2},
];

function sanitizeSparkline(values = []) {
  const raw = Array.isArray(values) ? values.map(Number).filter(Number.isFinite) : [];
  if (raw.length < 2) return raw;
  const cleaned = raw.filter((value, index, arr) => {
    if (index === 0 || index === arr.length - 1) return true;
    const prev = arr[index - 1], next = arr[index + 1];
    const mid = (prev + next) / 2;
    const normalMove = Math.max(Math.abs(next - prev), Math.abs(mid) * 0.00008);
    return Math.abs(value - mid) <= normalMove * 6;
  });
  return cleaned.length >= 2 ? cleaned : raw;
}

function sparklinePoints(values = []) {
  const clean = sanitizeSparkline(values);
  if (clean.length < 2) return '0,20 18,19 36,17 54,18 72,15 90,16 108,13 126,14 145,11';

  const sorted = [...clean].sort((a,b) => a-b);
  const at = p => sorted[Math.floor((sorted.length - 1) * p)];
  let low = at(.05), high = at(.95);
  if (high <= low) { low = Math.min(...clean); high = Math.max(...clean); }
  const span = Math.max(high - low, Math.abs(clean[0]) * .00005, .000001);
  low -= span * .18; high += span * .18;

  return clean.map((value, index) => {
    const v = Math.min(high, Math.max(low, value));
    const x = index / (clean.length - 1) * 145;
    const y = 32 - ((v - low) / (high - low)) * 28;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
}

function formatMarketPrice(value, decimals = 3) {
  if (!Number.isFinite(Number(value))) return '—';
  return Number(value).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function useHomeMarkets() {
  const [markets, setMarkets] = useState(() => MARKET_FALLBACKS.map(item => ({
    ...item,
    diff: item.price - item.previous,
    percent: ((item.price - item.previous) / item.previous) * 100,
    history: [item.previous, item.price],
    live: false,
  })));

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch('/api/market-prices', { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json();
        if (!cancelled && Array.isArray(payload?.markets)) {
          const byKey = Object.fromEntries(payload.markets.map(item => [item.key, item]));
          setMarkets(MARKET_FALLBACKS.map(fallback => {
            const remote = byKey[fallback.key];
            if (!remote || !Number.isFinite(Number(remote.price))) {
              return {
                ...fallback,
                diff: fallback.price - fallback.previous,
                percent: ((fallback.price - fallback.previous) / fallback.previous) * 100,
                history: [fallback.previous, fallback.price],
                live: false,
              };
            }
            return {
              ...fallback,
              ...remote,
              price: Number(remote.price),
              previous: Number(remote.previous ?? remote.price),
              diff: Number(remote.diff ?? (remote.price - (remote.previous ?? remote.price))),
              percent: Number(remote.percent ?? 0),
              history: Array.isArray(remote.history) ? remote.history.map(Number).filter(Number.isFinite) : [Number(remote.previous ?? remote.price), Number(remote.price)],
              live: true,
            };
          }));
        }
      } catch {
        // Keep researched fallbacks when a public quote source is temporarily unavailable.
      }
    };
    load();
    const timer = window.setInterval(load, 60000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, []);

  return markets;
}

function MarketSnapshotStrip() {
  const markets = useHomeMarkets();
  return <section className="home-market-strip">
    {markets.map(item => {
      const visibleHistory = sanitizeSparkline(item.history);
      const intervalMove = visibleHistory.length >= 2
        ? visibleHistory[visibleHistory.length - 1] - visibleHistory[0]
        : Number(item.diff);
      const tone = intervalMove >= 0 ? 'up' : 'down';
      const diffText = `${Number(item.diff) >= 0 ? '+' : ''}${Number(item.diff).toFixed(item.decimals)}  ${Number(item.percent) >= 0 ? '+' : ''}${Number(item.percent).toFixed(2)}%`;
      return <article className="home-market-mini" key={item.symbol} title={item.live ? '市場データ更新中' : '参考値（通信時に自動更新）'}>
        <div className="home-market-copy">
          <small>{item.symbol}<i className={item.live ? 'market-live-dot live' : 'market-live-dot'}/></small>
          <strong>{formatMarketPrice(item.price, item.decimals)}</strong>
          <span className={tone}>{diffText}</span>
        </div>
        <svg viewBox="0 0 145 36" preserveAspectRatio="none" aria-hidden="true">
          <polyline className={tone} points={sparklinePoints(item.history)}/>
        </svg>
      </article>;
    })}
  </section>;
}



const HOME_HERO_SLIDES = [
  {
    kicker: 'KIZASHI · TRADING ASSISTANT',
    title: '迷いを、確信へ。',
    body: 'データとAIで、次の判断をもっとシンプルに。',
    action: 'KIZASHIを使う',
    target: 'brain',
    image: '/assets/kizashi-whale-hero-clean.png',
  },
  {
    kicker: 'LIVE MARKET',
    title: '相場の今を、ひとつの画面で。',
    body: 'リアルタイムチャートを見ながら、市場の流れを確認。',
    action: 'LIVEを開く',
    target: 'live',
    image: '/assets/ocean.jpg',
  },
  {
    kicker: 'GUARDIAN',
    title: '見るべき瞬間を、見逃さない。',
    body: 'MA・ATR・RSI・市場環境をひと目でチェック。',
    action: 'Guardianを開く',
    target: 'guardian',
    image: '/assets/kizashi-opening-cinematic.png',
  },
  {
    kicker: 'AI COACH · VISION',
    title: '振り返りが、次の判断になる。',
    body: '取引履歴やチャート画像をAIと一緒に整理。',
    action: 'AIコーチを開く',
    target: 'coach',
    image: '/assets/kizashi-v11-concept.png',
  },
];

const HOME_ROOMS = [
  { title: 'LIVE', body: 'リアルタイムチャートで市場を見る', target: 'live' },
  { title: 'Guardian', body: '相場環境をひと目で確認', target: 'guardian' },
  { title: '今日の作戦', body: '今日のトレード戦略を整理', target: 'brain' },
  { title: '取引履歴の分析', body: '取引履歴から自分のクセを発見', target: 'analysis' },
  { title: 'AI Coach', body: 'AIと一緒にトレードを振り返る', target: 'coach' },
  { title: 'Vision', body: 'チャート画像をAIが読み解く', target: 'vision' },
  { title: '成長・記録', body: 'トレードの変化と成長を残す', target: 'growth' },
  { title: 'KIZASHI LAB', body: 'オリジナルEA・インジケーター', target: 'lab', disabled: true },
];

function HomeSlideHero({ go }) {
  const [index, setIndex] = useState(0);
  const touchStart = useRef(null);
  useEffect(() => {
    const timer = window.setInterval(() => setIndex(current => (current + 1) % HOME_HERO_SLIDES.length), 6000);
    return () => window.clearInterval(timer);
  }, []);

  const move = (direction) => setIndex(current => (current + direction + HOME_HERO_SLIDES.length) % HOME_HERO_SLIDES.length);
  const onTouchStart = (event) => { touchStart.current = event.touches?.[0]?.clientX ?? null; };
  const onTouchEnd = (event) => {
    if (touchStart.current == null) return;
    const end = event.changedTouches?.[0]?.clientX ?? touchStart.current;
    const diff = end - touchStart.current;
    if (Math.abs(diff) > 45) move(diff > 0 ? -1 : 1);
    touchStart.current = null;
  };

  return <section className="home-slide-hero" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
    <div className="home-slide-track" style={{ transform: `translateX(-${index * 100}%)` }}>
      {HOME_HERO_SLIDES.map((slide) => <article className="home-slide" key={slide.kicker} style={{ '--hero-image': `url(${slide.image})` }}>
        <div className="home-slide-shade"/>
        <div className="home-slide-copy">
          <small>{slide.kicker}</small>
          <h1>{slide.title}</h1>
          <p>{slide.body}</p>
          <button onClick={() => go(slide.target)}>{slide.action} <span>→</span></button>
        </div>
      </article>)}
    </div>
    <button className="home-slide-arrow prev" onClick={() => move(-1)} aria-label="前のスライド">‹</button>
    <button className="home-slide-arrow next" onClick={() => move(1)} aria-label="次のスライド">›</button>
    <div className="home-slide-dots">{HOME_HERO_SLIDES.map((slide, dot) => <button key={slide.kicker} className={dot === index ? 'active' : ''} onClick={() => setIndex(dot)} aria-label={`${dot + 1}枚目`}/>)}</div>
  </section>;
}

function HomeRooms({ go }) {
  const openRoom = (room) => {
    if (room.disabled) return;
    if (room.target === 'vision') {
      try { sessionStorage.setItem('kizashi_open_vision', '1'); } catch {}
      trackEvent('vision_room_open', { source: 'home_rooms' });
      go('coach');
      return;
    }
    trackEvent('home_room_open', { room: room.target });
    go(room.target);
  };
  return <section className="home-rooms-section">
    <div className="home-rooms-head"><div><small>KIZASHI ROOMS</small><h2>あなたのトレードを支える8つの部屋</h2></div></div>
    <div className="home-rooms-grid">{HOME_ROOMS.map(room => <button key={room.title} className={`home-room ${room.disabled ? 'disabled' : ''}`} onClick={() => openRoom(room)} disabled={room.disabled}>
      <div><strong>{room.title}</strong>{room.disabled && <em>COMING SOON</em>}</div>
      <p>{room.body}</p>
      {!room.disabled && <span>›</span>}
    </button>)}</div>
  </section>;
}

function HomeFooter({ go }) {
  return <footer className="home-footer">
    <button onClick={() => go('home')}><b>KIZASHI</b><small>Trading Assistant</small></button>
    <p>迷いを、確信へ。</p>
    <span>© 2026 KIZASHI</span>
  </footer>;
}

export default function Home({ go }) {
  return <div className="home home-v14 page-enter">
    <HomeSlideHero go={go}/>
    <MarketSnapshotStrip/>
    <HomeRooms go={go}/>
    <HomeFooter go={go}/>
  </div>;
}
