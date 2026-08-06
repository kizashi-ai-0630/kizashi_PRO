import { useEffect, useMemo, useRef, useState } from 'react';
import Page from '../components/Page';
import { useTradeData } from '../context/TradeDataContext';
import { answerWithIntelligence } from '../utils/aiEngine';
import { yen } from '../utils/metrics';
import { useApiKey } from '../context/ApiKeyContext';
import { trackEvent } from '../utils/analytics';

const CHAT_KEY = 'kizashi_ai_chat_v920';
const MEMORY_KEY = 'kizashi_ai_memory_v920';
const VISION_KEY = 'kizashi_ai_vision_cache_v920';
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const loadJson = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; } };
const today = () => new Date().toLocaleDateString('ja-JP');

function inferMemory(text) {
  const value = String(text || '').trim();
  if (!value) return null;
  const patterns = [
    [/ロット.*(増|上げ)|大きいロット|過大ロット/, 'risk', 'ロットを上げたくなる傾向がある'],
    [/取り返|リベンジ|熱くな/, 'risk', '損失後に取り返そうとしやすい'],
    [/ナンピン|追加.*エントリー/, 'risk', 'ナンピン判断を重点的に振り返る'],
    [/ルール.*破|待てな|早.*入/, 'mistake', 'エントリーを待てず、ルールより早く入ることがある'],
    [/損切.*できな|切れな/, 'mistake', '損切りを遅らせることがある'],
    [/NY.*得意|NY.*勝/, 'strength', 'NY時間の相性を重視している']
  ];
  for (const [re, type, memory] of patterns) if (re.test(value)) return { date: today(), type, text: memory };
  return null;
}

function detectRoute(text, hasImage, hasVisionCache) {
  if (hasImage) return 'vision';
  const value = String(text || '').toLowerCase();
  if (/暑|寒|眠|疲|おはよ|ただいま|こんにちは|ありがとう|元気|雑談|ゴルフ|吹きガラス/.test(value)) return 'chat';
  if (/昨日|前回|同じミス|癖|覚え|記憶|メモリ|成長/.test(value)) return 'memory';
  if (/ロット|損失|許容|いくらまで|円まで|資金|ナンピン|損切|リスク/.test(value)) return 'risk';
  if (/入る|エントリー|買い|売り|今日は|作戦|見送|勝てる|狙う/.test(value)) return 'strategy';
  if (/チャート|画像|ライン|価格帯|高値|安値/.test(value) && hasVisionCache) return 'vision';
  return 'analysis';
}

const routeLabel = {
  chat: '💬 雑談', analysis: '📊 分析', strategy: '🎯 作戦', vision: '🖼 Vision', memory: '🧠 Memory', risk: '🛡 Risk'
};

export default function Coach() {
  const { rows, metrics, diagnosis, intelligence } = useTradeData();
  const { apiKey, hasApiKey } = useApiKey();
  const [messages, setMessages] = useState(() => loadJson(CHAT_KEY, []));
  const [memories, setMemories] = useState(() => loadJson(MEMORY_KEY, []));
  const [visionCache, setVisionCache] = useState(() => loadJson(VISION_KEY, null));
  const [question, setQuestion] = useState('');
  const [image, setImage] = useState(() => {
    try {
      const pending = sessionStorage.getItem('kizashi_pending_vision');
      if (!pending) return null;
      sessionStorage.removeItem('kizashi_pending_vision');
      return JSON.parse(pending);
    } catch { return null; }
  });
  const [loading, setLoading] = useState(false);
  const [connection, setConnection] = useState({ checked: false, connected: false, model: '' });
  const [imageError, setImageError] = useState('');
  const [activeRoute, setActiveRoute] = useState('chat');
  const messageEnd = useRef(null);
  const fileInput = useRef(null);

  useEffect(() => {
    const pendingPrompt = sessionStorage.getItem('kizashi_pending_prompt');
    if (!pendingPrompt) return;
    sessionStorage.removeItem('kizashi_pending_prompt');
    setQuestion(pendingPrompt);
    setActiveRoute('chat');
  }, []);

  const welcome = useMemo(() => ({
    role: 'ai',
    text: `みずぴ、おかえり😊 KIZASHIのぴーだよ。\n質問に合わせて必要なデータだけ使うSmart Routerで、速く安定して答えるね。`
  }), []);

  useEffect(() => { if (!messages.length) setMessages([welcome]); }, [messages.length, welcome]);
  useEffect(() => { if (image) { setQuestion('このスクリーンショットを分析して'); setActiveRoute('vision'); } }, []);
  useEffect(() => { localStorage.setItem(CHAT_KEY, JSON.stringify(messages.slice(-50))); messageEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { localStorage.setItem(MEMORY_KEY, JSON.stringify(memories.slice(-30))); }, [memories]);
  useEffect(() => { visionCache ? localStorage.setItem(VISION_KEY, JSON.stringify(visionCache)) : localStorage.removeItem(VISION_KEY); }, [visionCache]);
  useEffect(() => {
    if (!hasApiKey) return setConnection({ checked: true, connected: false, model: '' });
    fetch('/api/health', { headers: { 'X-OpenAI-API-Key': apiKey } }).then((r) => r.json()).then((d) => setConnection({ checked: true, connected: Boolean(d.connected), model: d.model || '' })).catch(() => setConnection({ checked: true, connected: false, model: '' }));
  }, [apiKey, hasApiKey]);

  const chooseImage = (event) => {
    const file = event.target.files?.[0];
    setImageError('');
    if (!file) return;
    if (!file.type.startsWith('image/')) return setImageError('画像ファイルを選んでね。');
    if (file.size > MAX_IMAGE_BYTES) return setImageError('画像は8MB以下にしてね。');
    const reader = new FileReader();
    reader.onload = () => setImage({ name: file.name, dataUrl: String(reader.result), size: file.size });
    reader.onerror = () => setImageError('画像を読み込めなかったよ。');
    reader.readAsDataURL(file);
  };

  const send = async (preset = null) => {
    const text = preset || question.trim() || (image ? 'このチャートを分析して' : '');
    if (!text || loading) return;
    if (!hasApiKey) { location.hash='settings'; return; }

    const route = detectRoute(text, Boolean(image), Boolean(visionCache));
    setActiveRoute(route);
    trackEvent(route === 'vision' ? 'vision_analysis' : 'ai_chat', { route, has_image: Boolean(image), trade_count: rows.length });
    const previous = messages.filter((m) => !m.fallback).slice(route === 'chat' ? -8 : -10);
    const detected = inferMemory(text);
    const nextMemories = detected && !memories.some((m) => m.text === detected.text) ? [...memories, detected].slice(-30) : memories;
    if (nextMemories !== memories) setMemories(nextMemories);

    const outgoingImage = image;
    setMessages((current) => [...current, { role: 'me', text, image: outgoingImage?.dataUrl, route }]);
    setQuestion('');
    setImage(null);
    if (fileInput.current) fileInput.current.value = '';
    setLoading(true);

    const payload = { message: text, history: previous, route };
    if (route !== 'chat') Object.assign(payload, { metrics, diagnosis, intelligence });
    if (['analysis', 'strategy', 'risk', 'vision'].includes(route)) payload.rows = rows;
    if (['memory', 'risk', 'strategy', 'vision'].includes(route)) payload.memories = nextMemories;
    if (outgoingImage) payload.image = outgoingImage;
    if (!outgoingImage && visionCache && ['vision', 'strategy', 'risk'].includes(route)) payload.visionSummary = visionCache.summary;

    try {
      const response = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-OpenAI-API-Key': apiKey },
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || '通信が一時的に不安定です。');
      if (!data.answer?.trim()) throw new Error('AIの返答本文を受け取れませんでした。');
      const answer = data.answer.trim();
      setMessages((current) => [...current, { role: 'ai', text: answer, route: data.route || route }]);
      if (outgoingImage) setVisionCache({ date: today(), name: outgoingImage.name, summary: answer.slice(0, 5000) });
      setConnection({ checked: true, connected: true, model: data.model || connection.model });
    } catch (error) {
      const fallback = answerWithIntelligence(text, metrics, diagnosis, intelligence);
      setMessages((current) => [...current, { role: 'ai', text: `${error.message}\n\n今回はローカル分析で続けるね。\n${fallback}`, fallback: true, route }]);
    } finally {
      setLoading(false);
    }
  };

  const resetChat = () => { setMessages([welcome]); localStorage.removeItem(CHAT_KEY); setImage(null); };
  const clearMemory = () => { setMemories([]); localStorage.removeItem(MEMORY_KEY); };
  const clearVision = () => setVisionCache(null);
  const prompts = ['このチャートを分析して', '今日は取引していい？', '前と同じミスしてる？', '勝率とPFから作戦を作って', '今の弱点を一つだけ'];

  return <Page title="AIコーチ" sub="Smart Routerで必要な情報だけを使う、速く安定した専属コーチ">
    <div className="ai-coach-header dark-card">
      <div><small>KIZASHI 9.12 · BYOK BETA</small><h2>{intelligence.headline}</h2></div>
      <div><span>AI接続</span><strong className={connection.connected ? 'connected-text' : 'offline-text'}>{connection.connected ? 'ON' : 'OFF'}</strong><small>{connection.connected ? connection.model : 'ローカル予備モード'}</small></div>
    </div>
    <div className="v91-badges"><span>⚡ Smart Router</span><span>🔁 自動リトライ</span><span>🖼 Vision Cache</span><span>{routeLabel[activeRoute]}</span></div>
    {!hasApiKey && <div className="ai-key-gate"><div><b>🤖 AIコーチ</b><h3>OpenAI APIキーを設定するとAI分析が利用できます。</h3><p>分析・記録・Guardianはそのまま利用できます。</p></div><button onClick={()=>{location.hash='settings'}}>APIキーを設定</button></div>}
    {hasApiKey && !connection.connected && connection.checked && <div className="connection-note">🔑 APIキーは保存されています。管理画面の「接続確認」で状態を確認してください。</div>}
    <div className="quick-prompts">{prompts.map((p) => <button key={p} onClick={() => send(p)} disabled={loading || !hasApiKey}>{p}</button>)}</div>
    <div className="coach-layout enhanced">
      <div>
        <div className="summary dark-card"><b>{intelligence.traderType.icon} {intelligence.traderType.name}</b><p>{intelligence.traderType.note}</p></div>
        <h2>良かった点</h2><div className="coach-list good">{intelligence.strengths.slice(0, 3).map((x) => <div key={x.title}><span>{x.icon}</span><p><b>{x.title}</b><br/>{x.text}</p></div>)}</div>
        <h2>改善点</h2><div className="coach-list warning">{intelligence.weaknesses.slice(0, 3).map((x) => <div key={x.title}><span>{x.icon}</span><p><b>{x.title}</b><br/>{x.text}</p></div>)}</div>
        <div className="memory-card"><div><b>🧠 ぴーのメモリー</b><button onClick={clearMemory}>消去</button></div>{memories.length ? memories.slice(-4).reverse().map((m, i) => <p key={`${m.text}-${i}`}>・{m.text}</p>) : <p>会話から大事な癖を覚えていくよ。</p>}</div>
        <div className="memory-card"><div><b>🖼 Vision Cache</b><button onClick={clearVision}>消去</button></div>{visionCache ? <p>{visionCache.date}・{visionCache.name}<br/>解析済み。次の相談では画像を再送せず要約を使うよ。</p> : <p>チャート分析後、要約だけを保存して通信を軽くするよ。</p>}</div>
        <div className="coach-facts"><span>期待値 <b>{yen(metrics.expectancy)}</b></span><span>平均利益 <b>{yen(metrics.avgWin)}</b></span><span>平均損失 <b>{yen(metrics.avgLoss)}</b></span></div>
      </div>
      <div className="chat intelligent-chat">
        <div className="chat-title"><span>🤖</span><div><b>ぴー · KIZASHI AI</b><small>{routeLabel[activeRoute]} · 必要データだけ送信</small></div><i className={connection.connected ? '' : 'offline'}>{connection.connected ? '● 接続中' : '● 未接続'}</i><button className="new-chat" onClick={resetChat}>新しい会話</button></div>
        <div className="messages">
          {messages.map((m, i) => <div key={`${m.role}-${i}`} className={`${m.role}${m.fallback ? ' fallback' : ''}`}>{m.image && <img className="chat-image" src={m.image} alt="添付チャート"/>}{m.text}</div>)}
          {loading && <div className="ai typing"><span></span><span></span><span></span></div>}<div ref={messageEnd}/>
        </div>
        {image && <div className="image-preview"><img src={image.dataUrl} alt="送信前のチャート"/><div><b>{image.name}</b><small>この画像だけVisionへ送るよ</small></div><button onClick={() => setImage(null)}>×</button></div>}
        {imageError && <div className="image-error">{imageError}</div>}
        <div className="chatbox v91-chatbox"><input ref={fileInput} type="file" accept="image/*" hidden onChange={chooseImage}/><button className="attach-button" onClick={() => fileInput.current?.click()} title="チャート画像を追加">📎</button><textarea value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="相談するか、📎からチャート画像を貼る"/><button onClick={() => send()} disabled={loading || !hasApiKey}>{loading ? '最適化中…' : '送信'}</button></div>
      </div>
    </div>
  </Page>;
}
