import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('KIZASHI UI error', error, info); }
  render() {
    if (!this.state.error) return this.props.children;
    return <main className="fatal-wrap"><section className="fatal-card"><div className="fatal-mark">!</div><small>KIZASHI SAFE MODE</small><h1>画面の表示中に問題が発生しました</h1><p>保存済みの取引データはそのままです。画面を再読み込みすると復旧できる場合があります。</p><button onClick={() => location.reload()}>画面を再読み込み</button><button className="fatal-sub" onClick={() => { location.hash = 'home'; location.reload(); }}>ホームへ戻る</button></section></main>;
  }
}
