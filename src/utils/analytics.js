const STORE_KEY = 'kizashi_analytics_events_v1';
const MAX_LOCAL_EVENTS = 5000;
const VISITOR_KEY = 'kizashi_analytics_visitor_v1';
let initialized = false;

function env(name) { return String(import.meta.env?.[name] || '').trim(); }
function safeProps(props = {}) {
  return Object.fromEntries(Object.entries(props).filter(([, value]) => value !== undefined && value !== null).map(([key, value]) => [key, typeof value === 'string' ? value.slice(0, 120) : value]));
}
function addScript(src, id) {
  if (document.getElementById(id)) return;
  const script = document.createElement('script'); script.id = id; script.async = true; script.src = src; document.head.appendChild(script);
}
function visitorId() {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = globalThis.crypto?.randomUUID?.() || `visitor_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch { return 'anonymous'; }
}
function storeEvent(name, props) {
  try {
    const current = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
    current.push({ name, props: { ...props, visitorId: visitorId() }, at: new Date().toISOString() });
    localStorage.setItem(STORE_KEY, JSON.stringify(current.slice(-MAX_LOCAL_EVENTS)));
    window.dispatchEvent(new CustomEvent('kizashi:analytics'));
  } catch { /* local analytics must never break the app */ }
}

export function initAnalytics() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  // Vercel Web Analytics. Enable Analytics once in the Vercel project dashboard.
  if (location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') addScript('/_vercel/insights/script.js', 'vercel-analytics-script');

  const gaId = env('VITE_GA_MEASUREMENT_ID');
  if (gaId) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtag(){ window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', gaId, { send_page_view: false, anonymize_ip: true });
    addScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`, 'ga4-script');
  }

  const posthogKey = env('VITE_POSTHOG_KEY');
  if (posthogKey) {
    const host = env('VITE_POSTHOG_HOST') || 'https://us.i.posthog.com';
    window.posthog = window.posthog || [];
    const ph = window.posthog;
    ph._i = ph._i || [];
    ph.init = ph.init || function(key, options){ ph._i.push([key, options]); };
    ['capture','identify','reset','opt_out_capturing','opt_in_capturing'].forEach(method => { ph[method] = ph[method] || function(){ ph.push([method, ...arguments]); }; });
    ph.init(posthogKey, { api_host: host, capture_pageview: false, capture_pageleave: true, autocapture: true, disable_session_recording: true, mask_all_text: true, mask_all_element_attributes: true });
    addScript(`${host.replace(/\/$/, '')}/static/array.js`, 'posthog-script');
  }

  trackEvent('app_open', { version: '13.21-unique-user-analytics', path: location.hash || '#home' });
}

export function trackEvent(name, props = {}) {
  const clean = safeProps(props);
  storeEvent(name, clean);
  if (typeof window !== 'undefined' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
    fetch('/api/analytics-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({ name, props: clean, visitorId: visitorId() }),
    }).catch(() => {});
  }
  if (typeof window === 'undefined') return;
  window.gtag?.('event', name, clean);
  window.posthog?.capture?.(name, clean);
}

export function trackPage(page) {
  const path = `/#${page}`;
  trackEvent('page_view', { page_name: page, page_location: location.href, page_path: path });
}

export function getLocalAnalytics() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); } catch { return []; }
}
export function clearLocalAnalytics() { localStorage.removeItem(STORE_KEY); window.dispatchEvent(new CustomEvent('kizashi:analytics')); }
export function analyticsConfig() {
  return {
    vercel: location.hostname !== 'localhost' && location.hostname !== '127.0.0.1',
    ga4: Boolean(env('VITE_GA_MEASUREMENT_ID')),
    posthog: Boolean(env('VITE_POSTHOG_KEY')),
  };
}
