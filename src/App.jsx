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
import OpeningSplash from './components/OpeningSplash';

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
  const getPage = () => { const hash = location.hash.slice(1); return VALID_PAGES.has(hash) ? hash : 'home'; };
  const [page,setPage]=useState(getPage);
  useEffect(()=>{const onHash=()=>setPage(getPage());addEventListener('hashchange',onHash);return()=>removeEventListener('hashchange',onHash)},[]);
  useEffect(()=>{window.scrollTo({top:0,left:0,behavior:'auto'});trackPage(page)},[page]);
  const go=(next)=>{const target=VALID_PAGES.has(next)?next:'home';location.hash=target;setPage(target);scrollTo({top:0,behavior:'smooth'})};
  const PageComponent={home:Home,live:Live,brain:Brain,analysis:Analysis,coach:Coach,records:Records,growth:Growth,guardian:Guardian,settings:Settings,analytics:AnalyticsAdmin}[page] || Home;
  const requiresData = new Set(['brain','analysis','coach','records','growth']).has(page);
  const normalContent = requiresData && dataStatus === 'loading' ? <LoadingSkeleton/> : requiresData && dataStatus === 'error' ? <CsvErrorState message={dataError}/> : requiresData && !rows.length ? <CsvEmptyState/> : <Suspense fallback={<AppLoader/>}><PageComponent go={go}/></Suspense>;
  const content = page === 'analytics' ? <AdminGate><Suspense fallback={<AppLoader/>}><AnalyticsAdmin go={go}/></Suspense></AdminGate> : normalContent;
  return <><OpeningSplash/><BetaWelcome go={go}/><div className="app-shell"><Sidebar page={page} go={go}/><main className={`main main-deep ${page === 'home' ? 'main-home' : ''}`}><Topbar go={go}/>{content}</main><MobileNav page={page} go={go}/><ShareFeedback/>{page !== 'home' && <KizashiKun page={page} go={go}/>}</div></>;
}
