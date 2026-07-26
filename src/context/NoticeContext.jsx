import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const NoticeContext = createContext(null);

export function NoticeProvider({ children }) {
  const [notices, setNotices] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setNotices((current) => current.filter((notice) => notice.id !== id));
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
  }, []);

  const notify = useCallback((message, type = 'info', duration = 3200) => {
    try {
      const prefs = JSON.parse(localStorage.getItem('kizashi_preferences') || '{}');
      if (prefs.notifications === false && type !== 'error') return null;
    } catch { /* use default */ }
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setNotices((current) => [...current.slice(-2), { id, message, type }]);
    const timer = setTimeout(() => dismiss(id), duration);
    timers.current.set(id, timer);
    return id;
  }, [dismiss]);

  const value = useMemo(() => ({ notify, dismiss }), [notify, dismiss]);
  return <NoticeContext.Provider value={value}>{children}<div className="notice-stack" aria-live="polite">{notices.map((notice) => <button key={notice.id} type="button" className={`notice notice-${notice.type}`} onClick={() => dismiss(notice.id)}><span>{notice.type === 'success' ? '✓' : notice.type === 'error' ? '!' : 'i'}</span><b>{notice.message}</b></button>)}</div></NoticeContext.Provider>;
}

export function useNotice() {
  const context = useContext(NoticeContext);
  if (!context) throw new Error('useNotice must be used inside NoticeProvider');
  return context;
}
