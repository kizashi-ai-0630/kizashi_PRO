KIZASHI 10.2 GROWTH DASHBOARD

追加内容
- 全ユーザーの累計βユーザー数
- AI / Vision / シェア / フィードバック累計
- 過去7日・30日・90日・1年の履歴
- 日別利用者・起動・AI・Vision・シェア
- β目標の進捗バー
- 直近イベント
- 未設定時はローカル当日データへ安全にフォールバック

本番で累計保存を有効化する手順
1. Upstashで無料Redis Databaseを作成
2. Vercel Project Settings > Environment Variablesへ以下を追加
   UPSTASH_REDIS_REST_URL
   UPSTASH_REDIS_REST_TOKEN
3. Production / Preview / Developmentに適用
4. Redeploy

注意
- 環境変数設定前の過去データは遡って復元できません。
- 個人を特定するメール・氏名・取引内容は保存しません。
- 匿名Visitor IDとイベント件数のみ保存します。
