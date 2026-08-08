import { useEffect, useState } from 'react';

const OPENING_MS = 5200;
const ENTER_ENABLE_MS = 1800;

export default function OpeningSplash(){
  const [visible,setVisible]=useState(()=>{
    try{return sessionStorage.getItem('kizashi_opening_seen')!=='1'}catch{return true}
  });
  const [canEnter,setCanEnter]=useState(false);
  const [leaving,setLeaving]=useState(false);

  const close=()=>{
    if(leaving)return;
    setLeaving(true);
    try{sessionStorage.setItem('kizashi_opening_seen','1')}catch{}
    setTimeout(()=>setVisible(false),520);
  };

  useEffect(()=>{
    if(!visible)return;
    const enter=setTimeout(()=>setCanEnter(true),ENTER_ENABLE_MS);
    const auto=setTimeout(close,OPENING_MS);
    const key=(e)=>{if(e.key==='Escape')close(); if((e.key==='Enter'||e.key===' ')&&canEnter)close()};
    addEventListener('keydown',key);
    return()=>{clearTimeout(enter);clearTimeout(auto);removeEventListener('keydown',key)};
  },[visible,canEnter]);

  if(!visible)return null;
  return <section className={`opening-splash ${leaving?'is-leaving':''}`} aria-label="KIZASHI opening">
    <div className="opening-sky"/>
    <button className="opening-skip" onClick={close}>SKIP</button>
    <div className="opening-center">
      <div className="opening-mark" aria-hidden="true"><span>K</span></div>
      <h1>KIZASHI</h1>
      <p className="opening-sub">Your Trading Assistant</p>
      <i className="opening-rule"/>
      <p className="opening-copy">迷いを、確信へ。</p>
    </div>
    <button className={`opening-enter ${canEnter?'ready':''}`} onClick={close} disabled={!canEnter}>
      {canEnter?'CLICK TO ENTER':'LOADING...'}
    </button>
  </section>;
}
