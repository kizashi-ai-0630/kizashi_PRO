import { useRef } from 'react';
import { useTradeData } from '../context/TradeDataContext';

export function LoadingSkeleton({ label = 'データを準備しています' }) {
  return <div className="state-shell" role="status" aria-live="polite">
    <div className="state-card skeleton-card">
      <span className="release-chip">KIZASHI 9.12</span>
      <div className="spinner" aria-hidden="true" />
      <h2>{label}</h2>
      <div className="skeleton-line wide"/><div className="skeleton-line"/><div className="skeleton-grid"><i/><i/><i/></div>
    </div>
  </div>;
}

export function CsvEmptyState() {
  const input = useRef(null);
  const { importTradeFile } = useTradeData();
  return <div className="state-shell">
    <section className="state-card empty-state">
      <span className="release-chip">KIZASHI 9.12</span>
      <div className="state-icon">DATA</div>
      <h1>取引履歴を読み込んでください</h1>
      <p>取引履歴を読み込むと、分析・AIコーチ・成長記録が自動で表示されます。</p>
      <input ref={input} type="file" accept=".csv,.html,.htm,text/csv,text/html" hidden onChange={(event) => importTradeFile(event.target.files?.[0])}/>
      <button className="state-primary" onClick={() => input.current?.click()}>取引履歴を選択</button>
      <small>対応形式：MT5 CSV ／ MT4 詳細レポート HTML・HTM</small>
    </section>
  </div>;
}

export function CsvErrorState({ message }) {
  const input = useRef(null);
  const { importTradeFile, clearDataError } = useTradeData();
  return <div className="state-shell">
    <section className="state-card error-state">
      <span className="release-chip">KIZASHI 9.12</span>
      <div className="state-icon">!</div>
      <h1>取引履歴を読み込めませんでした</h1>
      <p>{message || 'ファイル形式や内容を確認して、もう一度読み込んでください。'}</p>
      <input ref={input} type="file" accept=".csv,.html,.htm,text/csv,text/html" hidden onChange={(event) => importTradeFile(event.target.files?.[0])}/>
      <div className="state-actions"><button className="state-primary" onClick={() => input.current?.click()}>別のファイルを選択</button><button onClick={clearDataError}>閉じる</button></div>
    </section>
  </div>;
}
