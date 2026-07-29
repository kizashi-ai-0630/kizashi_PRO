KIZASHI 9.18.1 — Vercel API Communication Restore

変更内容
- Vercel Serverless Functionsを追加
- /api/health を復旧
- /api/key-test を復旧
- /api/coach を復旧
- BYOK（利用者自身のOpenAI APIキー）を維持
- スクリーンショット解析を含むAIコーチ通信に対応
- APIキーはリクエストヘッダーでのみ受け取り、サーバーには保存しない

反映方法
1. このZIPの中身を現在のKIZASHI PROフォルダへ上書き
2. git add .
3. git commit -m "Restore Vercel AI API communication"
4. git push
5. VercelがReadyになった後、管理画面で「接続確認」
