import { MENU } from './Sidebar';
const MOBILE_IDS = ['home','brain','guardian','analysis','coach'];
export default function MobileNav({ page, go }) { const items = MENU.filter(([id]) => MOBILE_IDS.includes(id)); return <div className="mobile-nav">{items.map(([id,icon,title]) => <button className={page === id ? 'active' : ''} key={id} onClick={() => go(id)}><span>{icon}</span><small>{title}</small></button>)}</div>; }
