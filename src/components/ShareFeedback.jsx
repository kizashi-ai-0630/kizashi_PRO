import { useMemo, useState } from 'react';
import { useTradeData } from '../context/TradeDataContext';
import { useNotice } from '../context/NoticeContext';
import { yen } from '../utils/metrics';

const SITE_URL = 'https://kizashi-pro.vercel.app/';
const REPO_ISSUES_URL = 'https://github.com/kizashi-ai-0630/kizashi_PRO/issues/new';

function buildShareText(metrics, score, ready) {
  if (!ready) return `FXトレード分析アプリ「KIZASHI」β版を公開中🌊\n迷いを、確信へ。\n${SITE_URL}\n#KIZASHI #FX`;
  return `KIZASHI SCORE：${score}\n純損益：${yen(metrics.net)}｜勝率：${metrics.winRate.toFixed(1)}%｜PF：${metrics.pf.toFixed(2)}\n「迷いを、確信へ。」\n${SITE_URL}\n#KIZASHI #FX`;
}

function drawShareCard(metrics, score) {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 675;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 1200, 675);
  grad.addColorStop(0, '#f7fdff');
  grad.addColorStop(.56, '#dff8fb');
  grad.addColorStop(1, '#087d94');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1200, 675);
  ctx.fillStyle = 'rgba(255,255,255,.78)';
  ctx.roundRect(70, 60, 1060, 555, 36);
  ctx.fill();
  ctx.fillStyle = '#0a3853';
  ctx.font = '700 28px Arial';
  ctx.fillText('KIZASHI · TRADING ASSISTANT', 120, 125);
  ctx.font = '700 54px Arial';
  ctx.fillText('迷いを、確信へ。', 120, 205);
  ctx.fillStyle = '#078da3';
  ctx.font = '700 24px Arial';
  ctx.fillText('KIZASHI SCORE', 120, 285);
  ctx.fillStyle = '#082f48';
  ctx.font = '700 110px Georgia';
  ctx.fillText(String(score), 120, 400);
  const cards = [
    ['純損益', yen(metrics.net)],
    ['勝率', `${metrics.winRate.toFixed(1)}%`],
    ['Profit Factor', metrics.pf.toFixed(2)],
    ['取引数', `${metrics.count}回`],
  ];
  cards.forEach(([label, value], i) => {
    const x = 520 + (i % 2) * 280;
    const y = 250 + Math.floor(i / 2) * 145;
    ctx.fillStyle = 'rgba(255,255,255,.72)';
    ctx.roundRect(x, y, 250, 115, 22);
    ctx.fill();
    ctx.fillStyle = '#557181';
    ctx.font = '700 18px Arial';
    ctx.fillText(label, x + 24, y + 34);
    ctx.fillStyle = '#0b3852';
    ctx.font = '700 30px Arial';
    ctx.fillText(value, x + 24, y + 78);
  });
  ctx.fillStyle = '#416578';
  ctx.font = '500 20px Arial';
  ctx.fillText(SITE_URL, 120, 565);
  return canvas;
}

export default function ShareFeedback() {
  const { rows, metrics, intelligence } = useTradeData();
  const { notify } = useNotice();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [category, setCategory] = useState('改善提案');
  const [message, setMessage] = useState('');
  const ready = rows.length > 0;
  const score = ready ? intelligence.score : '—';
  const shareText = useMemo(() => buildShareText(metrics, score, ready), [metrics, score, ready]);

  const openX = () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, '_blank', 'noopener,noreferrer');
  const nativeShare = async () => {
    try {
      if (navigator.share) await navigator.share({ title: 'KIZASHI', text: shareText, url: SITE_URL });
      else { await navigator.clipboard.writeText(shareText); notify('投稿文をコピーしました', 'success'); }
    } catch (error) { if (error?.name !== 'AbortError') notify('共有を開始できませんでした', 'error'); }
  };
  const shareImage = async () => {
    if (!ready) { notify('成績画像は取引履歴を読み込むと作成できます', 'info'); return; }
    const canvas = drawShareCard(metrics, score);
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], 'kizashi-result.png', { type: 'image/png' });
      try {
        if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], text: shareText });
        else {
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 1000);
          notify('成績画像を保存しました', 'success');
        }
      } catch (error) { if (error?.name !== 'AbortError') notify('画像を共有できませんでした', 'error'); }
    }, 'image/png');
  };
  const sendFeedback = () => {
    if (message.trim().length < 5) { notify('内容を5文字以上入力してください', 'error'); return; }
    const title = `[${category}] KIZASHI β フィードバック`;
    const body = `${message.trim()}\n\n---\n画面: ${location.hash || '#home'}\n端末: ${navigator.userAgent}\n日時: ${new Date().toLocaleString('ja-JP')}`;
    const url = `${REPO_ISSUES_URL}?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    setMessage(''); setFeedbackOpen(false);
    notify('GitHubの送信画面を開きました', 'success');
  };

  return <>
    <div className="utility-fab" aria-label="共有とフィードバック">
      <button onClick={() => setShareOpen(true)} title="KIZASHIを共有">↗<span>シェア</span></button>
      <button onClick={() => setFeedbackOpen(true)} title="フィードバックを送る">💬<span>意見</span></button>
    </div>

    {shareOpen && <div className="utility-modal-backdrop" onMouseDown={() => setShareOpen(false)}>
      <section className="utility-modal" onMouseDown={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="KIZASHIを共有">
        <button className="utility-close" onClick={() => setShareOpen(false)}>×</button>
        <small>SHARE KIZASHI</small><h2>KIZASHIを広める</h2><p>投稿文や成績カードを使って共有できます。</p>
        <div className="share-preview"><pre>{shareText}</pre></div>
        <div className="utility-actions">
          <button className="primary" onClick={openX}>𝕏 に投稿</button>
          <button onClick={nativeShare}>共有メニュー</button>
          <button onClick={shareImage} disabled={!ready}>成績画像を作る</button>
        </div>
      </section>
    </div>}

    {feedbackOpen && <div className="utility-modal-backdrop" onMouseDown={() => setFeedbackOpen(false)}>
      <section className="utility-modal" onMouseDown={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="フィードバック">
        <button className="utility-close" onClick={() => setFeedbackOpen(false)}>×</button>
        <small>FEEDBACK</small><h2>ご意見・不具合を送る</h2><p>使いにくいところや欲しい機能を教えてください。</p>
        <label>種類<select value={category} onChange={e => setCategory(e.target.value)}><option>不具合</option><option>改善提案</option><option>欲しい機能</option><option>その他</option></select></label>
        <label>内容<textarea rows="6" value={message} onChange={e => setMessage(e.target.value)} placeholder="気になった画面や操作をできるだけ詳しく書いてください"/></label>
        <p className="utility-note">送信時にGitHubの投稿画面が開きます。アカウントがない場合は内容をコピーして送れます。</p>
        <div className="utility-actions">
          <button className="primary" onClick={sendFeedback}>送信画面を開く</button>
          <button onClick={async () => { await navigator.clipboard.writeText(`[${category}] ${message}`); notify('フィードバックをコピーしました', 'success'); }}>内容をコピー</button>
        </div>
      </section>
    </div>}
  </>;
}
