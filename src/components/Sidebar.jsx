import { useEffect, useRef, useState } from 'react';
import { useTradeData } from '../context/TradeDataContext';
import { useNotice } from '../context/NoticeContext';

export const MENU = [['home','⌂','ホーム'],['live','📈','Live'],['brain','✦','今日の作戦'],['analysis','⌁','分析'],['coach','◎','AIコーチ'],['guardian','🛡','Guardian'],['growth','↗','成長'],['records','▣','記録'],['settings','⚙','管理'],['analytics','🔒','管理者']];

const GUIDE = {
  mt4: {
    title: 'MT4 詳細レポート（HTML）の取得方法',
    accent: 'mt4',
    steps: ['MT4を開く', '画面下の「ターミナル」を開く', '「口座履歴」タブを選ぶ', '履歴一覧の上で右クリック', '「詳細レポートの保存」を選ぶ', '保存した .html / .htm をKIZASHIへ読み込む'],
  },
  mt5: {
    title: 'MT5 CSVの取得方法',
    accent: 'mt5',
    steps: ['MT5を開く', '画面下の「ツールボックス」を開く', '「口座履歴」タブを選ぶ', '履歴一覧の上で右クリック', '「レポート」を選ぶ', 'CSV形式で保存する', '保存した .csv をKIZASHIへ読み込む'],
  },
};

export default function Sidebar({ page, go }) {
  const input = useRef(null);
  const [guide, setGuide] = useState(null);
  const [dragging, setDragging] = useState(false);
  const { rows, fileName, fileType, importTradeFile, clearRows } = useTradeData();
  const { notify } = useNotice();

  const loadFile = async (file) => {
    if (!file) return;
    const ok = await importTradeFile(file);
    notify(ok ? '取引履歴を読み込みました' : '取引履歴の読み込みに失敗しました', ok ? 'success' : 'error', 5000);
  };

  const load = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    await loadFile(file);
  };

  const onDrop = async (event) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    const ext = file.name.toLowerCase().split('.').pop();
    if (!['csv', 'html', 'htm'].includes(ext)) {
      notify('対応形式はMT4 HTMLまたはMT5 CSVです', 'error', 5000);
      return;
    }
    await loadFile(file);
  };

  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') setGuide(null); };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, []);

  return <>
    <aside className="sidebar">
      <div className="brand"><div className="logo">🌊</div><div className="word">KIZASHI</div><small>Trading Assistant</small></div>
      <nav>{MENU.map(([id, icon, title]) => <button key={id} className={page === id ? 'active' : ''} onClick={() => go(id)}><span>{icon}</span>{title}</button>)}</nav>
      <div className="csv">
        <b>取引履歴</b>
        <div className="csv-card">
          <div className={rows.length ? 'loaded' : 'not-loaded'}>{rows.length ? '✓ 読込済み' : 'ファイル未選択'}</div>
          <div className="filename">{fileName}</div>
          <small>総取引数 {rows.length}件</small><small className="file-format">{fileType === 'mt4-html' ? 'MT4 HTML' : fileType === 'csv' ? 'MT5 CSV' : ''}</small>
          <div className="supported-formats">対応形式：MT4（HTML）・MT5（CSV）</div>
          <input ref={input} type="file" accept=".csv,.html,.htm,text/csv,text/html" hidden onChange={load}/>
          <div className="history-file-actions">
            <button onClick={() => input.current?.click()}>{rows.length ? 'ファイルを変更' : 'ファイルを選択'}</button>
            <button className="danger" onClick={() => { if(confirm('読み込んだ取引履歴を解除しますか？')) { clearRows(); notify('取引履歴を解除しました', 'info'); } }}>履歴を解除</button>
          </div>
          <button className="history-guide-button" onClick={() => setGuide('choose')}>📖 データの取得方法</button>
        </div>
      </div>
      <footer>© 2026 KIZASHI<br/>All rights reserved.</footer>
    </aside>

    {guide && <div className="history-guide-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setGuide(null); }}>
      <section className="history-guide-modal" role="dialog" aria-modal="true" aria-label="取引履歴の取得方法">
        <header>
          <div><small>KIZASHI DATA GUIDE</small><h2>📂 トレード履歴を読み込む</h2><p>MT4・MT5から履歴を保存し、そのままKIZASHIへ読み込めます。</p></div>
          <button className="history-guide-close" onClick={() => setGuide(null)} aria-label="閉じる">×</button>
        </header>
        <div className="history-guide-body">
          <div className="format-badges"><span>✓ MT4 詳細レポート（HTML）</span><span>✓ MT5 CSV</span></div>

          {guide === 'choose' ? <div className="platform-choice">
            <button className="platform-card mt4" onClick={() => setGuide('mt4')}><strong>🟦 MT4の取得方法</strong><small>詳細レポート（HTML）を保存します</small><span>手順を見る →</span></button>
            <button className="platform-card mt5" onClick={() => setGuide('mt5')}><strong>🟩 MT5の取得方法</strong><small>口座履歴をCSVで保存します</small><span>手順を見る →</span></button>
          </div> : <>
            <button className="guide-back" onClick={() => setGuide('choose')}>← MT4・MT5の選択へ戻る</button>
            <div className={`guide-steps ${GUIDE[guide].accent}`}>
              <h3>{GUIDE[guide].title}</h3>
              <ol>{GUIDE[guide].steps.map((step, index) => <li key={step}><b>{index + 1}</b><span>{step}</span></li>)}</ol>
              <div className="visual-guide-note">📷 画面上では、太字のメニュー名を順番に選んでください。</div>
            </div>
          </>}

          <div
            className={`history-dropzone ${dragging ? 'dragging' : ''}`}
            onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            <div className="drop-icon">📂</div>
            <strong>ここへドラッグ＆ドロップ</strong>
            <span>または</span>
            <button onClick={() => input.current?.click()}>ファイルを選択</button>
            <small>対応形式：.html / .htm / .csv</small>
          </div>
          <p className="guide-help">💡 分からない場合は、MT4またはMT5の「手順を見る」を押してください。</p>
        </div>
      </section>
    </div>}
  </>;
}
