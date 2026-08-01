KIZASHI 10.5.1 — Discord Feedback Final

変更内容
- フィードバック送信先をGitHub IssueからDiscord Webhookへ完全切替
- /api/feedback を経由してDiscordへ安全に送信
- 送信成功時のみGrowthのfeedback_sendを加算
- APIキー・取引履歴は送信しない
- 送信内容: 種類、本文、画面、端末、匿名利用者ID、日時
- DISCORD_FEEDBACK_WEBHOOK_URL が未設定の場合は明確なエラーを表示

Vercel環境変数
Key: DISCORD_FEEDBACK_WEBHOOK_URL
Value: DiscordでコピーしたWebhook URL
Environment: Production / Preview

反映後は必ずRedeployし、KIZASHIの「意見」ボタンからテスト送信してください。
