import HeroChart from '../components/HeroChart';
import Kpis from '../components/Kpis';
import { useTradeData } from '../context/TradeDataContext';
import { useGuardian } from '../context/GuardianContext';
import { yen } from '../utils/metrics';
import { useEffect, useRef, useState } from 'react';
import { useNotice } from '../context/NoticeContext';

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


function TradeImportCard({ go }) {
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
  return <div className="home daily-home page-enter">
    <section className="daily-hero">
      <div className="hero-bg"/><HeroChart/>
      <div className="daily-hero-overlay"/>
      <div className="daily-hero-copy"><small>KIZASHI · DAILY DASHBOARD</small><h1>迷いを、確信へ。</h1><p className='hero-subtitle'>データとAIで、あなたのトレードを進化させる。</p><p className='hero-message'>今日も最高の一日をつくりましょう。</p><div className="hero-data-state"><span className={ready ? 'ready' : ''}/>{ready ? `${metrics.count}件の取引データを読み込み中` : '取引データを待っています'}</div></div>
      <div className="daily-score"><small>KIZASHI SCORE</small><strong>{ready ? intelligence.score : '—'}</strong></div>
    </section>

    <TradeImportCard go={go}/>

    <div className="daily-main-grid">
      <GuardianFocus go={go}/>
      <MarketClock/>
    </div>

    {ready && <DailyBrief metrics={metrics} ready={ready} score={intelligence.score}/>}
    {ready && <Kpis metrics={metrics}/>}
    <QuickActions go={go}/>
  </div>;
}
