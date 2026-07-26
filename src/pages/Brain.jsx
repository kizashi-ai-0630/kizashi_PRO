import Page from '../components/Page';
import { useTradeData } from '../context/TradeDataContext';
import { yen } from '../utils/metrics';

function Mini({ title, value, note }) {
  return <div className="mini"><small>{title}</small><strong>{value}</strong>{note && <em>{note}</em>}</div>;
}

export default function Brain() {
  const { metrics, diagnosis, intelligence } = useTradeData();
  const riskClass = diagnosis.riskLabel === '高' ? 'risk-high' : diagnosis.riskLabel === '中' ? 'risk-mid' : 'risk-low';

  return <Page title="KIZASHI Brain" sub="AI Intelligenceが強み・弱み・今日の作戦を自動生成">
    <section className="brief dark-card brain-brief intelligence-hero">
      <div><span>KIZASHI 9.12 · AI INTELLIGENCE</span><h2>{intelligence.headline}</h2><p>分析信頼度 {intelligence.confidence}%（{intelligence.confidenceLabel}）｜直近{metrics.count}件｜スコア {intelligence.score}/100</p></div>
      <div className="trader-type"><span>{intelligence.traderType.icon}</span><small>TRADER TYPE</small><strong>{intelligence.traderType.name}</strong><p>{intelligence.traderType.note}</p></div>
    </section>

    <div className="brain-score-grid">
      <div className={`risk-gauge ${riskClass}`}><small>危険指数</small><strong>{diagnosis.riskScore}</strong><span>/ 100</span><div><i style={{ width: `${diagnosis.riskScore}%` }}/></div><b>危険度：{diagnosis.riskLabel}</b></div>
      <div className="brain-focus"><small>本日の最優先</small><strong>{diagnosis.bestSession?.label || 'データ待ち'}</strong><p>{yen(diagnosis.bestSession?.profit || 0)}・勝率 {(diagnosis.bestSession?.winRate || 0).toFixed(1)}%</p></div>
      <div className="brain-focus warning"><small>避けたい条件</small><strong>{diagnosis.worstSession?.label || 'データ待ち'}</strong><p>{yen(diagnosis.worstSession?.profit || 0)}・期待値 {yen(diagnosis.worstSession?.expectancy || 0)}</p></div>
    </div>

    <div className="alert-stack">{intelligence.alerts.map((alert) => <div key={alert.title} className={`ai-alert ${alert.level}`}><b>{alert.title}</b><span>{alert.text}</span></div>)}</div>

    <div className="intelligence-columns">
      <section className="intelligence-panel strengths"><h2>💪 あなたの強み</h2>{intelligence.strengths.map((item) => <article key={item.title}><span>{item.icon}</span><div><b>{item.title}</b><p>{item.text}</p></div></article>)}</section>
      <section className="intelligence-panel weaknesses"><h2>⚠ 改善ポイント</h2>{intelligence.weaknesses.map((item) => <article key={item.title} className={item.severity}><span>{item.icon}</span><div><b>{item.title}</b><p>{item.text}</p></div></article>)}</section>
    </div>

    <section className="mission-card"><div><small>TODAY'S MISSION</small><h2>{intelligence.mission.title}</h2></div><div className="mission-items">{intelligence.mission.items.map((item, index) => <div key={item.id}><span>{index + 1}</span><b>{item.text}</b><small>{item.reason}</small></div>)}</div></section>

    <div className="stat-grid">
      <Mini title="最大取引回数" value={`${diagnosis.maxTrades}回`} note="回数制限"/>
      <Mini title="ロット方針" value={diagnosis.lotPolicy} note="連敗時は縮小"/>
      <Mini title="期待値" value={yen(metrics.expectancy)} note="1取引あたり"/>
      <Mini title="ペイオフ" value={metrics.payoffRatio.toFixed(2)} note="平均利益 ÷ 平均損失"/>
    </div>
  </Page>;
}
