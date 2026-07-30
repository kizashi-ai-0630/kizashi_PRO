import { useEffect, useState } from 'react';

export default function AdminGate({ children, onAuthChange }) {
  const [state, setState] = useState({ loading: true, configured: true, authenticated: false });
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const check = async () => {
    try {
      const response = await fetch('/api/admin-session', { credentials: 'include', cache: 'no-store' });
      const data = await response.json();
      const next = { loading: false, configured: Boolean(data.configured), authenticated: Boolean(data.authenticated) };
      setState(next);
      onAuthChange?.(next.authenticated);
    } catch {
      setState({ loading: false, configured: false, authenticated: false });
      onAuthChange?.(false);
    }
  };

  useEffect(() => { check(); }, []);

  const login = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch('/api/admin-login', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'ログインできませんでした。');
      setPassword('');
      setState({ loading: false, configured: true, authenticated: true });
      onAuthChange?.(true);
    } catch (err) {
      setError(err.message || 'ログインできませんでした。');
    } finally {
      setSubmitting(false);
    }
  };

  if (state.loading) return <section className="admin-gate"><div className="admin-lock">🔐</div><h2>管理者認証を確認中...</h2></section>;
  if (state.authenticated) return children;

  return <section className="admin-gate">
    <div className="admin-lock">🔐</div>
    <small>KIZASHI OWNER ONLY</small>
    <h2>管理者専用Analytics</h2>
    <p>利用者数や機能利用状況は、管理者パスワードを知っている人だけ確認できます。</p>
    {!state.configured ? <div className="admin-config-warning">
      <b>管理者認証が未設定です</b>
      <span>Vercelの環境変数に <code>ADMIN_PASSWORD</code> と <code>ADMIN_SESSION_SECRET</code> を設定してください。</span>
    </div> : <form onSubmit={login} className="admin-login-form">
      <label>管理者パスワード<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required/></label>
      {error && <div className="admin-login-error">{error}</div>}
      <button type="submit" disabled={submitting}>{submitting ? '確認中...' : '管理者としてログイン'}</button>
    </form>}
  </section>;
}
