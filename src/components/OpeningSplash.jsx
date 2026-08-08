import { useEffect, useState } from 'react';

const OPENING_MS = 5600;
const ENTER_ENABLE_MS = 1900;

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
    setTimeout(()=>setVisible(false),560);
  };

  useEffect(()=>{
    if(!visible)return;
    const enter=setTimeout(()=>setCanEnter(true),ENTER_ENABLE_MS);
    const auto=setTimeout(close,OPENING_MS);
    const key=(e)=>{
      if(e.key==='Escape')close();
      if((e.key==='Enter'||e.key===' ')&&canEnter)close();
    };
    addEventListener('keydown',key);
    return()=>{
      clearTimeout(enter);
      clearTimeout(auto);
      removeEventListener('keydown',key);
    };
  },[visible,canEnter]);

  if(!visible)return null;

  return (
    <section
      className={`opening-splash opening-cinematic ${leaving?'is-leaving':''}`}
      aria-label="KIZASHI opening"
      onClick={(e)=>{
        if(!canEnter)return;
        if(e.target.closest('.opening-skip-hit'))return;
        close();
      }}
    >
      <div className="opening-art-backdrop" aria-hidden="true" />
      <div className="opening-art-frame" aria-hidden="true">
        <img
          className="opening-art"
          src="/assets/kizashi-opening-cinematic.png"
          alt=""
          draggable="false"
        />
      </div>

      <button
        className="opening-skip-hit"
        type="button"
        onClick={(e)=>{e.stopPropagation();close();}}
        aria-label="Skip opening"
      >
        <span>SKIP</span>
      </button>

      <div className={`opening-ready-hint ${canEnter?'ready':''}`} aria-hidden="true">
        CLICK TO ENTER
      </div>
    </section>
  );
}
