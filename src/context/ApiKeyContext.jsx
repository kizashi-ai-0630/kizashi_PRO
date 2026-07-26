import { createContext, useContext, useMemo, useState } from 'react';

const STORAGE_KEY = 'kizashi_openai_api_key_beta';
const INTRO_KEY = 'kizashi_beta_intro_seen';
const ApiKeyContext = createContext(null);

const readStoredKey = () => {
  try { return localStorage.getItem(STORAGE_KEY) || ''; }
  catch { return ''; }
};

export function ApiKeyProvider({ children }) {
  const [apiKey, setApiKeyState] = useState(readStoredKey);
  const [introOpen, setIntroOpen] = useState(() => {
    try { return localStorage.getItem(INTRO_KEY) !== '1'; }
    catch { return true; }
  });

  const saveApiKey = (value, remember = true) => {
    const next = String(value || '').trim();
    setApiKeyState(next);
    try {
      if (remember && next) localStorage.setItem(STORAGE_KEY, next);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  const clearApiKey = () => saveApiKey('', false);
  const closeIntro = () => {
    setIntroOpen(false);
    try { localStorage.setItem(INTRO_KEY, '1'); } catch {}
  };

  const value = useMemo(() => ({
    apiKey,
    hasApiKey: Boolean(apiKey),
    saveApiKey,
    clearApiKey,
    introOpen,
    closeIntro,
    openIntro: () => setIntroOpen(true),
  }), [apiKey, introOpen]);

  return <ApiKeyContext.Provider value={value}>{children}</ApiKeyContext.Provider>;
}

export function useApiKey() {
  const value = useContext(ApiKeyContext);
  if (!value) throw new Error('useApiKey must be used inside ApiKeyProvider');
  return value;
}
