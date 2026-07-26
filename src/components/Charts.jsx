import { yen } from '../utils/metrics';

function EmptyChart({ text = '表示できるデータがありません' }) {
  return <div className="empty-chart">{text}</div>;
}

export function Equity({ rows }) {
  if (!rows.length) return <EmptyChart />;
  let sum = 0;
  const pts = rows.map((row, index) => {
    sum += Number(row.profit) || 0;
    return [index, sum];
  });
  const values = pts.map(([, value]) => value);
  const min = Math.min(0, ...values);
  const max = Math.max(1, ...values);
  const width = 700;
  const height = 260;
  const xy = pts.map(([index, value]) => ({
    x: 40 + (index * (width - 80)) / Math.max(1, pts.length - 1),
    y: height - 30 - ((value - min) / (max - min || 1)) * (height - 60),
  }));
  const line = xy.map(({ x, y }) => `${x},${y}`).join(' ');
  const area = `40,${height - 30} ${line} ${xy.at(-1)?.x || 40},${height - 30}`;

  return <svg className="chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="累積損益推移">
    <defs>
      <linearGradient id="equityArea" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#20c9e7" stopOpacity=".28"/>
        <stop offset="1" stopColor="#20c9e7" stopOpacity="0"/>
      </linearGradient>
    </defs>
    <g className="grid-lines">{[0,1,2,3,4].map((index) => <line key={index} x1="40" x2={width - 20} y1={30 + index * 48} y2={30 + index * 48}/>)}</g>
    <polygon points={area} fill="url(#equityArea)"/>
    <polyline points={line} fill="none" stroke="#20c9e7" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round"/>
    {xy.map(({ x, y }, index) => <circle key={index} cx={x} cy={y} r="4" fill="#fff" stroke="#15aaca" strokeWidth="3"><title>{`${index + 1}回目: ${yen(values[index])}`}</title></circle>)}
  </svg>;
}

export function DrawdownChart({ curve }) {
  if (!curve?.length) return <EmptyChart />;
  const width = 700;
  const height = 230;
  const max = Math.max(1, ...curve.map((point) => point.drawdown));
  const points = curve.map((point, index) => {
    const x = 40 + (index * (width - 80)) / Math.max(1, curve.length - 1);
    const y = 25 + (point.drawdown / max) * (height - 55);
    return `${x},${y}`;
  }).join(' ');
  return <svg className="chart compact" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="ドローダウン推移">
    <g className="grid-lines">{[0,1,2,3].map((index) => <line key={index} x1="40" x2={width - 20} y1={30 + index * 50} y2={30 + index * 50}/>)}</g>
    <polyline points={points} fill="none" stroke="#ef5968" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round"/>
  </svg>;
}

export function Bars({ data, valueKey = null }) {
  const entries = Array.isArray(data)
    ? data.map((item) => [item.label, valueKey ? item[valueKey] : item.value ?? item.profit])
    : Object.entries(data || {});
  if (!entries.length) return <EmptyChart />;
  const max = Math.max(1, ...entries.map(([, value]) => Math.abs(Number(value) || 0)));
  return <div className="bars">{entries.map(([label, raw]) => {
    const value = Number(raw) || 0;
    return <div key={label}><span>{label}</span><i className={value < 0 ? 'neg' : ''} style={{ height: `${30 + Math.abs(value) / max * 150}px` }}/><b>{yen(value)}</b></div>;
  })}</div>;
}

export function WinRateBars({ data }) {
  if (!data?.length) return <EmptyChart />;
  return <div className="horizontal-bars">{data.map((item) => <div key={item.label}>
    <div className="horizontal-label"><span>{item.label}</span><b>{item.winRate.toFixed(1)}%</b></div>
    <div className="horizontal-track"><i style={{ width: `${Math.min(100, item.winRate)}%` }}/></div>
    <small>{item.count}件・損益 {yen(item.profit)}</small>
  </div>)}</div>;
}
