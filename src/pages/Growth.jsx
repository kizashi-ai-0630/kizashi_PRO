import Page from '../components/Page';
import { useTradeData } from '../context/TradeDataContext';

export default function Growth() {
  const { metrics, diagnosis, intelligence } = useTradeData();
  const disciplineBonus = diagnosis.riskScore < 35 ? 20 : diagnosis.riskScore < 60 ? 10 : 0;
  const xp = Math.max(0, Math.round(metrics.winRate + Math.min(metrics.pf, 3) * 25 + metrics.count * 3 + disciplineBonus));
  const level = Math.max(1, Math.floor(xp / 100) + 1);
  const currentXp = xp % 100;
  const unlocked = intelligence.badges.filter((badge) => badge.unlocked).length;
  const skills = [
    ['冷静さ', Math.min(100, 45 + metrics.winRate / 2)],
    ['分析力', Math.min(100, 35 + Math.min(metrics.pf, 3) * 22)],
    ['規律', Math.max(25, 100 - diagnosis.riskScore * .55)],
    ['リスク管理', Math.max(20, 100 - metrics.dd / Math.max(25, Math.abs(metrics.net) / 80 || 25))],
  ];

  return <Page title="成長" sub="レベル・称号・バッジ・デイリーミッション">
    <div className="level-card dark-card growth-level"><div><small>LEVEL</small><strong>Lv.{level}</strong></div><div><small>称号</small><strong>{intelligence.traderType.name}</strong></div><div><small>XP</small><strong>{xp}</strong></div><div><small>解除バッジ</small><strong>{unlocked}/{intelligence.badges.length}</strong></div><div className="xp"><i style={{ width: `${currentXp}%` }}/></div></div>

    <div className="growth-grid">
      <section><h2>本日のミッション</h2><div className="daily-mission"><h3>{intelligence.mission.title}</h3>{intelligence.mission.items.map((item) => <label key={item.id}><input type="checkbox"/><span><b>{item.text}</b><small>{item.reason}</small></span></label>)}</div></section>
      <section><h2>AI成長コメント</h2><div className="growth-comment"><span>{intelligence.traderType.icon}</span><p>{intelligence.traderType.note}<br/><b>次のレベルまであと {100 - currentXp} XP。</b></p></div></section>
    </div>

    <h2>バッジ・実績</h2><div className="badge-grid">{intelligence.badges.map((badge) => <div key={badge.id} className={`badge-card ${badge.unlocked ? 'unlocked' : 'locked'}`}><span>{badge.icon}</span><b>{badge.title}</b><small>{badge.description}</small><em>{badge.unlocked ? '解除済み' : '未解除'}</em></div>)}</div>

    <h2>スキル</h2><div className="skills">{skills.map(([label, value]) => <div key={label}><span>{label}</span><div><i style={{ width: `${value}%` }}/></div><b>{Math.round(value)}</b></div>)}</div>
  </Page>;
}
