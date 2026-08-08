import { lazy, Suspense, useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import MobileNav from './components/MobileNav';
import AppLoader from './components/AppLoader';
import { CsvEmptyState, CsvErrorState, LoadingSkeleton } from './components/ReleaseStates';
import { useTradeData } from './context/TradeDataContext';
import BetaWelcome from './components/BetaWelcome';
import ShareFeedback from './components/ShareFeedback';
import KizashiKun from './components/KizashiKun';
import { trackPage } from './utils/analytics';
import AdminGate from './components/AdminGate';

const Home = lazy(() => import('./pages/Home'));
const Brain = lazy(() => import('./pages/Brain'));
const Analysis = lazy(() => import('./pages/Analysis'));
const Coach = lazy(() => import('./pages/Coach'));
const Records = lazy(() => import('./pages/Records'));
const Growth = lazy(() => import('./pages/Growth'));
const Settings = lazy(() => import('./pages/Settings'));
const Guardian = lazy(() => import('./pages/Guardian'));
const AnalyticsAdmin = lazy(() => import('./pages/AnalyticsAdmin'));
const Live = lazy(() => import('./pages/Live'));

const VALID_PAGES = new Set(['home','live','brain','analysis','coach','records','growth','guardian','settings','analytics']);

export default function App(){
  const { rows, dataStatus, dataError } = useTradeData();
  const [showSplash, setShowSplash] = useState(true);
  const [splashLeaving, setSplashLeaving] = useState(false);
  useEffect(() => {
    if (!showSplash) return;
    const timer = window.setTimeout(() => {
      setSplashLeaving(true);
      window.setTimeout(() => setShowSplash(false), 650);
    }, 1900);
    return () => window.clearTimeout(timer);
  }, [showSplash]);
  const dismissSplash = () => {
    setSplashLeaving(true);
    window.setTimeout(() => setShowSplash(false), 450);
  };
  const getPage = () => { const hash = location.hash.slice(1); return VALID_PAGES.has(hash) ? hash : 'home'; };
  const [page,setPage]=useState(getPage);
  useEffect(()=>{const onHash=()=>setPage(getPage());addEventListener('hashchange',onHash);return()=>removeEventListener('hashchange',onHash)},[]);
  useEffect(()=>{window.scrollTo({top:0,left:0,behavior:'auto'});trackPage(page)},[page]);
  const go=(next)=>{const target=VALID_PAGES.has(next)?next:'home';location.hash=target;setPage(target);scrollTo({top:0,behavior:'smooth'})};
  const PageComponent={home:Home,live:Live,brain:Brain,analysis:Analysis,coach:Coach,records:Records,growth:Growth,guardian:Guardian,settings:Settings,analytics:AnalyticsAdmin}[page] || Home;
  const requiresData = new Set(['brain','analysis','coach','records','growth']).has(page);
  const normalContent = requiresData && dataStatus === 'loading' ? <LoadingSkeleton/> : requiresData && dataStatus === 'error' ? <CsvErrorState message={dataError}/> : requiresData && !rows.length ? <CsvEmptyState/> : <Suspense fallback={<AppLoader/>}><PageComponent go={go}/></Suspense>;
  const content = page === 'analytics' ? <AdminGate><Suspense fallback={<AppLoader/>}><AnalyticsAdmin go={go}/></Suspense></AdminGate> : normalContent;
  return <>{showSplash && <div className={`kizashi-splash ${splashLeaving ? 'is-leaving' : ''}`} onClick={dismissSplash} role="button" tabIndex={0} onKeyDown={(e)=>{if(e.key==='Enter'||e.key===' ') dismissSplash()}} aria-label="KIZASHIを開く"><div className="kizashi-splash-bg"/><div className="kizashi-splash-shine"/><button className="kizashi-splash-skip" onClick={(e)=>{e.stopPropagation();dismissSplash()}}>SKIP</button><div className="kizashi-splash-hint">CLICK TO ENTER</div></div>}<BetaWelcome go={go}/><div className="app-shell"><Sidebar page={page} go={go}/><main className="main"><Topbar go={go}/>{content}</main><MobileNav page={page} go={go}/><ShareFeedback/>{page !== 'home' && <KizashiKun page={page} go={go}/>}</div></>;
}
