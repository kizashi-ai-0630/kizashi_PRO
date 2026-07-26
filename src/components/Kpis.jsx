import { yen } from '../utils/metrics';
export default function Kpis({ metrics: m }) {
  const cards = [
    ['¥', '純損益', yen(m.net), 'データ連動中', 'blue'], ['◎', '勝率', `${m.winRate.toFixed(1)}%`, '直近データ', 'green'],
    ['⌁', 'Profit Factor', m.pf.toFixed(2), '直近データ', 'purple'], ['↘', '最大DD', `${Math.round(m.dd).toLocaleString()} 円`, 'リスク確認', 'orange'],
    ['▣', '取引数', `${m.count} 回`, '直近データ', 'blue'],
  ];
  return <div className="kpi-grid">{cards.map(([icon, title, value, note, color]) => <div className="kpi" key={title}><span className={`bubble ${color}`}>{icon}</span><div><small>{title}</small><strong>{value}</strong><em className={note === 'リスク確認' ? 'bad' : ''}>{note}</em></div></div>)}</div>;
}
