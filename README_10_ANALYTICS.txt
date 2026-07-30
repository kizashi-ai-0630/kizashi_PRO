KIZASHI v10.0 Analytics

実装済み
- Vercel Web Analytics script
- GA4 custom events
- PostHog autocapture / session replay / custom events
- Analytics管理ページ
- ローカルリアルタイムイベント表示
- 計測イベント: app_open, page_view, trade_file_upload, analysis_complete, ai_chat, vision_analysis, share_open, feedback_send, trade_file_error

Vercel本番設定
1. Vercel Project > Analytics で Web Analytics を有効化
2. Project Settings > Environment Variables に以下を追加
   VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
   VITE_POSTHOG_KEY=phc_xxxxxxxxxx
   VITE_POSTHOG_HOST=https://us.i.posthog.com
3. 再デプロイ

注意
- Analytics画面内の数字は「その端末・ブラウザ」の即時計測です。
- 全利用者数、流入元、継続率、セッション録画はVercel / GA4 / PostHogの各管理画面で確認します。
- 取引内容やAPIキーそのものはAnalyticsイベントへ送信しません。

管理者専用Analytics（重要）
- Analytics画面はHttpOnly Cookieを使った管理者認証で保護されています。
- VercelのProject Settings > Environment Variablesに以下を登録してください。
  ADMIN_PASSWORD=みずぴだけが知る強いパスワード
  ADMIN_SESSION_SECRET=32文字以上のランダムな秘密文字列
- ADMIN_SESSION_SECRETはパスワードと別の文字列にしてください。
- 設定後に再デプロイが必要です。
- 一般ユーザーは管理者パスワードがなければAnalytics内容を閲覧できません。
