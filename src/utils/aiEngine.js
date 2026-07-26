import { groupStats, rankedGroups, yen } from './metrics';

const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const pct = (value) => `${Number(value || 0).toFixed(1)}%`;

function qualityLabel(score) {
  if (score >= 80) return '高信頼';
  if (score >= 55) return '参考';
  return 'データ不足';
}

function classifyTrader(rows, metrics) {
  const activeSessions = Object.keys(groupStats(rows, 'session')).filter((x) => x !== '不明').length;
  const activeSymbols = Object.keys(groupStats(rows, 'symbol')).filter((x) => x !== '不明').length;
  const avgLot = rows.length ? rows.reduce((sum, row) => sum + (Number(row.lot) || 0), 0) / rows.length : 0;

  if (metrics.maxLossStreak >= 4 || metrics.dd > Math.max(3000, Math.abs(metrics.net) * 1.2)) {
    return { name: 'リカバリー型', icon: '🛡️', note: '守備を整えることで成績が大きく安定するタイプです。' };
  }
  if (metrics.winRate >= 62 && metrics.payoffRatio < 1.05) {
    return { name: '高勝率スキャル型', icon: '⚡', note: '小さな優位性を積み上げるのが得意です。損失の大型化だけ注意しましょう。' };
  }
  if (metrics.payoffRatio >= 1.45 && metrics.winRate < 58) {
    return { name: 'リワード重視型', icon: '🎯', note: '勝率より値幅を取ることで利益を作るタイプです。' };
  }
  if (activeSessions <= 1 || activeSymbols <= 1) {
    return { name: '条件集中型', icon: '🔬', note: '得意条件に集中すると再現性が高まりやすいタイプです。' };
  }
  if (avgLot > 0 && metrics.count >= 20) {
    return { name: 'アクティブデイトレ型', icon: '🌊', note: '複数条件を使い分けるタイプです。時間帯ごとのルール分離が有効です。' };
  }
  return { name: 'バランス型', icon: '🧭', note: '勝率と値幅の両方をバランスよく活かすタイプです。' };
}

function buildStrengths(metrics, diagnosis, rankings) {
  const strengths = [];
  if (metrics.net > 0) strengths.push({ icon: '💰', title: '収益性', text: `合計損益は${yen(metrics.net)}です。` });
  if (metrics.pf >= 1.3) strengths.push({ icon: '📈', title: '優位性', text: `PF ${metrics.pf.toFixed(2)}で、利益が損失を上回っています。` });
  if (metrics.winRate >= 55) strengths.push({ icon: '🎯', title: '安定した勝率', text: `勝率${pct(metrics.winRate)}を維持しています。` });
  if (metrics.payoffRatio >= 1.2) strengths.push({ icon: '🚀', title: '利益の伸ばし方', text: `ペイオフ${metrics.payoffRatio.toFixed(2)}で平均利益が平均損失を上回ります。` });
  if (diagnosis.bestSession?.profit > 0) strengths.push({ icon: '⏰', title: `${diagnosis.bestSession.label}が得意`, text: `${yen(diagnosis.bestSession.profit)}・勝率${pct(diagnosis.bestSession.winRate)}です。` });
  if (rankings.weekdays[0]?.profit > 0) strengths.push({ icon: '📅', title: `${rankings.weekdays[0].label}曜日`, text: `曜日別トップで${yen(rankings.weekdays[0].profit)}です。` });
  return strengths.slice(0, 4).length ? strengths.slice(0, 4) : [{ icon: '🌱', title: '分析を開始', text: '取引データが増えるほど、強みの判定精度が上がります。' }];
}

function buildWeaknesses(metrics, diagnosis, rankings) {
  const weaknesses = [];
  if (metrics.pf < 1) weaknesses.push({ severity: 'high', icon: '🚨', title: 'PFが1.0未満', text: '利益より損失が大きい状態です。条件を絞りましょう。' });
  if (metrics.maxLossStreak >= 3) weaknesses.push({ severity: 'high', icon: '🔻', title: `${metrics.maxLossStreak}連敗`, text: '連敗ストッパーを設定し、追いかける取引を防ぎましょう。' });
  if (metrics.payoffRatio < 1) weaknesses.push({ severity: 'mid', icon: '✂️', title: '損大利小', text: `ペイオフ${metrics.payoffRatio.toFixed(2)}。利確を急ぐか、損切りが遅い可能性があります。` });
  if (metrics.dd > Math.max(2000, Math.abs(metrics.net))) weaknesses.push({ severity: 'high', icon: '📉', title: 'ドローダウンが大きい', text: `最大DDは${yen(-metrics.dd)}です。ロット縮小を検討しましょう。` });
  if (diagnosis.worstSession?.profit < 0) weaknesses.push({ severity: 'mid', icon: '⏳', title: `${diagnosis.worstSession.label}に注意`, text: `${yen(diagnosis.worstSession.profit)}・期待値${yen(diagnosis.worstSession.expectancy)}です。` });
  const worstSymbol = rankings.symbols.at(-1);
  if (worstSymbol?.profit < 0) weaknesses.push({ severity: 'low', icon: '💱', title: `${worstSymbol.label}を見直す`, text: `通貨別で${yen(worstSymbol.profit)}です。` });
  return weaknesses.slice(0, 4).length ? weaknesses.slice(0, 4) : [{ severity: 'low', icon: '✅', title: '大きな弱点なし', text: '現時点では重大な崩れは見られません。得意条件を再現しましょう。' }];
}

function buildMission(metrics, diagnosis) {
  const items = [];
  items.push({ id: 'limit', text: `最大${diagnosis.maxTrades}回まで`, reason: '回数制限で衝動取引を防ぐ' });
  if (diagnosis.bestSession) items.push({ id: 'session', text: `${diagnosis.bestSession.label}を優先`, reason: '最も再現性の高い時間帯' });
  items.push({ id: 'stop', text: `${Math.max(2, Math.min(3, metrics.maxLossStreak || 2))}連敗で終了`, reason: '損失の連鎖を止める' });
  return { title: diagnosis.riskLabel === '高' ? '守り切る日' : '得意条件を再現する日', items: items.slice(0, 3) };
}

function buildBadges(metrics, diagnosis) {
  const candidates = [
    { id: 'first10', icon: '🌱', title: 'データの芽', description: '10件以上の取引を記録', unlocked: metrics.count >= 10 },
    { id: 'profit', icon: '💎', title: 'プラス航海', description: '合計損益がプラス', unlocked: metrics.net > 0 },
    { id: 'pf15', icon: '🏆', title: '優位性の証明', description: 'PF 1.5以上', unlocked: metrics.pf >= 1.5 },
    { id: 'win60', icon: '🎯', title: '安定射撃', description: '勝率60%以上', unlocked: metrics.winRate >= 60 },
    { id: 'streak3', icon: '🔥', title: '3連勝', description: '最大3連勝以上', unlocked: metrics.maxWinStreak >= 3 },
    { id: 'risk', icon: '🛡️', title: 'リスク管理者', description: '危険指数35未満', unlocked: diagnosis.riskScore < 35 && metrics.count >= 5 },
  ];
  return candidates;
}

function buildAlerts(metrics, diagnosis) {
  const alerts = [];
  if (diagnosis.riskLabel === '高') alerts.push({ level: 'danger', title: '高リスク', text: '今日は新規取引を1回までに制限し、ロットを半分にしてください。' });
  if (metrics.maxLossStreak >= 3) alerts.push({ level: 'danger', title: '連敗警告', text: `${metrics.maxLossStreak}連敗を記録しています。連敗後の再エントリーを禁止しましょう。` });
  if (diagnosis.worstSession?.profit < 0) alerts.push({ level: 'warning', title: `${diagnosis.worstSession.label}注意`, text: `この時間帯の合計損益は${yen(diagnosis.worstSession.profit)}です。` });
  if (!alerts.length) alerts.push({ level: 'safe', title: '準備良好', text: '重大な警告はありません。得意条件だけを選びましょう。' });
  return alerts;
}

export function buildIntelligence(rows, metrics, diagnosis) {
  const rankings = {
    sessions: rankedGroups(rows, 'session'),
    weekdays: rankedGroups(rows, 'weekday'),
    symbols: rankedGroups(rows, 'symbol'),
    sides: rankedGroups(rows, 'side'),
  };
  const confidence = clamp(Math.round((Math.min(rows.length, 50) / 50) * 70 + (Object.keys(groupStats(rows, 'session')).length > 1 ? 15 : 0) + (Object.keys(groupStats(rows, 'date')).length > 2 ? 15 : 0)));
  const traderType = classifyTrader(rows, metrics);
  const strengths = buildStrengths(metrics, diagnosis, rankings);
  const weaknesses = buildWeaknesses(metrics, diagnosis, rankings);
  const mission = buildMission(metrics, diagnosis);
  const badges = buildBadges(metrics, diagnosis);
  const alerts = buildAlerts(metrics, diagnosis);
  const score = clamp(Math.round(50 + Math.min(metrics.pf, 2.5) * 13 + (metrics.winRate - 50) * .45 - diagnosis.riskScore * .25));

  return {
    version: '9.12',
    confidence,
    confidenceLabel: qualityLabel(confidence),
    traderType,
    strengths,
    weaknesses,
    mission,
    badges,
    alerts,
    rankings,
    score,
    headline: diagnosis.riskLabel === '高'
      ? 'いつもの負けパターンに入る前に、今日は守りへ切り替えましょう。'
      : `${diagnosis.bestSession?.label || '得意条件'}に集中すれば、優位性を再現しやすい状態です。`,
  };
}

export function answerWithIntelligence(question, metrics, diagnosis, intelligence) {
  const q = String(question || '').trim().toLowerCase();
  const best = diagnosis.bestSession;
  const worst = diagnosis.worstSession;
  const worstSymbol = intelligence.rankings.symbols.at(-1);
  const topWeekday = intelligence.rankings.weekdays[0];

  if (!q) return '質問を入力してください。';
  if (/(なぜ|負け|原因|敗因)/.test(q)) {
    const reasons = intelligence.weaknesses.slice(0, 3).map((x, i) => `${i + 1}. ${x.title}：${x.text}`).join('\n');
    return `直近データから考えられる主因です。\n${reasons}\nまずは${worst?.label || '弱い条件'}を減らし、${best?.label || '得意条件'}に戻すのが最短です。`;
  }
  if (/(今日|やる|エントリー|作戦|取引して)/.test(q)) {
    return `${intelligence.headline}\n今日のミッションは「${intelligence.mission.title}」。${intelligence.mission.items.map((x) => x.text).join('・')}。危険指数は${diagnosis.riskScore}/100です。`;
  }
  if (/(時間|いつ|セッション|狙)/.test(q)) {
    return `最優先は${best?.label || 'データ待ち'}です。合計${yen(best?.profit || 0)}、勝率${pct(best?.winRate)}、期待値${yen(best?.expectancy || 0)}。一方、${worst?.label || '弱い時間帯'}は${yen(worst?.profit || 0)}なので避ける候補です。`;
  }
  if (/(曜日|何曜日)/.test(q)) {
    return `最も成績が良い曜日は${topWeekday?.label || 'データ待ち'}曜日で、${yen(topWeekday?.profit || 0)}・勝率${pct(topWeekday?.winRate)}です。`;
  }
  if (/(通貨|ペア|銘柄)/.test(q)) {
    const top = intelligence.rankings.symbols[0];
    return `得意な通貨は${top?.label || 'データ待ち'}（${yen(top?.profit || 0)}）。注意通貨は${worstSymbol?.label || 'データ待ち'}（${yen(worstSymbol?.profit || 0)}）です。`;
  }
  if (/(ロット|枚|数量|リスク)/.test(q)) {
    return `危険指数${diagnosis.riskScore}/100、最大DD${Math.round(metrics.dd).toLocaleString()}円です。今日のロット方針は「${diagnosis.lotPolicy}」、最大${diagnosis.maxTrades}回を推奨します。`;
  }
  if (/(強み|得意)/.test(q)) {
    return intelligence.strengths.map((x) => `・${x.title}：${x.text}`).join('\n');
  }
  if (/(弱み|改善|直す)/.test(q)) {
    return intelligence.weaknesses.map((x) => `・${x.title}：${x.text}`).join('\n');
  }
  if (/(タイプ|性格|どんなトレーダー)/.test(q)) {
    return `あなたは「${intelligence.traderType.name}」です。${intelligence.traderType.note}`;
  }
  if (/(pf|プロフィット)/.test(q)) {
    return `PFは${metrics.pf.toFixed(2)}です。平均利益${yen(metrics.avgWin)}、平均損失${yen(metrics.avgLoss)}、ペイオフ${metrics.payoffRatio.toFixed(2)}。${metrics.pf >= 1.3 ? '優位性は確認できます。' : 'まず1.3以上を目標に、弱い条件を削りましょう。'}`;
  }
  return `KIZASHI AIの診断です。あなたは「${intelligence.traderType.name}」。スコア${intelligence.score}/100、分析信頼度${intelligence.confidence}%です。\n「負けた原因」「今日やる？」「狙う時間帯」「強み」「改善点」「通貨」などを聞いてください。`;
}

export function heatmapData(rows) {
  const weekdays = ['月', '火', '水', '木', '金'];
  const sessions = [...new Set(rows.map((row) => row.session).filter((x) => x && x !== '不明'))];
  const map = {};
  rows.forEach((row) => {
    const key = `${row.weekday}|${row.session}`;
    if (!map[key]) map[key] = { profit: 0, count: 0, wins: 0 };
    map[key].profit += Number(row.profit) || 0;
    map[key].count += 1;
    if (Number(row.profit) > 0) map[key].wins += 1;
  });
  return { weekdays, sessions, map };
}

export function monthlyStats(rows) {
  const groups = {};
  rows.forEach((row) => {
    if (!row.date || row.date === '不明') return;
    const month = String(row.date).slice(0, 7);
    if (!groups[month]) groups[month] = { label: month, profit: 0, count: 0, wins: 0 };
    groups[month].profit += Number(row.profit) || 0;
    groups[month].count += 1;
    if (Number(row.profit) > 0) groups[month].wins += 1;
  });
  return Object.values(groups).sort((a, b) => a.label.localeCompare(b.label)).map((x) => ({ ...x, winRate: x.count ? x.wins / x.count * 100 : 0 }));
}
