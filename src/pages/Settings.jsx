import { useEffect, useState } from 'react';
import Page from '../components/Page';
import { useTradeData } from '../context/TradeDataContext';
import { useNotice } from '../context/NoticeContext';
import { SAMPLE } from '../data/sample';
import { useApiKey } from '../context/ApiKeyContext';

const loadPrefs = () => {
  try { return { theme:'Ocean', notifications:true, animations:true, ...JSON.parse(localStorage.getItem('kizashi_preferences')) }; }
  catch { return { theme:'Ocean', notifications:true, animations:true }; }
};

export default function Settings(){
  const { rows,setRows,setFileName }=useTradeData();
  const { notify }=useNotice();
  const { apiKey, hasApiKey, saveApiKey, clearApiKey }=useApiKey();
  const [keyDraft,setKeyDraft]=useState(apiKey);
  const [rememberKey,setRememberKey]=useState(true);
  const [keyVisible,setKeyVisible]=useState(false);
  const [helpOpen,setHelpOpen]=useState(false);
  const [keyStatus,setKeyStatus]=useState({state:hasApiKey?'saved':'empty',message:hasApiKey?'保存済み':'未設定',model:''});
  const [prefs,setPrefs]=useState(loadPrefs);
  const [rule,setRule]=useState('');
  const [rules,setRules]=useState(()=>{try{return JSON.parse(localStorage.getItem('kizashi_rules'))||['3連敗したらその日の取引を終了する']}catch{return []}});

  useEffect(()=>{
    localStorage.setItem('kizashi_preferences',JSON.stringify(prefs));
    document.documentElement.dataset.motion=prefs.animations?'on':'off';
  },[prefs]);
  useEffect(()=>localStorage.setItem('kizashi_rules',JSON.stringify(rules)),[rules]);
  useEffect(()=>{
    if(!helpOpen)return undefined;
    const previous=document.body.style.overflow;
    document.body.style.overflow='hidden';
    const onKeyDown=(event)=>{if(event.key==='Escape')setHelpOpen(false)};
    window.addEventListener('keydown',onKeyDown);
    return()=>{document.body.style.overflow=previous;window.removeEventListener('keydown',onKeyDown)};
  },[helpOpen]);

  const update=(key,value)=>setPrefs(current=>({...current,[key]:value}));
  const addRule=()=>{const value=rule.trim();if(!value)return notify('ルールを入力してください','error');setRules(current=>[...current,value]);setRule('');notify('ルールを保存しました','success')};
  const reset=()=>{if(!confirm('ローカル設定と保存データを初期化しますか？'))return;localStorage.clear();location.reload()};
  const saveKey=()=>{const value=keyDraft.trim();if(!value)return notify('APIキーを入力してください','error');saveApiKey(value,rememberKey);setKeyStatus({state:'saved',message:'保存済み・接続確認前',model:''});notify('APIキーを保存しました','success')};
  const removeKey=()=>{clearApiKey();setKeyDraft('');setKeyStatus({state:'empty',message:'未設定',model:''});notify('APIキーを削除しました','success')};
  const testKey=async()=>{const value=keyDraft.trim()||apiKey;if(!value)return notify('APIキーを入力してください','error');setKeyStatus({state:'testing',message:'接続確認中…',model:''});try{const response=await fetch('/api/key-test',{method:'POST',headers:{'Content-Type':'application/json','X-OpenAI-API-Key':value}});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.message||'接続できませんでした');saveApiKey(value,rememberKey);setKeyStatus({state:'connected',message:'接続済み',model:data.model||'gpt-5-mini'});notify('OpenAIに接続できました','success')}catch(error){setKeyStatus({state:'error',message:error.message,model:''});notify(error.message,'error')}};

  return <Page title="管理" sub="公開準備・利用環境・トレードルールを整えます">
    <div className="release-banner"><div><small>KIZASHI 9.14 · TRADE IMPORT GUIDE BETA</small><h2>サブスク公開に向けた土台を準備中</h2><p>現在はローカルβ版です。決済や自動更新はまだ接続されていません。</p></div><span>β</span></div>
    <div className="settings-grid settings-grid-95">
      <section className="settings-card plan-card"><div className="settings-head"><div><small>YOUR PLAN</small><h2>Free β</h2></div><span className="plan-pill">利用中</span></div><p>分析・Guardianはそのまま利用でき、AIコーチはご自身のAPIキーで試せます。</p><div className="plan-usage"><div><span>保存済み取引</span><b>{rows.length}件</b></div><div><span>データ保存</span><b>この端末のみ</b></div></div><button disabled title="正式公開時に利用できます">Proプランは正式公開後に開始</button></section>
      <section className="settings-card"><h2>表示と通知</h2><label className="setting-row"><span><b>テーマ</b><small>現在はOceanのみ安定対応</small></span><select value={prefs.theme} onChange={e=>update('theme',e.target.value)}><option>Ocean</option></select></label><label className="setting-row"><span><b>通知</b><small>アプリ内通知を表示します</small></span><input type="checkbox" checked={prefs.notifications} onChange={e=>update('notifications',e.target.checked)}/></label><label className="setting-row"><span><b>アニメーション</b><small>画面の動きを減らすこともできます</small></span><input type="checkbox" checked={prefs.animations} onChange={e=>update('animations',e.target.checked)}/></label></section>

      <section className="settings-card api-key-card"><div className="settings-head"><div><small>AI CONNECTION</small><h2>OpenAI APIキー</h2></div><span className={`connection-pill ${keyStatus.state}`}>{keyStatus.state==='connected'?'● 接続済み':keyStatus.state==='testing'?'◌ 確認中':keyStatus.state==='error'?'● エラー':hasApiKey?'● 保存済み':'○ 未設定'}</span></div><p className="settings-note">AIコーチを使う人だけ設定します。分析・記録・GuardianはAPIキーなしで利用できます。</p><label className="api-key-input"><span>OpenAI API Key</span><div><input type={keyVisible?'text':'password'} value={keyDraft} onChange={e=>setKeyDraft(e.target.value)} placeholder="sk-proj-xxxxxxxxxxxxxxxx" autoComplete="off" spellCheck="false"/><button type="button" onClick={()=>setKeyVisible(v=>!v)}>{keyVisible?'隠す':'表示'}</button></div></label><label className="remember-key"><input type="checkbox" checked={rememberKey} onChange={e=>setRememberKey(e.target.checked)}/><span>この端末に保存する</span></label><div className="api-key-actions"><button className="state-primary" onClick={saveKey}>保存</button><button onClick={testKey} disabled={keyStatus.state==='testing'}>{keyStatus.state==='testing'?'確認中…':'接続確認'}</button>{hasApiKey&&<button className="danger" onClick={removeKey}>削除</button>}</div><div className={`api-status-box ${keyStatus.state}`}><b>🟢 OpenAI</b><span>状態：{keyStatus.message}</span><span>モデル：{keyStatus.model||'接続後に表示'}</span></div><p className="api-key-caution">キーは保存を選んだ場合のみ、このブラウザのlocalStorageに保存されます。AI利用時はKIZASHIの中継処理を通ってOpenAIへ送信されますが、サーバーやデータベースには保存しません。</p><div className="api-help-actions"><a className="api-platform-button" href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer">🟦 APIキーを取得する ↗</a><button type="button" className="api-guide-button" onClick={()=>setHelpOpen(true)}>📖 取得方法と料金を見る</button></div><p className="api-no-key-note"><b>APIキーがなくてもKIZASHIは使えます。</b><span>トレード分析・Guardian・記録・成長・CSV／MT4 HTML読込は、そのまま利用できます。</span></p></section>
      <section className="settings-card"><h2>データ管理</h2><p className="settings-note">現在のデータはブラウザ内に保存されます。ブラウザの削除や端末変更では引き継がれません。</p><button onClick={()=>{setRows(SAMPLE);setFileName('sample_trades.csv');notify('サンプルデータを復元しました','success')}}>サンプルデータを復元</button><button className="danger" onClick={reset}>ローカルデータを初期化</button></section>
      <section className="settings-card rule-card"><h2>マイルール</h2><div className="rule-input"><input value={rule} onChange={e=>setRule(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addRule()} placeholder="例：3連敗したら終了"/><button onClick={addRule}>追加</button></div><div className="saved-rules">{rules.length?rules.map((item,index)=><div key={`${item}-${index}`}><span>{index+1}</span><p>{item}</p><button aria-label="ルールを削除" onClick={()=>setRules(current=>current.filter((_,i)=>i!==index))}>×</button></div>):<p className="empty-rule">保存されたルールはありません</p>}</div></section>
    </div>
    {helpOpen&&<div className="api-guide-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setHelpOpen(false)}}><section className="api-guide-modal" role="dialog" aria-modal="true" aria-labelledby="api-guide-title"><button type="button" className="api-guide-close" aria-label="閉じる" onClick={()=>setHelpOpen(false)}>×</button><header><span>📖 OPENAI API GUIDE</span><h2 id="api-guide-title">OpenAI APIキーについて</h2><p>初めての方でも、約3分で準備できます。</p></header><div className="api-guide-content"><section><h3>🤖 AIコーチを利用するには</h3><p>KIZASHIのAIコーチは、OpenAIのAIを利用しています。AIコーチを使う場合のみ、ご自身のOpenAI APIキーが必要です。</p><div className="api-guide-free"><b>APIキーなしでも利用できます</b><span>分析・Guardian・記録・成長・CSV／MT4 HTML読込は、APIキーを設定せずに利用できます。</span></div></section><section><h3>✨ APIキーでできること</h3><ul className="api-check-list"><li>AIコーチによる取引データ分析</li><li>トレード改善アドバイス</li><li>AIとのチャット相談</li><li>チャート画像の読み取り（今後対応予定）</li></ul></section><section><h3>💰 利用料金について</h3><p>OpenAI APIは従量課金です。利用した分の料金がOpenAIから請求され、KIZASHI βの利用料金には含まれません。ChatGPT Plusなどの契約料金とも別です。</p><p>プリペイド方式を利用する場合、OpenAIの最低購入額は現在5ドルです。最初は5ドル程度から始め、OpenAI側で利用上限や自動チャージ設定を確認するのがおすすめです。</p><div className="api-money-note">💡 5ドルはOpenAIへのAPI利用料です。KIZASHIへの支払いではありません。</div></section><section><h3>📖 APIキー取得手順</h3><ol className="api-step-list"><li><b>OpenAI Platformを開く</b><span>下のボタンからOpenAI公式のAPI Keys画面を開きます。</span></li><li><b>OpenAIアカウントでログイン</b><span>普段のChatGPTと同じアカウントでもログインできます。</span></li><li><b>Billingを設定</b><span>API PlatformのBilling画面で支払い方法やクレジットを設定します。</span></li><li><b>必要に応じてクレジットを購入</b><span>プリペイドを使う場合は5ドルから購入できます。自動チャージの設定も確認してください。</span></li><li><b>API Keysでキーを作成</b><span>「Create new secret key」を押し、表示されたキーをコピーします。シークレットキーは再表示できないため、作成時に保存してください。</span></li><li><b>KIZASHIへ貼り付けて保存</b><span>この画面の入力欄に貼り付け、「保存」→「接続確認」を押します。</span></li></ol><div className="api-official-links"><a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer">API Keysを開く ↗</a><a href="https://platform.openai.com/settings/organization/billing/overview" target="_blank" rel="noreferrer">Billingを開く ↗</a></div></section><section><h3>🔒 APIキーの取り扱い</h3><ul className="api-safety-list"><li>「この端末に保存する」を選んだ場合のみ、このブラウザ内に保存します。</li><li>開発者用のデータベースには保存しません。</li><li>AI利用時に限り、KIZASHIの中継処理を通ってOpenAIへ送信されます。</li><li>共有PCでは保存せず、利用後にキーを削除してください。</li><li>OpenAI側で利用上限を設定し、キーを他人に共有しないでください。</li></ul></section><div className="api-guide-final"><b>📊 分析機能だけ試したい方へ</b><p>APIキーがなくても、KIZASHIの分析・Guardian・記録・成長機能はそのまま利用できます。AIコーチだけAPIキーが必要です。</p></div></div><footer><button type="button" onClick={()=>setHelpOpen(false)}>あとで設定する</button><a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer">OpenAI Platformを開く ↗</a></footer></section></div>}
  </Page>
}
