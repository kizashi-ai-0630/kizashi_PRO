KIZASHI 10.5 Discord Feedback
===============================

追加内容
- アプリ内の「ご意見・不具合」からDiscordへ直接送信
- Vercel /api/feedback を経由するためWebhook URLは利用者に公開されません
- 送信成功時だけGrowth Analyticsの feedback_send を加算
- GitHubアカウント不要
- ローカル start.bat でも同じAPIを利用可能

Vercel設定（必須）
1. Discordでフィードバック専用チャンネルを作成
2. チャンネル設定 → 連携サービス → ウェブフック → 新しいウェブフック
3. Webhook URLをコピー
4. Vercel → Project → Settings → Environment Variables
5. Name: DISCORD_FEEDBACK_WEBHOOK_URL
6. Value: コピーしたWebhook URL
7. Production / Preview / Development を選択して保存
8. Deploymentsから最新デプロイをRedeploy

重要
- Webhook URLをGitHub、.env.exampleの実値、フロントコードへ貼らないでください
- もし公開してしまった場合はDiscord側でWebhookを削除し、作り直してください
