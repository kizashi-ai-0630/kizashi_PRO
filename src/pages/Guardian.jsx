import { useGuardian } from '../context/GuardianContext';

const AVAILABLE_SYMBOLS = ['USDJPY', 'EURJPY', 'GBPJPY', 'XAUUSD'];

function Toggle({ checked, onChange, label }) {
  return <button type="button" className={`guardian-toggle ${checked ? 'on' : ''}`} onClick={onChange} aria-pressed={checked} aria-label={label}><span /></button>;
}

export default function Guardian() {
  const { enabled, setEnabled, symbols, toggleSymbol, rules, toggleRule, events, runTest } = useGuardian();
  const activeRules = rules.filter(rule => rule.enabled).length;

  return <div className="content guardian-page page-enter">
    <div className="guardian-title-row">
      <div><small className="eyebrow">KIZASHI PRO</small><h1>Guardian Center</h1><p className="subtitle">登録した条件を静かに見守り、一致した事実だけを通知します。</p></div>
      <div className={`guardian-master ${enabled ? 'active' : ''}`}><div><span className="guardian-pulse"/><small>市場監視</small><strong>{enabled ? '監視中' : '停止中'}</strong></div><Toggle checked={enabled} onChange={() => setEnabled(!enabled)} label="Guardian監視切替" /></div>
    </div>
    <div className="line" />

    <section className="guardian-command">
      <div className="guardian-orb">🛡️</div>
      <div><small>GUARDIAN STATUS</small><h2>{enabled ? '登録済み条件を監視しています' : '監視は一時停止しています'}</h2><p>Guardianは売買を指示しません。条件一致後の判断は、必ずユーザーが行います。</p></div>
      <div className="guardian-command-stats"><div><span>{symbols.length}</span><small>監視対象</small></div><div><span>{activeRules}</span><small>有効条件</small></div><div><span>{events.length}</span><small>検知履歴</small></div></div>
    </section>

    <div className="guardian-grid">
      <section className="guardian-panel"><div className="panel-heading"><div><small>WATCH LIST</small><h2>監視対象</h2></div><span>{symbols.length}通貨</span></div><div className="symbol-list">{AVAILABLE_SYMBOLS.map(symbol => <button key={symbol} className={symbols.includes(symbol) ? 'selected' : ''} onClick={() => toggleSymbol(symbol)}><span>{symbol.slice(0,3)} / {symbol.slice(3)}</span><i>{symbols.includes(symbol) ? '監視中' : '停止'}</i></button>)}</div></section>

      <section className="guardian-panel"><div className="panel-heading"><div><small>DETECTION RULES</small><h2>条件管理</h2></div><span>{activeRules}/{rules.length}</span></div><div className="rule-list">{rules.map(rule => <div key={rule.id}><div><b>{rule.label}</b><small>{rule.detail}</small></div><Toggle checked={rule.enabled} onChange={() => toggleRule(rule.id)} label={`${rule.label}切替`} /></div>)}</div></section>
    </div>

    <section className="guardian-panel history-panel"><div className="panel-heading"><div><small>DETECTION HISTORY</small><h2>通知履歴</h2></div><button className="guardian-test" onClick={runTest}>通知テスト</button></div><div className="guardian-history">{events.map((event, index) => <article key={event.id}><div className="history-line"><span className={index === 0 ? 'live' : ''}/></div><div><small>{event.time}</small><h3>{event.symbol}</h3><p>{event.message}</p><div className="history-tags">{event.tags.map(tag => <span key={tag}>{tag}</span>)}</div></div></article>)}</div></section>

    <section className="guardian-safety"><span>✓</span><div><b>KIZASHI Guardianの原則</b><p>「買い」「売り」「エントリー」を促さず、登録条件の一致のみを通知します。</p></div></section>
  </div>;
}
