import { useEffect, useMemo, useState } from 'react';
import Page from '../components/Page';
import { analyticsConfig, clearLocalAnalytics, getLocalAnalytics } from '../utils/analytics';

const LABELS = { app_open:'起動', page_view:'ページ表示', trade_file_upload:'履歴読込', analysis_complete:'分析完了', ai_chat:'AIチャット', vision_analysis:'Vision解析', share_open:'シェア', feedback_send:'フィードバック' };
const METRICS = ['users','app_open','ai_chat','vision_analysis','share_open','feedback_send','trade_file_upload','analysis_complete'];
const dayKey = (iso) => new Date(iso).toISOString().slice(0, 10);
const metric = (data, key) => Number(data?.totals?.[key] || 0);
const format = (value) => Number(value || 0).toLocaleString('ja-JP');
const deltaText = (value) => `${Number(value || 0) >= 0 ? '+' : ''}${format(value)}`;

const DAILY_GOALS = [
  { key:'users', label:'βユーザー', goal:2, icon:'👤' },
  { key:'ai_chat', label:'AI利用', goal:10, icon:'🤖' },
  { key:'vision_analysis', label:'Vision', goal:3, icon:'📷' },
  { key:'feedback_send', label:'Feedback', goal:1, icon:'💬' },
  { key:'share_open', label:'Share', goal:5, icon:'🚀' },
];

function Progress({ label, value, goal }) {
  const percent = Math.min(100, Math.round((value / Math.max(1, goal)) * 100));
  return <div className="growth-progress"><div><b>{label}</b><span>{format(value)} / {format(goal)}</span></div><div><i style={{width:`${percent}%`}}/></div><small>{percent}%</small></div>;
}

function buildLinePath(values, width, height, maxValue) {
  if (!values.length) return '';
  return values.map((value, index) => {
    const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
    const y = height - (Number(value || 0) / Math.max(1, maxValue)) * height;
    return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(' ');
}

function TrendChart({ daily }) {
  const rows = daily.slice(-30);
  const series = [
    { key:'users', label:'利用者', className:'users' },
    { key:'app_open', label:'起動', className:'opens' },
    { key:'ai_chat', label:'AI', className:'ai' },
    { key:'vision_analysis', label:'Vision', className:'vision' },
    { key:'share_open', label:'シェア', className:'share' },
  ];
  const allValues = series.flatMap((item) => rows.map((row) => Number(row[item.key] || 0)));
  const maxValue = Math.max(1, ...allValues);
  const width = 900;
  const height = 250;
  if (!rows.length) return <div className="growth-chart-empty"><b>まだ履歴がありません</b><span>利用が始まると、ここに日別推移が表示されます。</span></div>;
  return <div className="growth-line-wrap">
    <div className="growth-line-legend">{series.map((item)=><span key={item.key} className={item.className}><i/>{item.label}</span>)}</div>
    <svg className="growth-line-chart" viewBox={`0 0 ${width} ${height + 34}`} preserveAspectRatio="none" role="img" aria-label="日別利用推移">
      {[0,.25,.5,.75,1].map((ratio)=><line key={ratio} x1="0" x2={width} y1={height-height*ratio} y2={height-height*ratio} className="grid"/>) }
      {series.map((item)=><path key={item.key} className={`growth-line ${item.className}`} d={buildLinePath(rows.map((row)=>row[item.key]), width, height, maxValue)}/>) }
      {rows.map((row,index)=>{
        const x = rows.length===1?width/2:(index/(rows.length-1))*width;
        return <text key={row.day} x={x} y={height+27} textAnchor="middle">{index===0||index===rows.length-1||index%Math.max(1,Math.ceil(rows.length/6))===0?row.day.slice(5).replace('-','/'):''}</text>;
      })}
    </svg>
  </div>;
}

function DailyGoals({ today }) {
  const completed = DAILY_GOALS.filter((goal)=>Number(today?.[goal.key] || 0) >= goal.goal).length;
  const percent = Math.round((completed / DAILY_GOALS.length) * 100);
  return <section className="analytics-panel growth-daily-goals">
    <div className="panel-head"><div><small>TODAY'S TARGET</small><h2>今日の目標</h2></div><strong>{percent}%</strong></div>
    <div className="growth-goal-ring" style={{'--goal':`${percent * 3.6}deg`}}><span>{completed}<small>/ {DAILY_GOALS.length}</small></span></div>
    <div className="growth-goal-list">{DAILY_GOALS.map((goal)=>{
      const value = Number(today?.[goal.key] || 0);
      const done = value >= goal.goal;
      return <div key={goal.key} className={done?'done':''}><span>{done?'✅':goal.icon}</span><b>{goal.label}</b><em>{value} / {goal.goal}</em></div>;
    })}</div>
  </section>;
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
    const days = Array.from({length:range},(_,index)=>{const date=new Date();date.setDate(date.getDate()-(range-index-1));return date.toISOString().slice(0,10)});
    const grouped = days.map((day)=>{
      const items=events.filter((e)=>dayKey(e.at)===day);
      const uniqueVisitors = new Set(items.map((e)=>e.props?.visitorId).filter(Boolean));
      return { day, users: uniqueVisitors.size || (items.length?1:0), ...Object.fromEntries(METRICS.slice(1).map((name)=>[name,count(items,name)])) };
    });
    const todayStats={ users:todays.length?1:0, app_open:count(todays,'app_open'), trade_file_upload:count(todays,'trade_file_upload'), analysis_complete:count(todays,'analysis_complete'), ai_chat:count(todays,'ai_chat'), vision_analysis:count(todays,'vision_analysis'), share_open:count(todays,'share_open'), feedback_send:count(todays,'feedback_send') };
    const yesterdayStats={ users:yesterdays.length?1:0, app_open:count(yesterdays,'app_open'), ai_chat:count(yesterdays,'ai_chat'), vision_analysis:count(yesterdays,'vision_analysis'), share_open:count(yesterdays,'share_open'), feedback_send:count(yesterdays,'feedback_send') };
    return {
      today:todayStats,
      yesterday:yesterdayStats,
      deltas:Object.fromEntries(['users','app_open','ai_chat','vision_analysis','share_open','feedback_send'].map((key)=>[key,Number(todayStats[key]||0)-Number(yesterdayStats[key]||0)])),
      total:{ opens:count(events,'app_open'), uploads:count(events,'trade_file_upload'), analyses:count(events,'analysis_complete'), chats:count(events,'ai_chat'), visions:count(events,'vision_analysis'), shares:count(events,'share_open'), feedback:count(events,'feedback_send') },
      daily:grouped,
    };
  },[events,range]);
  const activeToday = remote.configured ? remote.today : localStats.today;
  const activeDeltas = remote.configured ? remote.deltas : localStats.deltas;
  const activeDaily = remote.configured ? remote.daily : localStats.daily;
  const calculateLocalScore = () => {
    const ratio = (key,goal,weight) => Math.min(weight,(Number(activeToday?.[key]||0)/goal)*weight);
    return Math.round(ratio('users',2,25)+ratio('ai_chat',10,25)+ratio('vision_analysis',3,20)+ratio('share_open',5,15)+ratio('feedback_send',1,15));
  };
  const growthScore = remote.configured ? remote.growthScore : calculateLocalScore();
  const dailyTotals=useMemo(()=>activeDaily.reduce((sum,item)=>sum+Number(item.app_open||0),0),[activeDaily]);
  const logout = async () => { await fetch('/api/admin-logout', { method: 'POST', credentials: 'include' }); go?.('home'); };
  return <Page title="Growth" sub="KIZASHIを作るフェーズから、数字で育てるフェーズへ">
    <div className="analytics-owner-bar"><span>🔐 管理者としてログイン中</span><button onClick={logout}>ログアウト</button></div>

    <section className="growth-hero">
      <div><small>KIZASHI GROWTH</small><h2>サービス成長の司令塔</h2><p>累計・過去推移・目標達成率を一つの画面で確認します。</p></div>
      <label>表示期間<select value={range} onChange={(e)=>setRange(Number(e.target.value))}><option value="7">過去7日</option><option value="30">過去30日</option><option value="90">過去90日</option><option value="365">過去1年</option></select></label>
    </section>

    {remote.configured ? <section className="analytics-connected"><b>✅ クラウド累計保存中</b><p>全ユーザーの累計・日別推移・昨日との差を保存しています。{remote.source?` 接続: ${remote.source}`:''}</p></section> : <section className="analytics-warning"><b>⚠ 全ユーザーの累計保存は未接続です</b><p>現在はこの端末に残っている全期間データを表示しています。VercelへUpstash Redisを接続すると、全端末の累計と過去推移が保存されます。</p></section>}
    {error && <section className="analytics-warning"><b>取得エラー</b><p>{error}</p></section>}

    <div className="growth-top-grid">
      <article className="growth-score-card"><small>TODAY'S GROWTH SCORE</small><strong>{loading?'—':growthScore}</strong><span>/ 100</span><p>{growthScore>=80?'Excellent — 大きく成長しています。':growthScore>=50?'Good — 順調に前進しています。':growthScore>0?'Growing — 今日の行動が数字に出ています。':'今日の最初の一歩を記録しましょう。'}</p></article>
      <DailyGoals today={activeToday}/>
      <div className="growth-today-deltas"><b>昨日との差</b><span>利用者 {deltaText(activeDeltas?.users)}</span><span>AI {deltaText(activeDeltas?.ai_chat)}</span><span>Vision {deltaText(activeDeltas?.vision_analysis)}</span><span>シェア {deltaText(activeDeltas?.share_open)}</span><span>意見 {deltaText(activeDeltas?.feedback_send)}</span></div>
    </div>

    <div className="growth-kpis">
      <article><small>βユーザー</small><strong>{loading?'—':remote.configured?format(remote.users):(events.length?1:0)}</strong><span>/ 100</span><em>{remote.configured?`今日 ${deltaText(activeDeltas?.users)}`:'この端末'}</em></article>
      <article><small>AI利用 累計</small><strong>{loading?'—':format(remote.configured?metric(remote,'ai_chat'):localStats.total.chats)}</strong><em>今日 {format(activeToday?.ai_chat)}</em></article>
      <article><small>Vision利用 累計</small><strong>{loading?'—':format(remote.configured?metric(remote,'vision_analysis'):localStats.total.visions)}</strong><em>今日 {format(activeToday?.vision_analysis)}</em></article>
      <article><small>シェア 累計</small><strong>{loading?'—':format(remote.configured?metric(remote,'share_open'):localStats.total.shares)}</strong><em>今日 {format(activeToday?.share_open)}</em></article>
      <article><small>フィードバック 累計</small><strong>{loading?'—':format(remote.configured?metric(remote,'feedback_send'):localStats.total.feedback)}</strong><em>今日 {format(activeToday?.feedback_send)}</em></article>
    </div>

    <div className="growth-layout">
      <section className="analytics-panel growth-goal-panel"><div className="panel-head"><div><small>GOAL PROGRESS</small><h2>β版の目標</h2></div></div>
        <Progress label="βユーザー" value={remote.configured?remote.users:(events.length?1:0)} goal={100}/>
        <Progress label="AI利用" value={remote.configured?metric(remote,'ai_chat'):localStats.total.chats} goal={1000}/>
        <Progress label="Vision利用" value={remote.configured?metric(remote,'vision_analysis'):localStats.total.visions} goal={100}/>
        <Progress label="フィードバック" value={remote.configured?metric(remote,'feedback_send'):localStats.total.feedback} goal={50}/>
        <Progress label="シェア" value={remote.configured?metric(remote,'share_open'):localStats.total.shares} goal={100}/>
      </section>
      <section className="analytics-panel"><div className="panel-head"><div><small>HISTORY</small><h2>利用推移</h2></div><b>{format(dailyTotals)} 起動</b></div><TrendChart daily={activeDaily}/></section>
    </div>

    <div className="analytics-kpis local-kpis"><article><small>この端末・累計起動</small><strong>{localStats.total.opens}</strong></article><article><small>履歴読込 累計</small><strong>{localStats.total.uploads}</strong></article><article><small>分析完了 累計</small><strong>{localStats.total.analyses}</strong></article><article><small>AIチャット 累計</small><strong>{localStats.total.chats}</strong></article><article><small>Vision 累計</small><strong>{localStats.total.visions}</strong></article></div>

    <div className="analytics-grid"><section className="analytics-panel"><h2>日別履歴</h2><div className="growth-history"><div className="growth-history-head"><span>日付</span><span>利用者</span><span>起動</span><span>AI</span><span>Vision</span><span>シェア</span></div>{activeDaily.slice().reverse().map(item=><div key={item.day}><b>{item.day}</b><span>{item.users||0}</span><span>{item.app_open||0}</span><span>{item.ai_chat||0}</span><span>{item.vision_analysis||0}</span><span>{item.share_open||0}</span></div>)}</div></section>
      <section className="analytics-panel"><h2>直近イベント</h2><div className="analytics-feed">{(remote.recent.length?remote.recent:events.slice(-20).reverse()).slice(0,20).map((e,i)=><div key={`${e.at}-${i}`}><span>{LABELS[e.name]||e.name}</span><small>{new Date(e.at).toLocaleString('ja-JP')}</small></div>)}</div><button className="danger" onClick={()=>{if(confirm('この端末の計測履歴を消去しますか？')){clearLocalAnalytics();setEvents([])}}}>この端末の履歴を消去</button></section>
    </div>

    <section className="analytics-config-card"><div><small>TRACKING STATUS</small><h2>計測サービス接続状況</h2></div><div className="analytics-status-list"><span className={remote.configured?'on':'off'}>累計データベース <b>{remote.configured?`接続済み${remote.source?` (${remote.source})`:''}`:'未設定'}</b></span><span className={config.vercel?'on':'off'}>Vercel Analytics <b>{config.vercel?'導入済み':'停止'}</b></span><span className={config.ga4?'on':'off'}>Google Analytics 4 <b>{config.ga4?'接続済み':'ID未設定'}</b></span><span className={config.posthog?'on':'off'}>PostHog <b>{config.posthog?'接続済み':'キー未設定'}</b></span></div></section>
    <section className="analytics-panel analytics-setup"><h2>累計保存を有効にする設定</h2><p>Vercel MarketplaceでUpstash Redisを接続すると、環境変数は自動設定されます。手動設定の場合は次の2つを登録してください。</p><code>UPSTASH_REDIS_REST_URL=https://...</code><code>UPSTASH_REDIS_REST_TOKEN=...</code><p><b>Vercel KV形式（KV_REST_API_URL / KV_REST_API_TOKEN）にも対応済み。</b> 設定後に再デプロイすると、全ユーザーの累計・過去履歴・昨日との差が保存されます。</p></section>
  </Page>;
}
