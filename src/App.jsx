import { lazy, Suspense, useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import MobileNav from './components/MobileNav';
import AppLoader from './components/AppLoader';
import { CsvEmptyState, CsvErrorState, LoadingSkeleton } from './components/ReleaseStates';
import { useTradeData } from './context/TradeDataContext';
import BetaWelcome from './components/BetaWelcome';

const Home = lazy(() => import('./pages/Home'));
const Brain = lazy(() => import('./pages/Brain'));
const Analysis = lazy(() => import('./pages/Analysis'));
const Coach = lazy(() => import('./pages/Coach'));
const Records = lazy(() => import('./pages/Records'));
const Growth = lazy(() => import('./pages/Growth'));
const Settings = lazy(() => import('./pages/Settings'));
const Guardian = lazy(() => import('./pages/Guardian'));

const VALID_PAGES = new Set(['home','brain','analysis','coach','records','growth','guardian','settings']);

export default function App(){
  const { rows, dataStatus, dataError } = useTradeData();
  const getPage = () => { const hash = location.hash.slice(1); return VALID_PAGES.has(hash) ? hash : 'home'; };
  const [page,setPage]=useState(getPage);
  useEffect(()=>{const onHash=()=>setPage(getPage());addEventListener('hashchange',onHash);return()=>removeEventListener('hashchange',onHash)},[]);
  useEffect(()=>{window.scrollTo({top:0,left:0,behavior:'auto'})},[page]);
  const go=(next)=>{const target=VALID_PAGES.has(next)?next:'home';location.hash=target;setPage(target);scrollTo({top:0,behavior:'smooth'})};
  const PageComponent={home:Home,brain:Brain,analysis:Analysis,coach:Coach,records:Records,growth:Growth,guardian:Guardian,settings:Settings}[page] || Home;
  const requiresData = new Set(['home','brain','analysis','coach','records','growth']).has(page);
  const content = requiresData && dataStatus === 'loading' ? <LoadingSkeleton/> : requiresData && dataStatus === 'error' ? <CsvErrorState message={dataError}/> : requiresData && !rows.length ? <CsvEmptyState/> : <Suspense fallback={<AppLoader/>}><PageComponent go={go}/></Suspense>;
  return <><BetaWelcome go={go}/><div className="app-shell"><Sidebar page={page} go={go}/><main className="main"><Topbar go={go}/>{content}</main><MobileNav page={page} go={go}/></div></>;
}
