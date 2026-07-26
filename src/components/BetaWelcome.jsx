import { useState } from 'react';
import { useApiKey } from '../context/ApiKeyContext';

export default function BetaWelcome({ go }) {
  const { introOpen, closeIntro, hasApiKey } = useApiKey();
  const [showDetails, setShowDetails] = useState(false);
  if (!introOpen) return null;

  const moveToSettings = () => {
    closeIntro();
    go?.('settings');
  };

  return <div className="beta-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="beta-title">
    <section className="beta-modal-card">
      <span className="release-chip">KIZASHI β</span>
      <div className="beta-wave">🌊</div>
      <h1 id="beta-title">ようこそ KIZASHI βへ</h1>
      <p>分析機能はAPIキーなしで利用できます。AIコーチを使う場合のみ、ご自身のOpenAI APIキーを設定してください。</p>
      <div className="beta-security-note">
        <b>🔐 キーの保存先</b>
        <span>保存を選んだ場合、このブラウザのlocalStorageに保存されます。AI利用時だけKIZASHIの中継処理を通してOpenAIへ送信され、KIZASHIのデータベースには保存しません。</span>
      </div>
      {showDetails && <div className="beta-detail-note">共有PCや不特定多数が使う端末では保存しないでください。ブラウザ拡張機能や端末内の悪意あるスクリプトから完全に保護できる方式ではないため、βテスト専用キー・利用上限の設定を推奨します。</div>}
      <div className="beta-modal-actions">
        <button className="state-primary" onClick={moveToSettings}>{hasApiKey ? 'API設定を確認' : 'APIキーを設定'}</button>
        <button onClick={closeIntro}>分析だけ試す</button>
      </div>
      <button className="beta-more" onClick={() => setShowDetails((v) => !v)}>{showDetails ? '注意事項を閉じる' : '安全性について詳しく'}</button>
    </section>
  </div>;
}
