KIZASHI v10.1 Analytics + 管理者ロック版

実装済み:
- Vercel Web Analytics（Vercel側でEnable済みなら自動計測）
- GA4連携（VITE_GA_MEASUREMENT_ID）
- PostHog連携（VITE_POSTHOG_KEY / VITE_POSTHOG_HOST）
- 管理者専用Analytics画面
- HttpOnly Cookieによる12時間管理者セッション
- ADMIN_PASSWORD / ADMIN_SESSION_SECRET が未設定の場合は管理画面を開かない
- PostHogセッション録画OFF、テキスト・属性マスク

Vercel環境変数（必須）:
ADMIN_PASSWORD=自分だけが知るパスワード
ADMIN_SESSION_SECRET=32文字以上のランダム文字列

任意:
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_POSTHOG_KEY=phc_xxxxxxxxxx
VITE_POSTHOG_HOST=https://us.i.posthog.com

ローカル起動:
npm install
npm run dev

Vercel反映:
git add .
git commit -m "KIZASHI v10.1 analytics admin lock"
git push
