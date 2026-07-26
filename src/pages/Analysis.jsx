import { useMemo, useState } from 'react';
import Page from '../components/Page';
import Kpis from '../components/Kpis';
import { Bars, DrawdownChart, Equity, WinRateBars } from '../components/Charts';
import { useTradeData } from '../context/TradeDataContext';
import { calculateMetrics, filterRows, rankedGroups, uniqueValues, yen } from '../utils/metrics';
import { heatmapData, monthlyStats } from '../utils/aiEngine';

const DEFAULT_FILTERS = { symbol: 'すべて', session: 'すべて', weekday: 'すべて' };

export default function Analysis() {
  const { rows } = useTradeData();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const filteredRows = useMemo(() => filterRows(rows, filters), [rows, filters]);
  const metrics = useMemo(() => calculateMetrics(filteredRows), [filteredRows]);
  const sessions = useMemo(() => rankedGroups(filteredRows, 'session'), [filteredRows]);
  const weekdays = useMemo(() => rankedGroups(filteredRows, 'weekday'), [filteredRows]);
  const symbols = useMemo(() => rankedGroups(filteredRows, 'symbol'), [filteredRows]);
  const heatmap = useMemo(() => heatmapData(filteredRows), [filteredRows]);
  const months = useMemo(() => monthlyStats(filteredRows), [filteredRows]);

  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));

  return <Page title="トレード分析" sub="CSVから勝ちパターン・弱点・再現性を自動分析">
    <div className="performance dark-card">
      <b>📊 KIZASHI PERFORMANCE VIEW</b>
      <p>フィルターはこの画面だけに適用され、元のCSVは変更されません。現在 {filteredRows.length} / {rows.length}件を表示中です。</p>
    </div>

    <div className="filter-bar">
      <label>通貨ペア<select value={filters.symbol} onChange={(event) => setFilter('symbol', event.target.value)}><option>すべて</option>{uniqueValues(rows, 'symbol').map((value) => <option key={value}>{value}</option>)}</select></label>
      <label>時間帯<select value={filters.session} onChange={(event) => setFilter('session', event.target.value)}><option>すべて</option>{uniqueValues(rows, 'session').map((value) => <option key={value}>{value}</option>)}</select></label>
      <label>曜日<select value={filters.weekday} onChange={(event) => setFilter('weekday', event.target.value)}><option>すべて</option>{uniqueValues(rows, 'weekday').map((value) => <option key={value}>{value}</option>)}</select></label>
      <button onClick={() => setFilters(DEFAULT_FILTERS)}>絞り込み解除</button>
    </div>

    <Kpis metrics={metrics}/>

    <div className="advanced-kpis">
      <div><small>期待値 / 1取引</small><strong>{yen(metrics.expectancy)}</strong></div>
      <div><small>平均利益</small><strong>{yen(metrics.avgWin)}</strong></div>
      <div><small>平均損失</small><strong>{yen(metrics.avgLoss)}</strong></div>
      <div><small>ペイオフレシオ</small><strong>{metrics.payoffRatio.toFixed(2)}</strong></div>
      <div><small>最大連勝</small><strong>{metrics.maxWinStreak}回</strong></div>
      <div><small>最大連敗</small><strong>{metrics.maxLossStreak}回</strong></div>
    </div>

    <div className="analysis-grid wide">
      <div className="chart-card"><h2>累積損益</h2><Equity rows={filteredRows}/></div>
      <div className="chart-card"><h2>ドローダウン推移</h2><DrawdownChart curve={metrics.equityCurve}/></div>
      <div className="chart-card"><h2>時間帯別損益</h2><Bars data={sessions}/></div>
      <div className="chart-card"><h2>曜日別勝率</h2><WinRateBars data={weekdays}/></div>
      <div className="chart-card"><h2>通貨ペア別</h2><WinRateBars data={symbols}/></div>
      <div className="chart-card insight-card"><h2>AI分析サマリー</h2>
        <p><b>利益が最も出ている時間帯：</b>{sessions[0]?.label || 'データ待ち'}（{yen(sessions[0]?.profit || 0)}）</p>
        <p><b>改善候補：</b>{sessions.at(-1)?.label || 'データ待ち'}（{yen(sessions.at(-1)?.profit || 0)}）</p>
        <p><b>勝率が高い曜日：</b>{[...weekdays].sort((a,b)=>b.winRate-a.winRate)[0]?.label || 'データ待ち'}</p>
        <p><b>判定：</b>{metrics.pf >= 1.5 ? '優位性が確認できます。得意条件を崩さず再現しましょう。' : metrics.pf >= 1 ? '利益は出ていますが、損失管理を改善すると安定度が上がります。' : '取引条件を絞り、まずPF 1.0回復を優先しましょう。'}</p>
      </div>
      <div className="chart-card heatmap-card"><h2>曜日 × 時間帯ヒートマップ</h2><Heatmap data={heatmap}/></div>
      <div className="chart-card"><h2>月別パフォーマンス</h2><Monthly data={months}/></div>
    </div>
  </Page>;
}

function Heatmap({ data }) {
  if (!data.sessions.length) return <div className="empty-chart">時間帯データがありません</div>;
  const values = Object.values(data.map).map((x) => x.profit);
  const max = Math.max(1, ...values.map(Math.abs));
  return <div className="heatmap" style={{ "--cols": data.sessions.length }}><div className="heatmap-head" style={{ gridTemplateColumns: `55px repeat(${data.sessions.length}, minmax(105px, 1fr))` }}><span/> {data.sessions.map((session) => <b key={session}>{session}</b>)}</div>{data.weekdays.map((day) => <div className="heatmap-row" key={day} style={{ gridTemplateColumns: `55px repeat(${data.sessions.length}, minmax(105px, 1fr))` }}><b>{day}</b>{data.sessions.map((session) => { const cell = data.map[`${day}|${session}`]; const value = cell?.profit || 0; const alpha = .12 + Math.abs(value) / max * .72; return <div key={session} className={value >= 0 ? 'positive-cell' : 'negative-cell'} style={{ '--alpha': alpha }} title={`${day}曜日 ${session}: ${yen(value)}`}><strong>{cell ? yen(value) : '—'}</strong><small>{cell ? `${cell.count}件 / ${((cell.wins / cell.count) * 100).toFixed(0)}%` : ''}</small></div>; })}</div>)}</div>;
}

function Monthly({ data }) {
  if (!data.length) return <div className="empty-chart">日付データが増えると月別分析を表示します</div>;
  const max = Math.max(1, ...data.map((x) => Math.abs(x.profit)));
  return <div className="monthly-bars">{data.map((item) => <div key={item.label}><span>{item.label}</span><div><i className={item.profit < 0 ? 'negative' : ''} style={{ width: `${Math.max(4, Math.abs(item.profit) / max * 100)}%` }}/></div><b>{yen(item.profit)}</b><small>{item.count}件・勝率{item.winRate.toFixed(0)}%</small></div>)}</div>;
}
