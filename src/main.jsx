import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { TradeDataProvider } from './context/TradeDataContext';
import { GuardianProvider } from './context/GuardianContext';
import { NoticeProvider } from './context/NoticeContext';
import { ApiKeyProvider } from './context/ApiKeyContext';
import './styles.css';
import { initAnalytics } from './utils/analytics';

initAnalytics();

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <NoticeProvider>
        <ApiKeyProvider>
        <TradeDataProvider>
          <GuardianProvider><App /></GuardianProvider>
        </TradeDataProvider>
        </ApiKeyProvider>
      </NoticeProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
