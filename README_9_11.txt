KIZASHI 9.11 - Unified Trade Import

対応形式
- CSV（MT5 / 一般的な取引履歴）
- MT4 詳細レポート（.html / .htm）

処理フロー
Upload -> File Reader -> CSV Parser / MT4 HTML Parser -> 共通 Trade[] -> 既存の分析・AIコーチ・成長機能

MT4での保存方法
ターミナル（またはツールボックス）> 口座履歴 > 右クリック > 詳細レポートの保存
保存された Statement.htm をKIZASHIの「ファイルを変更」から選択してください。
ブラウザでHTMLを開くだけではKIZASHIには読み込まれません。

MT4 HTMLでは buy / sell の決済済み取引だけを取り込み、balance / credit / 入出金 / 集計行は除外します。
Profit + Commission + Swap + Taxes を共通損益として分析します。
