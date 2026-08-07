import { useEffect, useRef, useState } from 'react';

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
    setMessage(pageMessages[page] || LINES[Math.floor(Math.random() * LINES.length)]);
  }, [page]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!open) setMessage(LINES[Math.floor(Math.random() * LINES.length)]);
    }, 22000);
    return () => window.clearInterval(timer);
  }, [open]);

  const onPointerDown = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    drag.current = { dx: event.clientX - rect.left, dy: event.clientY - rect.top };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const onPointerMove = (event) => {
    if (!drag.current) return;
    const x = Math.max(8, Math.min(window.innerWidth - 112, event.clientX - drag.current.dx));
    const y = Math.max(72, Math.min(window.innerHeight - 150, event.clientY - drag.current.dy));
    setPosition({ x, y });
  };
  const onPointerUp = () => {
    if (!drag.current) return;
    drag.current = null;
    localStorage.setItem('kizashi_kun_position', JSON.stringify(position));
  };

  const ask = () => {
    const text = draft.trim();
    if (!text) return;
    sessionStorage.setItem('kizashi_pending_prompt', text);
    setDraft('');
    setOpen(false);
    go('coach');
  };

  const style = position.x == null ? undefined : { left: position.x, top: position.y, right: 'auto', bottom: 'auto' };
  return <div className="kizashi-kun-wrap" style={style}>
    {message && <button className="kizashi-speech" onClick={() => setOpen(v => !v)}>{message}</button>}
    {open && <div className="kizashi-mini-chat">
      <b>きざしくんに聞く</b>
      <textarea value={draft} onChange={e => setDraft(e.target.value)} placeholder="相場や自分の成績について聞いてね" rows={3}/>
      <div><button onClick={() => setOpen(false)}>閉じる</button><button className="primary" onClick={ask}>AIコーチへ送る</button></div>
    </div>}
    <button
      className="kizashi-kun"
      aria-label="きざしくん。ドラッグで移動、クリックで会話"
      title="ドラッグで移動できます"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onClick={() => setOpen(v => !v)}
    >
      <img src="/assets/kizashikun.png" alt="きざしくん" draggable="false"/>
      <span className="kizashi-kun-status">K</span>
    </button>
  </div>;
}
