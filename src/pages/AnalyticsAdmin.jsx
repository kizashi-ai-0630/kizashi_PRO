import { useEffect, useMemo, useState } from 'react';
import Page from '../components/Page';
import { analyticsConfig, clearLocalAnalytics, getLocalAnalytics } from '../utils/analytics';

const LABELS = { app_open:'起動', page_view:'ページ表示', live_open:'LIVE表示', guardian_open:'Guardian表示', guardian_rule_toggle:'Guardian条件変更', guardian_symbol_toggle:'Guardian監視変更', trade_file_upload:'履歴読込', analysis_complete:'分析完了', ai_chat:'AIチャット', vision_analysis:'Vision解析', share_open:'シェア', feedback_send:'フィードバック' };
const METRICS = ['users','app_open','live_open','guardian_open','ai_chat','vision_analysis','share_open','feedback_send','trade_file_upload','analysis_complete'];
const dayKey = (iso) => new Date(iso).toISOString().slice(0, 10);
const metric = (data, key) => Number(data?.totals?.[key] || 0);
const format = (value) => Number(value || 0).toLocaleString('ja-JP');
const deltaText = (value) => `${Number(value || 0) >= 0 ? '+' : ''}${format(value)}`;

const DAILY_GOALS = [
  { key:'new_users', label:'新規ユーザー', goal:2, icon:'👤' },
  { key:'ai_chat_users', label:'AI利用者', goal:3, icon:'🤖' },
  { key:'vision_analysis_users', label:'Vision利用者', goal:2, icon:'📷' },
  { key:'feedback_send_users', label:'Feedback送信者', goal:1, icon:'💬' },
  { key:'share_open_users', label:'Share利用者', goal:2, icon:'🚀' },
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
    { key:'new_users', label:'新規', className:'opens' },
    { key:'ai_chat_users', label:'AI利用者', className:'ai' },
    { key:'vision_analysis_users', label:'Vision利用者', className:'vision' },
    { key:'guardian_open_users', label:'Guardian利用者', className:'share' },
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
  const [remote,setRemote]=useState({ configured:false, source:'', totals:{}, users:0, repeatUsers:0, unique:{}, access:{ total:0,admin:0,external:0 }, daily:[], recent:[], today:{}, yesterday:{}, deltas:{}, growthScore:0 });
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [cloudHealth,setCloudHealth]=useState({ connected:false, configured:false, source:'', checkedAt:'' });
  useEffect(()=>{const update=()=>setEvents(getLocalAnalytics());window.addEventListener('kizashi:analytics',update);return()=>window.removeEventListener('kizashi:analytics',update)},[]);
  useEffect(()=>{
    let active=true;
    let timer;
    const load=async(showLoading=false)=>{
      if(showLoading)setLoading(true);
      setError('');
      try{
        const [summaryRes,healthRes]=await Promise.all([
          fetch(`/api/analytics-summary?days=${range}`,{credentials:'include',cache:'no-store'}),
          fetch('/api/analytics-health',{credentials:'include',cache:'no-store'})
        ]);
        const d=await summaryRes.json();
        const h=await healthRes.json().catch(()=>({}));
        if(!summaryRes.ok)throw new Error(d.message||'取得に失敗しました');
        if(active){setRemote(d);setCloudHealth(h);}
      }catch(e){if(active)setError(e.message)}
      finally{if(active)setLoading(false)}
    };
    load(true);
    timer=window.setInterval(()=>load(false),30000);
    return()=>{active=false;window.clearInterval(timer)}
  },[range]);
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
    const todayStats={ users:todays.length?1:0, app_open:count(todays,'app_open'), live_open:count(todays,'live_open'), guardian_open:count(todays,'guardian_open'), trade_file_upload:count(todays,'trade_file_upload'), analysis_complete:count(todays,'analysis_complete'), ai_chat:count(todays,'ai_chat'), vision_analysis:count(todays,'vision_analysis'), share_open:count(todays,'share_open'), feedback_send:count(todays,'feedback_send') };
    const yesterdayStats={ users:yesterdays.length?1:0, app_open:count(yesterdays,'app_open'), live_open:count(yesterdays,'live_open'), guardian_open:count(yesterdays,'guardian_open'), ai_chat:count(yesterdays,'ai_chat'), vision_analysis:count(yesterdays,'vision_analysis'), share_open:count(yesterdays,'share_open'), feedback_send:count(yesterdays,'feedback_send') };
    return {
      today:todayStats,
      yesterday:yesterdayStats,
      deltas:Object.fromEntries(['users','app_open','live_open','guardian_open','ai_chat','vision_analysis','share_open','feedback_send'].map((key)=>[key,Number(todayStats[key]||0)-Number(yesterdayStats[key]||0)])),
      total:{ opens:count(events,'app_open'), live:count(events,'live_open'), guardian:count(events,'guardian_open'), uploads:count(events,'trade_file_upload'), analyses:count(events,'analysis_complete'), chats:count(events,'ai_chat'), visions:count(events,'vision_analysis'), shares:count(events,'share_open'), feedback:count(events,'feedback_send') },
      daily:grouped,
    };
  },[events,range]);
  const activeToday = remote.configured ? remote.today : localStats.today;
  const activeDeltas = remote.configured ? remote.deltas : localStats.deltas;
  const activeDaily = remote.configured ? remote.daily : localStats.daily;
  const calculateLocalScore = () => {
    const ratio = (key,goal,weight) => Math.min(weight,(Number(activeToday?.[key]||0)/goal)*weight);
    return Math.round(ratio('users',2,30)+ratio('ai_chat',5,25)+ratio('vision_analysis',2,20)+ratio('share_open',2,15)+ratio('feedback_send',1,10));
  };
  const growthScore = remote.configured ? remote.growthScore : calculateLocalScore();
  const dailyTotals=useMemo(()=>activeDaily.reduce((sum,item)=>sum+Number(item.app_open||0),0),[activeDaily]);
  const logout = async () => { await fetch('/api/admin-logout', { method: 'POST', credentials: 'include' }); go?.('home'); };
  return <Page title="Growth" sub="KIZASHIを作るフェーズから、数字で育てるフェーズへ">
    <div className="analytics-owner-bar"><span>🔐 管理者としてログイン中</span><button onClick={logout}>ログアウト</button></div>

    <section className="growth-hero">
      <div><small>KIZASHI GROWTH</small><h2>サービス成長の司令塔</h2><p>ユニークユーザー・外部アクセス・機能利用者を一つの画面で確認します。</p></div>
      <label>表示期間<select value={range} onChange={(e)=>setRange(Number(e.target.value))}><option value="7">過去7日</option><option value="30">過去30日</option><option value="90">過去90日</option><option value="365">過去1年</option></select></label>
    </section>

    {remote.configured && cloudHealth.connected ? <section className="analytics-connected"><b>✅ クラウド累計保存・通信確認済み</b><p>全ユーザーのイベントをUpstash Redisへ保存しています。30秒ごとに自動更新します。{remote.source?` 接続: ${remote.source}`:''}</p></section> : remote.configured ? <section className="analytics-warning"><b>⚠ Redis設定は検出しましたが通信確認できません</b><p>環境変数はありますが、RedisへのPINGが成功していません。再デプロイ後も続く場合は接続設定を確認してください。</p></section> : <section className="analytics-warning"><b>⚠ 全ユーザーの累計保存は未接続です</b><p>現在はこの端末に残っている全期間データを表示しています。VercelへUpstash Redisを接続すると、全端末の累計と過去推移が保存されます。</p></section>}
    {error && <section className="analytics-warning"><b>取得エラー</b><p>{error}</p></section>}

    <div className="growth-top-grid">
      <article className="growth-score-card"><small>TODAY'S GROWTH SCORE</small><strong>{loading?'—':growthScore}</strong><span>/ 100</span><p>{growthScore>=80?'Excellent — 大きく成長しています。':growthScore>=50?'Good — 順調に前進しています。':growthScore>0?'Growing — 今日の行動が数字に出ています。':'今日の最初の一歩を記録しましょう。'}</p></article>
      <DailyGoals today={activeToday}/>
      <div className="growth-today-deltas"><b>昨日との差（ユニーク）</b><span>利用者 {deltaText(activeDeltas?.users)}</span><span>新規 {deltaText(activeDeltas?.new_users)}</span><span>LIVE {deltaText(activeDeltas?.live_open_users)}</span><span>Guardian {deltaText(activeDeltas?.guardian_open_users)}</span><span>AI {deltaText(activeDeltas?.ai_chat_users)}</span><span>Vision {deltaText(activeDeltas?.vision_analysis_users)}</span></div>
    </div>

    <div className="growth-kpis unique-user-kpis">
      <article><small>累計ユーザー</small><strong>{loading?'—':remote.configured?format(remote.users):(events.length?1:0)}</strong><span>/ 100</span><em>ユニーク</em></article>
      <article><small>今日の新規</small><strong>{loading?'—':format(activeToday?.new_users ?? activeToday?.users)}</strong><em>新しく来た人</em></article>
      <article><small>リピーター</small><strong>{loading?'—':remote.configured?format(remote.repeatUsers):'—'}</strong><em>2回以上起動</em></article>
      <article><small>LIVE利用ユーザー</small><strong>{loading?'—':remote.configured?format(remote.unique?.live_open):'—'}</strong><em>ユニーク</em></article>
      <article><small>Guardian利用ユーザー</small><strong>{loading?'—':remote.configured?format(remote.unique?.guardian_open):'—'}</strong><em>ユニーク</em></article>
      <article><small>AIコーチ利用ユーザー</small><strong>{loading?'—':remote.configured?format(remote.unique?.ai_chat):'—'}</strong><em>ユニーク</em></article>
      <article><small>Vision利用ユーザー</small><strong>{loading?'—':remote.configured?format(remote.unique?.vision_analysis):'—'}</strong><em>ユニーク</em></article>
    </div>

    <section className="analytics-panel access-breakdown">
      <div className="panel-head"><div><small>ACCESS BREAKDOWN</small><h2>アクセス内訳</h2></div><b>管理者ログイン中のアクセスを分離</b></div>
      <div className="access-breakdown-grid">
        <article><small>総アクセス</small><strong>{format(remote.access?.total)}</strong><span>全app_open</span></article>
        <article><small>管理者アクセス</small><strong>{format(remote.access?.admin)}</strong><span>みずぴ管理者ログイン中</span></article>
        <article><small>外部アクセス</small><strong>{format(remote.access?.external)}</strong><span>総アクセス − 管理者</span></article>
      </div>
      <p className="analytics-footnote">※ 管理者アクセスは管理者ログインCookieが有効なブラウザでの起動を分類します。ユニーク利用者は同じ端末の更新を重複カウントしません。</p>
    </section>

    <div className="growth-layout">
      <section className="analytics-panel growth-goal-panel"><div className="panel-head"><div><small>GOAL PROGRESS</small><h2>β版の目標</h2></div></div>
        <Progress label="βユーザー" value={remote.configured?remote.users:(events.length?1:0)} goal={100}/>
        <Progress label="AI利用ユーザー" value={remote.configured?Number(remote.unique?.ai_chat||0):0} goal={50}/>
        <Progress label="Vision利用ユーザー" value={remote.configured?Number(remote.unique?.vision_analysis||0):0} goal={30}/>
        <Progress label="フィードバック送信者" value={remote.configured?Number(remote.unique?.feedback_send||0):0} goal={20}/>
        <Progress label="シェア利用ユーザー" value={remote.configured?Number(remote.unique?.share_open||0):0} goal={30}/>
      </section>
      <section className="analytics-panel"><div className="panel-head"><div><small>HISTORY</small><h2>ユニーク利用推移</h2></div><b>{format(remote.users)} 累計ユーザー</b></div><TrendChart daily={activeDaily}/></section>
    </div>


    <div className="analytics-grid"><section className="analytics-panel"><h2>日別履歴</h2><div className="growth-history"><div className="growth-history-head unique-history-head"><span>日付</span><span>利用者</span><span>新規</span><span>LIVE</span><span>Guardian</span><span>AI</span></div>{activeDaily.slice().reverse().map(item=><div className="unique-history-row" key={item.day}><b>{item.day}</b><span>{item.users||0}</span><span>{item.new_users||0}</span><span>{item.live_open_users||0}</span><span>{item.guardian_open_users||0}</span><span>{item.ai_chat_users||0}</span></div>)}</div></section>
      <section className="analytics-panel"><h2>直近イベント</h2><div className="analytics-feed">{(remote.recent.length?remote.recent:events.slice(-20).reverse()).slice(0,20).map((e,i)=><div key={`${e.at}-${i}`}><span>{LABELS[e.name]||e.name}</span><small>{new Date(e.at).toLocaleString('ja-JP')}</small></div>)}</div><button className="danger" onClick={()=>{if(confirm('この端末の計測履歴を消去しますか？')){clearLocalAnalytics();setEvents([])}}}>この端末の履歴を消去</button></section>
    </div>

    <section className="analytics-config-card"><div><small>TRACKING STATUS</small><h2>計測サービス接続状況</h2></div><div className="analytics-status-list"><span className={cloudHealth.connected?'on':'off'}>累計データベース <b>{cloudHealth.connected?`通信OK${cloudHealth.source?` (${cloudHealth.source})`:''}`:remote.configured?'設定あり・通信待ち':'未設定'}</b></span><span className={config.vercel?'on':'off'}>Vercel Analytics <b>{config.vercel?'導入済み':'停止'}</b></span><span className={config.ga4?'on':'off'}>Google Analytics 4 <b>{config.ga4?'接続済み':'ID未設定'}</b></span><span className={config.posthog?'on':'off'}>PostHog <b>{config.posthog?'接続済み':'キー未設定'}</b></span></div></section>
    <section className="analytics-panel analytics-setup"><h2>累計保存を有効にする設定</h2><p>Vercel MarketplaceでUpstash Redisを接続すると、環境変数は自動設定されます。手動設定の場合は次の2つを登録してください。</p><code>UPSTASH_REDIS_REST_URL=https://...</code><code>UPSTASH_REDIS_REST_TOKEN=...</code><p><b>Vercel KV形式（KV_REST_API_URL / KV_REST_API_TOKEN）にも対応済み。</b> 設定後に再デプロイすると、全ユーザーの累計・過去履歴・昨日との差が保存されます。</p></section>
  </Page>;
}
