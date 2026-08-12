import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const GuardianContext = createContext(null);

const DEFAULT_RULES = [
  { id: 'ma', label: '移動平均線 (MA)', enabled: true, detail: '短期と長期の方向・クロス状態を確認' },
  { id: 'atr', label: 'ATR / ボラティリティ', enabled: true, detail: '急激な値動きと低ボラ状態を検知' },
  { id: 'rsi', label: 'RSIゾーン', enabled: true, detail: '5分・1時間の過熱 / 売られ過ぎを確認' },
  { id: 'session', label: '市場セッション', enabled: true, detail: '東京・ロンドン・NY時間を区別' },
  { id: 'spread', label: 'スプレッド', enabled: true, detail: '取得可能な場合に現在スプレッドを表示' },
];

const DEFAULT_EVENTS = [
  { id: 1, time: '今日 14:25', symbol: 'USDJPY', message: '登録済み条件を検知しました。', tags: ['ATR', 'RSI', 'ロンドン時間'] },
  { id: 2, time: '昨日 21:10', symbol: 'EURJPY', message: '登録済み条件を検知しました。', tags: ['ボラティリティ', 'NY時間'] },
];

export function GuardianProvider({ children }) {
  const [enabled, setEnabled] = useState(() => localStorage.getItem('kizashi_guardian_enabled') !== 'false');
  const [symbols, setSymbols] = useState(() => {
    try { return JSON.parse(localStorage.getItem('kizashi_guardian_symbols')) || ['USDJPY', 'EURJPY', 'GBPJPY']; }
    catch { return ['USDJPY', 'EURJPY', 'GBPJPY']; }
  });
  const [rules, setRules] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('kizashi_guardian_rules')) || [];
      return DEFAULT_RULES.map(defaultRule => {
        const old = saved.find(rule => rule.id === defaultRule.id);
        return old ? { ...defaultRule, enabled: old.enabled } : defaultRule;
      });
    } catch { return DEFAULT_RULES; }
  });
  const [events, setEvents] = useState(DEFAULT_EVENTS);

  useEffect(() => localStorage.setItem('kizashi_guardian_enabled', String(enabled)), [enabled]);
  useEffect(() => localStorage.setItem('kizashi_guardian_symbols', JSON.stringify(symbols)), [symbols]);
  useEffect(() => localStorage.setItem('kizashi_guardian_rules', JSON.stringify(rules)), [rules]);

  const toggleSymbol = (symbol) => setSymbols(current => current.includes(symbol) ? current.filter(item => item !== symbol) : [...current, symbol]);
  const toggleRule = (id) => setRules(current => current.map(rule => rule.id === id ? { ...rule, enabled: !rule.enabled } : rule));
  const runTest = () => {
    const symbol = symbols[0] || 'USDJPY';
    const now = new Intl.DateTimeFormat('ja-JP', { hour: '2-digit', minute: '2-digit' }).format(new Date());
    setEvents(current => [{ id: Date.now(), time: `今日 ${now}`, symbol, message: '通知テスト：登録済み条件を検知しました。', tags: ['テスト通知'] }, ...current].slice(0, 8));
  };

  const value = useMemo(() => ({ enabled, setEnabled, symbols, toggleSymbol, rules, toggleRule, events, runTest }), [enabled, symbols, rules, events]);
  return <GuardianContext.Provider value={value}>{children}</GuardianContext.Provider>;
}

export function useGuardian() {
  const context = useContext(GuardianContext);
  if (!context) throw new Error('useGuardian must be used inside GuardianProvider');
  return context;
}
