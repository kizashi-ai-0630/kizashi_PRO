import { useEffect, useMemo, useState } from 'react';
import Page from '../components/Page';
import { analyticsConfig, clearLocalAnalytics, getLocalAnalytics } from '../utils/analytics';

const LABELS = { app_open:'起動', page_view:'ページ表示', trade_file_upload:'履歴読込', analysis_complete:'分析完了', ai_chat:'AIチャット', vision_analysis:'Vision解析', share_open:'シェア', feedback_send:'フィードバック' };
const dayKey = (iso) => new Date(iso).toLocaleDateString('ja-JP');

export default function AnalyticsAdmin({ go }){
  const [events,setEvents]=useState(getLocalAnalytics);
  useEffect(()=>{const update=()=>setEvents(getLocalAnalytics());window.addEventListener('kizashi:analytics',update);return()=>window.removeEventListener('kizashi:analytics',update)},[]);
  const config=analyticsConfig();
  const today=new Date().toLocaleDateString('ja-JP');
  const stats=useMemo(()=>{
    const todays=events.filter(e=>dayKey(e.at)===today);
    const count=name=>todays.filter(e=>e.name===name).length;
    const pages={}; todays.filter(e=>e.name==='page_view').forEach(e=>{const p=e.props?.page_name||'unknown';pages[p]=(pages[p]||0)+1});
    return { todays, opens:count('app_open'), uploads:count('trade_file_upload'), analyses:count('analysis_complete'), chats:count('ai_chat'), visions:count('vision_analysis'), pages:Object.entries(pages).sort((a,b)=>b[1]-a[1]) };
  },[events,today]);
  const logout = async () => { await fetch('/api/admin-logout', { method: 'POST', credentials: 'include' }); go?.('home'); };
  return <Page title="Analytics" sub="KIZASHIを作るフェーズから、数字で育てるフェーズへ">
    <div className="analytics-owner-bar"><span>🔐 管理者としてログイン中</span><button onClick={logout}>ログアウト</button></div>
    <section className="analytics-config-card"><div><small>TRACKING STATUS</small><h2>計測サービス接続状況</h2></div><div className="analytics-status-list"><span className={config.vercel?'on':'off'}>Vercel Analytics <b>{config.vercel?'導入済み':'ローカルでは停止'}</b></span><span className={config.ga4?'on':'off'}>Google Analytics 4 <b>{config.ga4?'接続済み':'ID未設定'}</b></span><span className={config.posthog?'on':'off'}>PostHog <b>{config.posthog?'接続済み':'キー未設定'}</b></span></div><p>全ユーザーの正式な人数・流入元・継続率は各サービスの管理画面で確認します。このページは、この端末で発生したイベントを即時表示します。</p></section>
    <div className="analytics-kpis"><article><small>今日の起動</small><strong>{stats.opens}</strong></article><article><small>履歴読込</small><strong>{stats.uploads}</strong></article><article><small>分析完了</small><strong>{stats.analyses}</strong></article><article><small>AIチャット</small><strong>{stats.chats}</strong></article><article><small>Vision</small><strong>{stats.visions}</strong></article></div>
    <div className="analytics-grid"><section className="analytics-panel"><h2>人気ページ（この端末・今日）</h2>{stats.pages.length?stats.pages.map(([page,count],i)=><div className="analytics-rank" key={page}><span>{i+1}</span><b>{page}</b><strong>{count}</strong></div>):<p>まだページ表示データがありません。</p>}</section><section className="analytics-panel"><h2>直近イベント</h2><div className="analytics-feed">{events.slice(-12).reverse().map((e,i)=><div key={`${e.at}-${i}`}><span>{LABELS[e.name]||e.name}</span><small>{new Date(e.at).toLocaleString('ja-JP')}</small></div>)}</div><button className="danger" onClick={()=>{if(confirm('この端末の計測履歴を消去しますか？')){clearLocalAnalytics();setEvents([])}}}>ローカル計測履歴を消去</button></section></div>
    <section className="analytics-panel analytics-setup"><h2>本番環境で必要な設定</h2><code>VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX</code><code>VITE_POSTHOG_KEY=phc_xxxxxxxxxx</code><code>VITE_POSTHOG_HOST=https://us.i.posthog.com</code><p>VercelのProject Settings → Environment Variablesへ登録し、Vercel側のAnalyticsも有効化して再デプロイしてください。</p></section>
  </Page>;
}
