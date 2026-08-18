import { useEffect, useMemo, useState } from 'react';
import { useGuardian } from '../context/GuardianContext';
import { trackEvent } from '../utils/analytics';

const AVAILABLE_SYMBOLS = [
  { key: 'USDJPY', label: 'USD/JPY' },
  { key: 'EURUSD', label: 'EUR/USD' },
  { key: 'GBPJPY', label: 'GBP/JPY' },
  { key: 'XAUUSD', label: 'XAU/USD' },
];

function Toggle({ checked, onChange, label }) {
  return <button type="button" className={`guardian-toggle ${checked ? 'on' : ''}`} onClick={onChange} aria-pressed={checked} aria-label={label}><span /></button>;
}

const average = values => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

function calcRsi(values, period = 14) {
  const clean = (values || []).map(Number).filter(Number.isFinite);
  if (clean.length < period + 1) return null;
  const slice = clean.slice(-(period + 1));
  let gains = 0;
  let losses = 0;
  for (let i = 1; i < slice.length; i += 1) {
    const diff = slice[i] - slice[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  return 100 - (100 / (1 + avgGain / avgLoss));
}

function hourlyCloses(values) {
  const clean = (values || []).map(Number).filter(Number.isFinite);
  const result = [];
  for (let i = 11; i < clean.length; i += 12) result.push(clean[i]);
  return result;
}

function getSession() {
  const parts = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date());
  const hour = Number(parts.find(part => part.type === 'hour')?.value || 0);
  const minute = parts.find(part => part.type === 'minute')?.value || '00';
  const active = [];
  if (hour >= 8 && hour < 17) active.push('東京');
  if (hour >= 16 || hour < 1) active.push('ロンドン');
  if (hour >= 21 || hour < 6) active.push('New York');
  return { label: active.length ? active.join(' / ') : 'セッション間', time: `${String(hour).padStart(2, '0')}:${minute} JST` };
}

function toneForRsi(value) {
  if (!Number.isFinite(value)) return 'muted';
  if (value >= 70 || value <= 30) return 'danger';
  if (value >= 60 || value <= 40) return 'warn';
  return 'good';
}

function buildStatus(market) {
  const history = (market?.guardianHistory || market?.history || []).map(Number).filter(Number.isFinite);
  const last5 = history.slice(-5);
  const last20 = history.slice(-20);
  const shortMA = average(last5);
  const longMA = average(last20);
  const maUp = Number.isFinite(shortMA) && Number.isFinite(longMA) ? shortMA >= longMA : null;

  const changes = history.slice(-40).map((value, index, arr) => index ? Math.abs(value - arr[index - 1]) : null).filter(Number.isFinite);
  const recentChanges = changes.slice(-14);
  const atr = average(recentChanges);
  const baseline = average(changes);
  const atrRatio = Number.isFinite(atr) && Number.isFinite(baseline) && baseline > 0 ? atr / baseline : null;
  let atrLabel = 'データなし';
  let atrTone = 'muted';
  if (Number.isFinite(atrRatio)) {
    if (atrRatio >= 1.65) { atrLabel = '非常に高い'; atrTone = 'danger'; }
    else if (atrRatio >= 1.2) { atrLabel = '高い'; atrTone = 'alert'; }
    else if (atrRatio <= 0.68) { atrLabel = '低い'; atrTone = 'warn'; }
    else { atrLabel = '通常'; atrTone = 'good'; }
  }

  const rsi5m = calcRsi(history, 14);
  const rsi1h = calcRsi(hourlyCloses(history), 14);
  const session = getSession();

  const bid = Number(market?.bid);
  const ask = Number(market?.ask);
  const hasSpread = Number.isFinite(bid) && Number.isFinite(ask) && ask >= bid;
  let spread = null;
  if (hasSpread) {
    const multiplier = market?.key === 'XAUUSD' ? 1 : 100;
    spread = (ask - bid) * multiplier;
  }

  return {
    ma: {
      headline: maUp === null ? 'MA  —' : `MA  ${maUp ? '↑' : '↓'}`,
      detail: maUp === null ? 'データ待ち' : maUp ? '短期 > 長期' : '短期 < 長期',
      tone: maUp === null ? 'muted' : maUp ? 'good' : 'danger',
    },
    atr: {
      headline: `ATR  ${atrLabel}`,
      detail: Number.isFinite(atr) ? `変動幅 ${atr.toFixed(market?.key === 'XAUUSD' ? 2 : 3)}` : 'データ待ち',
      tone: atrTone,
    },
    rsi: {
      headline: 'RSI',
      detail: '',
      tone: 'neutral',
      rsi5m,
      rsi1h,
    },
    session: {
      headline: session.label,
      detail: session.time,
      tone: 'good',
    },
    spread: {
      headline: hasSpread ? `${spread.toFixed(market?.key === 'XAUUSD' ? 2 : 1)} ${market?.key === 'XAUUSD' ? 'USD' : 'pips'}` : 'データなし',
      detail: hasSpread ? '現在スプレッド' : '価格配信元にBid/Askなし',
      tone: hasSpread ? 'good' : 'muted',
    },
  };
}

const RULE_ICON = { ma: '〽', atr: 'ATR', rsi: 'RSI', session: '◎', spread: '↔' };

export default function Guardian() {
  const { enabled, setEnabled, symbols, toggleSymbol, rules, toggleRule, events, runTest } = useGuardian();
  const [selectedSymbol, setSelectedSymbol] = useState(() => symbols[0] || 'USDJPY');
  const [markets, setMarkets] = useState([]);
  const activeRules = rules.filter(rule => rule.enabled).length;
  const allRulesOn = rules.length > 0 && activeRules === rules.length;
  const allRulesOff = activeRules === 0;

  useEffect(() => {
    trackEvent('guardian_open', { symbol: selectedSymbol, active_rules: activeRules });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch('/api/market-prices', { cache: 'no-store' });
        if (!response.ok) return;
        const payload = await response.json();
        if (!cancelled && Array.isArray(payload?.markets)) setMarkets(payload.markets);
      } catch {}
    };
    load();
    const timer = window.setInterval(load, 60000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, []);

  const selectedMeta = AVAILABLE_SYMBOLS.find(symbol => symbol.key === selectedSymbol) || AVAILABLE_SYMBOLS[0];
  const market = markets.find(item => item.key === selectedSymbol) || { key: selectedSymbol };
  const status = useMemo(() => buildStatus(market), [market]);
  const isSymbolEnabled = symbols.includes(selectedSymbol);

  const setAllRules = next => {
    rules.forEach(rule => {
      if (rule.enabled !== next) toggleRule(rule.id);
    });
    trackEvent('guardian_rules_all', { enabled: next, symbol: selectedSymbol });
  };

  const toggleTrackedRule = rule => {
    toggleRule(rule.id);
    trackEvent('guardian_rule_toggle', {
      rule: rule.id,
      enabled: !rule.enabled,
      symbol: selectedSymbol,
    });
  };

  const toggleTrackedSymbol = () => {
    toggleSymbol(selectedSymbol);
    trackEvent('guardian_symbol_toggle', {
      symbol: selectedSymbol,
      enabled: !isSymbolEnabled,
    });
  };

  return <div className="content guardian-page guardian-v2 page-enter">
    <div className="guardian-title-row">
      <div>
        <small className="eyebrow">DETECTION RULES</small>
        <h1>条件管理</h1>
        <p className="subtitle">1通貨ずつ、現在の状態と監視条件を大きく確認できます。</p>
      </div>
      <div className="guardian-v2-master">
        <span>{activeRules}/{rules.length}</span>
        <button
          className={`bulk-button bulk-on ${allRulesOn ? 'is-active' : 'is-inactive'}`}
          aria-pressed={allRulesOn}
          onClick={() => setAllRules(true)}
        >一括ON</button>
        <button
          className={`bulk-button bulk-off ${allRulesOff ? 'is-active' : 'is-inactive'}`}
          aria-pressed={allRulesOff}
          onClick={() => setAllRules(false)}
        >一括OFF</button>
      </div>
    </div>

    <section className="guardian-symbol-switcher">
      <div className="guardian-symbol-tabs">
        {AVAILABLE_SYMBOLS.map(symbol => <button
          key={symbol.key}
          className={selectedSymbol === symbol.key ? 'active' : ''}
          onClick={() => {
            setSelectedSymbol(symbol.key);
            trackEvent('guardian_symbol_view', { symbol: symbol.key });
          }}
        >{symbol.label}</button>)}
      </div>
      <div className="guardian-selected-monitor">
        <div>
          <small>SELECTED MARKET</small>
          <strong>{selectedMeta.label}</strong>
          <span className={markets.length ? 'live' : ''}>{markets.length ? '● LIVE DATA' : '● DATA WAIT'}</span>
        </div>
        <div className="guardian-symbol-enable">
          <small>この通貨を監視</small>
          <Toggle checked={isSymbolEnabled} onChange={toggleTrackedSymbol} label={`${selectedMeta.label}監視切替`} />
        </div>
      </div>
    </section>

    <section className="guardian-monitor-panel">
      {rules.map(rule => {
        const value = status[rule.id] || { headline: 'データなし', detail: '', tone: 'muted' };
        return <article className={`guardian-monitor-row ${rule.enabled ? '' : 'disabled'}`} key={rule.id}>
          <div className="guardian-rule-icon">{RULE_ICON[rule.id]}</div>
          <div className="guardian-rule-copy">
            <h3>{rule.label}</h3>
            <p>{rule.detail}</p>
          </div>

          <div className={`guardian-live-state ${value.tone}`}>
            <strong>{value.headline}</strong>
            {rule.id === 'rsi' ? <div className="guardian-rsi-values">
              <span>5m <b className={toneForRsi(value.rsi5m)}>{Number.isFinite(value.rsi5m) ? Math.round(value.rsi5m) : '—'}</b></span>
              <i/>
              <span>1H <b className={toneForRsi(value.rsi1h)}>{Number.isFinite(value.rsi1h) ? Math.round(value.rsi1h) : '—'}</b></span>
            </div> : <span>{value.detail}</span>}
          </div>

          <Toggle checked={rule.enabled} onChange={() => toggleTrackedRule(rule)} label={`${rule.label}切替`} />
        </article>;
      })}

      <div className="guardian-status-legend">
        <span><i className="good"/>正常</span>
        <span><i className="warn"/>注意</span>
        <span><i className="alert"/>警戒</span>
        <span><i className="danger"/>危険</span>
        <span><i className="muted"/>データなし</span>
      </div>
    </section>

    <section className="guardian-panel history-panel guardian-v2-history">
      <div className="panel-heading">
        <div><small>DETECTION HISTORY</small><h2>通知履歴</h2></div>
        <button className="guardian-test" onClick={runTest}>通知テスト</button>
      </div>
      <div className="guardian-history">{events.map((event, index) => <article key={event.id}>
        <div className="history-line"><span className={index === 0 ? 'live' : ''}/></div>
        <div><small>{event.time}</small><h3>{event.symbol}</h3><p>{event.message}</p><div className="history-tags">{event.tags.map(tag => <span key={tag}>{tag}</span>)}</div></div>
      </article>)}</div>
    </section>

    <section className="guardian-safety"><span>✓</span><div><b>KIZASHI Guardianの原則</b><p>「買い」「売り」を指示せず、登録条件の一致と現在状態だけを通知します。</p></div></section>
  </div>;
}
