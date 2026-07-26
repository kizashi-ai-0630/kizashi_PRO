KIZASHI PRO 9.0.3 Hotfix
========================

主な修正
- 「AI response was empty」の修正
- GPT-5系で推論トークンだけを使い切る問題を抑制
- Responses APIの複数の返却形式から本文を安全に抽出
- 空応答時の自動再試行
- 会話履歴を16件まで引き継ぎ
- APIエラーを分かりやすい日本語で表示

初回起動
1. このフォルダをVS Codeで開く
2. .env.exampleをコピーして、同じ場所に.envを作る
3. .envへ自分のOPENAI_API_KEYを設定する
4. ターミナルで npm install
5. npm run dev
6. 表示された http://localhost:5173 を開く

注意
- APIキーは他人に見せないでください。
- この配布ZIPには.envとnode_modulesは含まれていません。
- ChatGPT Plusとは別にOpenAI APIの残高が必要です。
