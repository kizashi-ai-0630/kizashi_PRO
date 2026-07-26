import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { SAMPLE } from '../data/sample';
import { buildDiagnosis, calculateMetrics } from '../utils/metrics';
import { buildIntelligence } from '../utils/aiEngine';
import { parseTradeFile } from '../utils/parser';
import { readTradeFile } from '../utils/fileReader';

const TradeDataContext = createContext(null);

export function TradeDataProvider({ children }) {
  const [rows, setRows] = useState(() => {
    try { const saved = localStorage.getItem('kizashi_rows'); return saved ? JSON.parse(saved) : SAMPLE; } catch { return SAMPLE; }
  });
  const [fileName, setFileName] = useState(() => localStorage.getItem('kizashi_file') || 'sample_trades.csv');
  const [dataStatus, setDataStatus] = useState('ready');
  const [dataError, setDataError] = useState('');
  const [fileType, setFileType] = useState(() => localStorage.getItem('kizashi_file_type') || 'sample');

  useEffect(() => {
    localStorage.setItem('kizashi_rows', JSON.stringify(rows));
    localStorage.setItem('kizashi_file', fileName);
    localStorage.setItem('kizashi_file_type', fileType);
  }, [rows, fileName, fileType]);

  const importTradeFile = async (file) => {
    if (!file) return false;
    setDataStatus('loading');
    setDataError('');
    try {
      const { text, type } = await readTradeFile(file);
      const data = parseTradeFile(text, type);
      if (!data.length) {
        throw new Error(type === 'html'
          ? 'MT4の決済済み取引が見つかりません。口座履歴から「詳細レポート」を保存したHTMLか確認してください。'
          : '取引データが0件です。CSVの列名や出力範囲を確認してください。');
      }
      setRows(data);
      setFileName(file.name);
      setFileType(type === 'html' ? 'mt4-html' : 'csv');
      setDataStatus('ready');
      return true;
    } catch (error) {
      setDataStatus('error');
      setDataError(error?.message || '取引履歴の読み込みに失敗しました。');
      return false;
    }
  };
  const clearDataError = () => { setDataError(''); setDataStatus(rows.length ? 'ready' : 'empty'); };
  const clearRows = () => { setRows([]); setFileName('未選択'); setFileType('none'); setDataError(''); setDataStatus('empty'); };

  const metrics = useMemo(() => calculateMetrics(rows), [rows]);
  const diagnosis = useMemo(() => buildDiagnosis(rows, metrics), [rows, metrics]);
  const intelligence = useMemo(() => buildIntelligence(rows, metrics, diagnosis), [rows, metrics, diagnosis]);
  const value = useMemo(
    () => ({ rows, setRows, fileName, setFileName, fileType, metrics, diagnosis, intelligence, dataStatus, dataError, importTradeFile, importCsv: importTradeFile, clearDataError, clearRows }),
    [rows, fileName, fileType, metrics, diagnosis, intelligence, dataStatus, dataError]
  );

  return <TradeDataContext.Provider value={value}>{children}</TradeDataContext.Provider>;
}

export function useTradeData() {
  const context = useContext(TradeDataContext);
  if (!context) throw new Error('useTradeData must be used inside TradeDataProvider');
  return context;
}
