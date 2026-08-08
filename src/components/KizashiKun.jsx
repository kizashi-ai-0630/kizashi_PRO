import { useEffect, useRef, useState } from 'react';
import { useApiKey } from '../context/ApiKeyContext';
import { useTradeData } from '../context/TradeDataContext';
import { trackEvent } from '../utils/analytics';

const LINES = [
  '相場を見ながら、焦らずいこう。',
  '条件が揃うまで待つのも立派な判断だよ。',
  'ロットと損切り位置を先に確認しよう。',
  '今日のルール、守れてる？',
  'チャートの見過ぎには気をつけてね。',
];

export default function KizashiKun({ page, go }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('きざしくんです。今日も一緒に見ていこう🌊');
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatLog, setChatLog] = useState([]);
  const [dragging, setDragging] = useState(false);
  const { apiKey, hasApiKey } = useApiKey();
  const { rows, metrics, diagnosis, intelligence } = useTradeData();
  const [position, setPosition] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('kizashi_kun_position') || 'null');
      return saved || { x: null, y: null };
    } catch { return { x: null, y: null }; }
  });
  const drag = useRef(null);

  useEffect(() => {
    const pageMessages = {
      live: 'LIVEチャートを表示中。値動きが速い時ほど落ち着こう。',
      analysis: '成績の良い時間帯と悪い時間帯を比べてみよう。',
      coach: '相談したいことを、そのまま話しかけてね。',
      guardian: 'Guardianの条件を確認しているよ。',
      brain: '今日の作戦を一緒に確認しよう。',
      records: '記録を残すほど、次の判断が楽になるよ。',
      growth: '昨日より少しでも前進できたら十分だよ。',
      settings: '設定で自分に合う使い方へ整えよう。',
    };
    if (!loading) setMessage(pageMessages[page] || LINES[Math.floor(Math.random() * LINES.length)]);
  }, [page]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!open && !loading) setMessage(LINES[Math.floor(Math.random() * LINES.length)]);
    }, 22000);
    return () => window.clearInterval(timer);
  }, [open, loading]);

  const onPointerDown = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const wrap = event.currentTarget.closest('.kizashi-kun-wrap');
    const rect = wrap?.getBoundingClientRect();
    if (!rect) return;
    drag.current = { dx: event.clientX - rect.left, dy: event.clientY - rect.top };
    setDragging(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const onPointerMove = (event) => {
    if (!drag.current) return;
    const x = Math.max(8, Math.min(window.innerWidth - 112, event.clientX - drag.current.dx));
    const y = Math.max(72, Math.min(window.innerHeight - 150, event.clientY - drag.current.dy));
    setPosition({ x, y });
  };
  const onPointerUp = (event) => {
    if (!drag.current) return;
    drag.current = null;
    setDragging(false);
    event?.currentTarget?.releasePointerCapture?.(event.pointerId);
    localStorage.setItem('kizashi_kun_position', JSON.stringify(position));
  };

  const ask = async () => {
    const text = draft.trim();
    if (!text || loading) return;
    if (!hasApiKey) {
      setMessage('AIで答えるにはOpenAI APIキーが必要だよ。管理画面で設定してね。ここから勝手に移動はしないよ。');
      return;
    }

    setLoading(true);
    setMessage('考え中…');
    const route = rows.length ? 'analysis' : 'chat';
    const normalizedMetrics = {
      ...metrics,
      netProfit: metrics.net,
      profitFactor: metrics.pf,
      maxDrawdown: metrics.dd,
      averageWin: metrics.avgWin,
      averageLoss: metrics.avgLoss,
    };
    try {
      trackEvent('ai_chat', { source: 'kizashikun_floating', route, page, trade_count: rows.length });
      const response = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-OpenAI-API-Key': apiKey },
        body: JSON.stringify({
          message: text,
          history: chatLog.slice(-6),
          route,
          metrics: normalizedMetrics,
          diagnosis,
          intelligence,
          rows: route === 'analysis' ? rows.slice(-20) : [],
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'AIとの通信に失敗しました。');
      const answer = String(data.answer || '').trim();
      if (!answer) throw new Error('返答を受け取れませんでした。');
      setMessage(answer);
      setChatLog(current => [...current, { role: 'user', text }, { role: 'assistant', text: answer }].slice(-12));
      setDraft('');
    } catch (error) {
      setMessage(`${error.message} 少し待って、もう一度ここで聞いてみてね。`);
    } finally {
      setLoading(false);
    }
  };

  const style = position.x == null ? undefined : { left: position.x, top: position.y, right: 'auto', bottom: 'auto' };
  return <div className={`kizashi-kun-wrap${dragging ? ' dragging' : ''}`} style={style}>
    {message && <button className="kizashi-speech" onClick={() => setOpen(v => !v)}>{message}</button>}
    {open && <div className="kizashi-mini-chat">
      <b>きざしくんに聞く <span className={loading ? 'thinking' : 'online'}>{loading ? '● 考え中' : '● オンライン'}</span></b>
      <div className="kizashi-mini-reply">{message}</div>
      <textarea value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(); } }} placeholder="相場や自分の成績について聞いてね" rows={3}/>
      <div><button onClick={() => setOpen(false)}>閉じる</button><button className="primary" onClick={ask} disabled={loading}>{loading ? '考え中…' : 'ここで聞く'}</button></div>
    </div>}
    <button
      className="kizashi-kun"
      aria-label="きざしくん。クリックで会話"
      title="クリックで会話できます"
      onClick={() => setOpen(v => !v)}
    >
      <img src="/assets/kizashikun.png" alt="きざしくん" draggable="false"/>
      <span className="kizashi-kun-status">K</span>
    </button>
    <button
      className="kizashi-drag-handle"
      type="button"
      aria-label="きざしくんを移動"
      title="ここをつかんで移動"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClick={(event) => event.stopPropagation()}
    >
      <span>✥</span>
    </button>
  </div>;
}
