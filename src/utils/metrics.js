const num = (value) => Number(value) || 0;

export function calculateMetrics(rows) {
  const profits = rows.map((row) => num(row.profit));
  const wins = profits.filter((value) => value > 0);
  const losses = profits.filter((value) => value < 0);
  const grossProfit = wins.reduce((sum, value) => sum + value, 0);
  const grossLoss = Math.abs(losses.reduce((sum, value) => sum + value, 0));

  let peak = 0;
  let equity = 0;
  let maxDrawdown = 0;
  let currentWinStreak = 0;
  let currentLossStreak = 0;
  let maxWinStreak = 0;
  let maxLossStreak = 0;

  const equityCurve = profits.map((profit, index) => {
    equity += profit;
    peak = Math.max(peak, equity);
    maxDrawdown = Math.max(maxDrawdown, peak - equity);

    if (profit > 0) {
      currentWinStreak += 1;
      currentLossStreak = 0;
    } else if (profit < 0) {
      currentLossStreak += 1;
      currentWinStreak = 0;
    } else {
      currentWinStreak = 0;
      currentLossStreak = 0;
    }
    maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
    maxLossStreak = Math.max(maxLossStreak, currentLossStreak);

    return { index, equity, drawdown: peak - equity };
  });

  const count = rows.length;
  const net = profits.reduce((sum, value) => sum + value, 0);
  const avgWin = wins.length ? grossProfit / wins.length : 0;
  const avgLoss = losses.length ? -grossLoss / losses.length : 0;
  const expectancy = count ? net / count : 0;
  const payoffRatio = avgLoss ? avgWin / Math.abs(avgLoss) : avgWin > 0 ? 99 : 0;

  return {
    net,
    count,
    wins: wins.length,
    losses: losses.length,
    winRate: count ? (wins.length / count) * 100 : 0,
    pf: grossLoss ? grossProfit / grossLoss : wins.length ? 99 : 0,
    dd: maxDrawdown,
    avgWin,
    avgLoss,
    expectancy,
    payoffRatio,
    maxWinStreak,
    maxLossStreak,
    grossProfit,
    grossLoss,
    equityCurve,
  };
}

export const yen = (value) => `${value >= 0 ? '+' : ''}${Math.round(value).toLocaleString()} 円`;

export function groupStats(rows, key) {
  return rows.reduce((acc, row) => {
    const label = row[key] || '不明';
    if (!acc[label]) acc[label] = { profit: 0, count: 0, wins: 0, losses: 0 };
    const profit = num(row.profit);
    acc[label].profit += profit;
    acc[label].count += 1;
    if (profit > 0) acc[label].wins += 1;
    if (profit < 0) acc[label].losses += 1;
    return acc;
  }, {});
}

export function groupData(rows, key) {
  return Object.fromEntries(Object.entries(groupStats(rows, key)).map(([label, stats]) => [label, stats.profit]));
}

export function rankedGroups(rows, key) {
  return Object.entries(groupStats(rows, key))
    .map(([label, stats]) => ({
      label,
      ...stats,
      winRate: stats.count ? (stats.wins / stats.count) * 100 : 0,
      expectancy: stats.count ? stats.profit / stats.count : 0,
    }))
    .sort((a, b) => b.profit - a.profit);
}

export function groupBest(rows, key) {
  return rankedGroups(rows, key)[0]?.label || 'データ待ち';
}

export function groupWorst(rows, key) {
  const ranked = rankedGroups(rows, key);
  return ranked[ranked.length - 1]?.label || 'データ待ち';
}

export function dailySeries(rows) {
  const grouped = groupStats(rows, 'date');
  return Object.entries(grouped)
    .filter(([date]) => date && date !== '不明')
    .sort(([a], [b]) => String(a).localeCompare(String(b)))
    .map(([label, stats]) => ({ label, value: stats.profit }));
}

export function rollingWinRate(rows, windowSize = 5) {
  return rows.map((_, index) => {
    const start = Math.max(0, index - windowSize + 1);
    const slice = rows.slice(start, index + 1);
    const wins = slice.filter((row) => num(row.profit) > 0).length;
    return { index, value: slice.length ? (wins / slice.length) * 100 : 0 };
  });
}

export function buildDiagnosis(rows, metrics) {
  const bestSession = rankedGroups(rows, 'session')[0];
  const worstSession = rankedGroups(rows, 'session').at(-1);
  const bestWeekday = rankedGroups(rows, 'weekday')[0];
  const worstSymbol = rankedGroups(rows, 'symbol').at(-1);

  const riskScore = Math.min(
    100,
    Math.round(
      (metrics.pf < 1 ? 30 : metrics.pf < 1.3 ? 15 : 0) +
      (metrics.maxLossStreak >= 3 ? 22 : metrics.maxLossStreak * 5) +
      (metrics.dd > Math.abs(metrics.net) && metrics.dd > 0 ? 22 : 0) +
      (metrics.winRate < 45 ? 18 : metrics.winRate < 55 ? 8 : 0) +
      (metrics.count < 5 ? 8 : 0)
    )
  );

  let riskLabel = '低';
  if (riskScore >= 65) riskLabel = '高';
  else if (riskScore >= 35) riskLabel = '中';

  const maxTrades = riskLabel === '高' ? 1 : riskLabel === '中' ? 2 : 3;
  const lotPolicy = riskLabel === '高' ? '半分' : '固定';

  const headline = riskLabel === '高'
    ? '今日は守る日です。回数とロットを抑えましょう。'
    : metrics.pf >= 1.3
      ? '状態は比較的安定しています。得意条件だけを選びましょう。'
      : '無理に増やさず、再現性の高い条件だけに絞りましょう。';

  const rules = [
    `最大${maxTrades}回まで。ロットは${lotPolicy}。`,
    `損切り位置を途中で広げない。最大連敗は${metrics.maxLossStreak}回。`,
    bestSession ? `${bestSession.label}の得意条件を優先する。` : 'データが増えるまでは条件を固定する。',
  ];

  return {
    riskScore,
    riskLabel,
    maxTrades,
    lotPolicy,
    headline,
    bestSession,
    worstSession,
    bestWeekday,
    worstSymbol,
    rules,
  };
}

export function filterRows(rows, filters) {
  return rows.filter((row) => {
    if (filters.session !== 'すべて' && row.session !== filters.session) return false;
    if (filters.weekday !== 'すべて' && row.weekday !== filters.weekday) return false;
    if (filters.symbol !== 'すべて' && row.symbol !== filters.symbol) return false;
    return true;
  });
}

export function uniqueValues(rows, key) {
  return [...new Set(rows.map((row) => row[key]).filter(Boolean))];
}
