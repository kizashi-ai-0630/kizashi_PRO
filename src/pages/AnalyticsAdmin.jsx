import { useEffect, useMemo, useState } from 'react';
import Page from '../components/Page';
import { analyticsConfig, clearLocalAnalytics, getLocalAnalytics } from '../utils/analytics';

const LABELS = { app_open:'起動', page_view:'ページ表示', trade_file_upload:'履歴読込', analysis_complete:'分析完了', ai_chat:'AIチャット', vision_analysis:'Vision解析', share_open:'シェア', feedback_send:'フィードバック' };
const dayKey = (iso) => new Date(iso).toISOString().slice(0, 10);
const metric = (data, key) => Number(data?.totals?.[key] || 0);
const format = (value) => Number(value || 0).toLocaleString('ja-JP');

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
  const [remote,setRemote]=useState({ configured:false, totals:{}, users:0, daily:[], recent:[] });
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  useEffect(()=>{const update=()=>setEvents(getLocalAnalytics());window.addEventListener('kizashi:analytics',update);return()=>window.removeEventListener('kizashi:analytics',update)},[]);
  useEffect(()=>{let active=true;setLoading(true);setError('');fetch(`/api/analytics-summary?days=${range}`,{credentials:'include'}).then(async(r)=>{const d=await r.json();if(!r.ok)throw new Error(d.message||'取得に失敗しました');if(active)setRemote(d)}).catch(e=>active&&setError(e.message)).finally(()=>active&&setLoading(false));return()=>{active=false}},[range]);
  const config=analyticsConfig();
  const localStats=useMemo(()=>{
    const today=new Date().toISOString().slice(0,10);
    const todays=events.filter(e=>dayKey(e.at)===today);
    const count=name=>todays.filter(e=>e.name===name).length;
    return { opens:count('app_open'), uploads:count('trade_file_upload'), analyses:count('analysis_complete'), chats:count('ai_chat'), visions:count('vision_analysis') };
  },[events]);
  const dailyTotals=useMemo(()=>remote.daily.reduce((sum,item)=>sum+Number(item.app_open||0),0),[remote.daily]);
  const logout = async () => { await fetch('/api/admin-logout', { method: 'POST', credentials: 'include' }); go?.('home'); };
  return <Page title="Growth" sub="KIZASHIを作るフェーズから、数字で育てるフェーズへ">
    <div className="analytics-owner-bar"><span>🔐 管理者としてログイン中</span><button onClick={logout}>ログアウト</button></div>

    <section className="growth-hero">
      <div><small>KIZASHI GROWTH</small><h2>サービス成長の司令塔</h2><p>累計・過去推移・目標達成率を一つの画面で確認します。</p></div>
      <label>表示期間<select value={range} onChange={(e)=>setRange(Number(e.target.value))}><option value="7">過去7日</option><option value="30">過去30日</option><option value="90">過去90日</option><option value="365">過去1年</option></select></label>
    </section>

    {!remote.configured && <section className="analytics-warning"><b>⚠ 累計保存は未接続です</b><p>VercelへUpstash Redisの環境変数を設定すると、全ユーザーの累計と過去推移が保存されます。現在はこの端末の当日データだけを補助表示しています。</p></section>}
    {error && <section className="analytics-warning"><b>取得エラー</b><p>{error}</p></section>}

    <div className="growth-kpis">
      <article><small>βユーザー</small><strong>{loading?'—':format(remote.users)}</strong><span>/ 100</span></article>
      <article><small>AI利用 累計</small><strong>{loading?'—':format(metric(remote,'ai_chat'))}</strong></article>
      <article><small>Vision利用 累計</small><strong>{loading?'—':format(metric(remote,'vision_analysis'))}</strong></article>
      <article><small>シェア 累計</small><strong>{loading?'—':format(metric(remote,'share_open'))}</strong></article>
      <article><small>フィードバック 累計</small><strong>{loading?'—':format(metric(remote,'feedback_send'))}</strong></article>
    </div>

    <div className="growth-layout">
      <section className="analytics-panel"><div className="panel-head"><div><small>GOAL PROGRESS</small><h2>β版の目標</h2></div></div>
        <Progress label="βユーザー" value={remote.users} goal={100}/>
        <Progress label="AI利用" value={metric(remote,'ai_chat')} goal={1000}/>
        <Progress label="Vision利用" value={metric(remote,'vision_analysis')} goal={100}/>
        <Progress label="フィードバック" value={metric(remote,'feedback_send')} goal={50}/>
        <Progress label="シェア" value={metric(remote,'share_open')} goal={100}/>
      </section>
      <section className="analytics-panel"><div className="panel-head"><div><small>HISTORY</small><h2>利用推移</h2></div><b>{format(dailyTotals)} 起動</b></div><TrendChart daily={remote.daily} metricKey="app_open"/></section>
    </div>

    <div className="analytics-kpis local-kpis"><article><small>この端末・今日の起動</small><strong>{localStats.opens}</strong></article><article><small>履歴読込</small><strong>{localStats.uploads}</strong></article><article><small>分析完了</small><strong>{localStats.analyses}</strong></article><article><small>AIチャット</small><strong>{localStats.chats}</strong></article><article><small>Vision</small><strong>{localStats.visions}</strong></article></div>

    <div className="analytics-grid"><section className="analytics-panel"><h2>日別履歴</h2><div className="growth-history"><div className="growth-history-head"><span>日付</span><span>利用者</span><span>起動</span><span>AI</span><span>Vision</span><span>シェア</span></div>{remote.daily.slice().reverse().map(item=><div key={item.day}><b>{item.day}</b><span>{item.users||0}</span><span>{item.app_open||0}</span><span>{item.ai_chat||0}</span><span>{item.vision_analysis||0}</span><span>{item.share_open||0}</span></div>)}</div></section>
      <section className="analytics-panel"><h2>直近イベント</h2><div className="analytics-feed">{(remote.recent.length?remote.recent:events.slice(-20).reverse()).slice(0,20).map((e,i)=><div key={`${e.at}-${i}`}><span>{LABELS[e.name]||e.name}</span><small>{new Date(e.at).toLocaleString('ja-JP')}</small></div>)}</div><button className="danger" onClick={()=>{if(confirm('この端末の計測履歴を消去しますか？')){clearLocalAnalytics();setEvents([])}}}>この端末の履歴を消去</button></section>
    </div>

    <section className="analytics-config-card"><div><small>TRACKING STATUS</small><h2>計測サービス接続状況</h2></div><div className="analytics-status-list"><span className={remote.configured?'on':'off'}>累計データベース <b>{remote.configured?'接続済み':'未設定'}</b></span><span className={config.vercel?'on':'off'}>Vercel Analytics <b>{config.vercel?'導入済み':'停止'}</b></span><span className={config.ga4?'on':'off'}>Google Analytics 4 <b>{config.ga4?'接続済み':'ID未設定'}</b></span><span className={config.posthog?'on':'off'}>PostHog <b>{config.posthog?'接続済み':'キー未設定'}</b></span></div></section>
    <section className="analytics-panel analytics-setup"><h2>累計保存を有効にする設定</h2><code>UPSTASH_REDIS_REST_URL=https://...</code><code>UPSTASH_REDIS_REST_TOKEN=...</code><p>VercelのProject Settings → Environment Variablesへ2つを登録して再デプロイしてください。登録後から全ユーザーの累計・日別履歴が保存されます。</p></section>
  </Page>;
}
