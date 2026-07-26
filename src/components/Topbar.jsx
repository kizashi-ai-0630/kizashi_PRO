import { useState } from 'react';
export default function Topbar({ go }) {
  const [notice, setNotice] = useState(false);
  return <header className="topbar"><div/><div className="top-actions"><button onClick={() => setNotice(!notice)}>🔔</button><button onClick={() => go('settings')}>⚙</button><span className="avatar">👤</span><b>みずぴ⌄</b>{notice && <div className="popover"><b>通知</b><p>CSV分析の準備ができています。</p><p>今日の作戦を確認しましょう。</p></div>}</div></header>;
}
