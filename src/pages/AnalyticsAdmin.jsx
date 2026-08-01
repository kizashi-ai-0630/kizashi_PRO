import { useEffect, useMemo, useState } from 'react';
import Page from '../components/Page';
import { analyticsConfig, clearLocalAnalytics, getLocalAnalytics } from '../utils/analytics';

const LABELS = { app_open:'起動', page_view:'ページ表示', trade_file_upload:'履歴読込', analysis_complete:'分析完了', ai_chat:'AIチャット', vision_analysis:'Vision解析', share_open:'シェア', feedback_send:'フィードバック' };
const dayKey = (iso) => new Date(iso).toISOString().slice(0, 10);
const metric = (data, key) => Number(data?.totals?.[key] || 0);
const format = (value) => Number(value || 0).toLocaleString('ja-JP');
const deltaText = (value) => `${Number(value || 0) >= 0 ? '+' : ''}${format(value)}`;

function Progress({ label, value, goal }) {
  const percent = Math.min(100, Math.round((value / goal) * 100));
  return <div className="growth-progress"><div><b>{label}</b><span>{format(value)} / {format(goal)}</span></div><div><i style={{width:`${percent}%`}}/></div><small>{percent}%</small></div>;
}

function TrendChart({ daily, metricKey }) {
  const values = daily.map((item) => Number(item[metricKey] || 0));
  const max = Math.max(1, ...values);
  return <div className="growth-bars">{daily.slice(-30).map((item) => <div key={item.day} title={`${item.day}: ${item[metricKey] || 0}`}><i style={{height:`${Math.max(3, (Number(item[metricKey] || 0) / max) * 100)}%`}}/><small>{item.day.slice(5).replace('-','/')}</small></div>)}</div>;
}

export default function AnalyticsAdmin({ go }){
  const [events,setEvents]=useState(getLocalAnalytics);
  const [range,setRange]=useState(30);
  const [remote,setRemote]=useState({ configured:false, source:'', totals:{}, users:0, daily:[], recent:[], today:{}, yesterday:{}, deltas:{}, growthScore:0 });
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  useEffect(()=>{const update=()=>setEvents(getLocalAnalytics());window.addEventListener('kizashi:analytics',update);return()=>window.removeEventListener('kizashi:analytics',update)},[]);
  useEffect(()=>{let active=true;setLoading(true);setError('');fetch(`/api/analytics-summary?days=${range}`,{credentials:'include'}).then(async(r)=>{const d=await r.json();if(!r.ok)throw new Error(d.message||'取得に失敗しました');if(active)setRemote(d)}).catch(e=>active&&setError(e.message)).finally(()=>active&&setLoading(false));return()=>{active=false}},[range]);
  const config=analyticsConfig();
  const localStats=useMemo(()=>{
    const today=new Date().toISOString().slice(0,10);
    const yesterdayDate=new Date(); yesterdayDate.setDate(yesterdayDate.getDate()-1);
    const yesterday=yesterdayDate.toISOString().slice(0,10);
    const count=(items,name)=>items.filter(e=>e.name===name).length;
    const todays=events.filter(e=>dayKey(e.at)===today);
    const yesterdays=events.filter(e=>dayKey(e.at)===yesterday);
    return {
      today:{ opens:count(todays,'app_open'), uploads:count(todays,'trade_file_upload'), analyses:count(todays,'analysis_complete'), chats:count(todays,'ai_chat'), visions:count(todays,'vision_analysis'), shares:count(todays,'share_open'), feedback:count(todays,'feedback_send') },
      yesterday:{ opens:count(yesterdays,'app_open'), chats:count(yesterdays,'ai_chat'), visions:count(yesterdays,'vision_analysis'), shares:count(yesterdays,'share_open'), feedback:count(yesterdays,'feedback_send') },
      total:{ opens:count(events,'app_open'), uploads:count(events,'trade_file_upload'), analyses:count(events,'analysis_complete'), chats:count(events,'ai_chat'), visions:count(events,'vision_analysis'), shares:count(events,'share_open'), feedback:count(events,'feedback_send') },
    };
  },[events]);
  const dailyTotals=useMemo(()=>remote.daily.reduce((sum,item)=>sum+Number(item.app_open||0),0),[remote.daily]);
  const logout = async () => { await fetch('/api/admin-logout', { method: 'POST', credentials: 'include' }); go?.('home'); };
  return <Page title="Growth" sub="KIZASHIを作るフェーズから、数字で育てるフェーズへ">
    <div className="analytics-owner-bar"><span>🔐 管理者としてログイン中</span><button onClick={logout}>ログアウト</button></div>

    <section className="growth-hero">
      <div><small>KIZASHI GROWTH</small><h2>サービス成長の司令塔</h2><p>累計・過去推移・目標達成率を一つの画面で確認します。</p></div>
      <label>表示期間<select value={range} onChange={(e)=>setRange(Number(e.target.value))}><option value="7">過去7日</option><option value="30">過去30日</option><option value="90">過去90日</option><option value="365">過去1年</option></select></label>
    </section>

    {!remote.configured && <section className="analytics-warning"><b>⚠ 全ユーザーの累計保存は未接続です</b><p>現在はこの端末に残っている累計履歴を補助表示しています。VercelへUpstash Redisを接続すると、全端末の累計・日別推移・前日差が保存されます。</p></section>}
    {error && <section className="analytics-warning"><b>取得エラー</b><p>{error}</p></section>}

    <div className="growth-score-row">
      <article className="growth-score-card"><small>TODAY'S GROWTH SCORE</small><strong>{loading?'—':remote.configured?remote.growthScore:0}</strong><span>/ 100</span><p>新規利用・AI・Vision・シェア・フィードバックから算出</p></article>
      <div className="growth-today-deltas"><b>昨日との差</b><span>利用者 {deltaText(remote.deltas?.users)}</span><span>AI {deltaText(remote.deltas?.ai_chat)}</span><span>Vision {deltaText(remote.deltas?.vision_analysis)}</span><span>シェア {deltaText(remote.deltas?.share_open)}</span><span>意見 {deltaText(remote.deltas?.feedback_send)}</span></div>
    </div>

    <div className="growth-kpis">
      <article><small>βユーザー</small><strong>{loading?'—':remote.configured?format(remote.users):(events.length?1:0)}</strong><span>/ 100</span><em>{remote.configured?`今日 ${deltaText(remote.deltas?.users)}`:'この端末'}</em></article>
      <article><small>AI利用 累計</small><strong>{loading?'—':format(remote.configured?metric(remote,'ai_chat'):localStats.total.chats)}</strong><em>今日 {format(remote.configured?remote.today?.ai_chat:localStats.today.chats)}</em></article>
      <article><small>Vision利用 累計</small><strong>{loading?'—':format(remote.configured?metric(remote,'vision_analysis'):localStats.total.visions)}</strong><em>今日 {format(remote.configured?remote.today?.vision_analysis:localStats.today.visions)}</em></article>
      <article><small>シェア 累計</small><strong>{loading?'—':format(remote.configured?metric(remote,'share_open'):localStats.total.shares)}</strong><em>今日 {format(remote.configured?remote.today?.share_open:localStats.today.shares)}</em></article>
      <article><small>フィードバック 累計</small><strong>{loading?'—':format(remote.configured?metric(remote,'feedback_send'):localStats.total.feedback)}</strong><em>今日 {format(remote.configured?remote.today?.feedback_send:localStats.today.feedback)}</em></article>
    </div>

    <div className="growth-layout">
      <section className="analytics-panel"><div className="panel-head"><div><small>GOAL PROGRESS</small><h2>β版の目標</h2></div></div>
        <Progress label="βユーザー" value={remote.configured?remote.users:(events.length?1:0)} goal={100}/>
        <Progress label="AI利用" value={remote.configured?metric(remote,'ai_chat'):localStats.total.chats} goal={1000}/>
        <Progress label="Vision利用" value={remote.configured?metric(remote,'vision_analysis'):localStats.total.visions} goal={100}/>
        <Progress label="フィードバック" value={remote.configured?metric(remote,'feedback_send'):localStats.total.feedback} goal={50}/>
        <Progress label="シェア" value={remote.configured?metric(remote,'share_open'):localStats.total.shares} goal={100}/>
      </section>
      <section className="analytics-panel"><div className="panel-head"><div><small>HISTORY</small><h2>利用推移</h2></div><b>{format(dailyTotals)} 起動</b></div><TrendChart daily={remote.daily} metricKey="app_open"/></section>
    </div>

    <div className="analytics-kpis local-kpis"><article><small>この端末・累計起動</small><strong>{localStats.total.opens}</strong></article><article><small>履歴読込 累計</small><strong>{localStats.total.uploads}</strong></article><article><small>分析完了 累計</small><strong>{localStats.total.analyses}</strong></article><article><small>AIチャット 累計</small><strong>{localStats.total.chats}</strong></article><article><small>Vision 累計</small><strong>{localStats.total.visions}</strong></article></div>

    <div className="analytics-grid"><section className="analytics-panel"><h2>日別履歴</h2><div className="growth-history"><div className="growth-history-head"><span>日付</span><span>利用者</span><span>起動</span><span>AI</span><span>Vision</span><span>シェア</span></div>{remote.daily.slice().reverse().map(item=><div key={item.day}><b>{item.day}</b><span>{item.users||0}</span><span>{item.app_open||0}</span><span>{item.ai_chat||0}</span><span>{item.vision_analysis||0}</span><span>{item.share_open||0}</span></div>)}</div></section>
      <section className="analytics-panel"><h2>直近イベント</h2><div className="analytics-feed">{(remote.recent.length?remote.recent:events.slice(-20).reverse()).slice(0,20).map((e,i)=><div key={`${e.at}-${i}`}><span>{LABELS[e.name]||e.name}</span><small>{new Date(e.at).toLocaleString('ja-JP')}</small></div>)}</div><button className="danger" onClick={()=>{if(confirm('この端末の計測履歴を消去しますか？')){clearLocalAnalytics();setEvents([])}}}>この端末の履歴を消去</button></section>
    </div>

    <section className="analytics-config-card"><div><small>TRACKING STATUS</small><h2>計測サービス接続状況</h2></div><div className="analytics-status-list"><span className={remote.configured?'on':'off'}>累計データベース <b>{remote.configured?`接続済み${remote.source?` (${remote.source})`:''}`:'未設定'}</b></span><span className={config.vercel?'on':'off'}>Vercel Analytics <b>{config.vercel?'導入済み':'停止'}</b></span><span className={config.ga4?'on':'off'}>Google Analytics 4 <b>{config.ga4?'接続済み':'ID未設定'}</b></span><span className={config.posthog?'on':'off'}>PostHog <b>{config.posthog?'接続済み':'キー未設定'}</b></span></div></section>
    <section className="analytics-panel analytics-setup"><h2>累計保存を有効にする設定</h2><p>Vercel MarketplaceでUpstash Redisを接続すると、環境変数は自動設定されます。手動設定の場合は次の2つを登録してください。</p><code>UPSTASH_REDIS_REST_URL=https://...</code><code>UPSTASH_REDIS_REST_TOKEN=...</code><p><b>Vercel KV形式（KV_REST_API_URL / KV_REST_API_TOKEN）にも対応済み。</b> 設定後に再デプロイすると、全ユーザーの累計・過去履歴・昨日との差が保存されます。</p></section>
  </Page>;
}
