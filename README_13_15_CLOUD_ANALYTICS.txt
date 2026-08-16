KIZASHI 13.15 — CLOUD ANALYTICS LIVE

Vercel Marketplace Upstash for Redis の現在の環境変数名へ明示対応:
- KV_REST_API_URL
- KV_REST_API_TOKEN
（従来の UPSTASH_REDIS_REST_URL / TOKEN も対応）

追加:
- /api/analytics-health: RedisへPINGして本当に通信できているか確認
- 管理者Analyticsを30秒ごとに自動更新
- 「設定済み」ではなく「Redis通信OK」まで画面で確認
- 全ユーザーのユニーク利用者 / 起動 / AI / Vision / シェア / Feedback の累計保存
- LIVE表示を計測
- Guardian表示・条件ON/OFF・監視通貨変更を計測
- ローカルイベントにもvisitorIdを保存して端末内集計を改善

重要:
UpstashをVercelへ接続した後、この版をgit pushして新しいDeploymentを作ることで
環境変数がServerless Functionsへ反映されます。
