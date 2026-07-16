# テスト結果: GitHub Actions CI/CD パイプライン

- 日付: 2026-07-15
- 対象ファイル: `.github/workflows/ci.yml`

## 実行した検証

| 検証内容 | 結果 |
|---|---|
| YAML 構文チェック（タブ文字混入なし） | OK |
| ワークフロー名 (`name: CI`) | OK |
| push トリガー（全ブランチ） | OK |
| pull_request トリガー（main/develop） | OK |
| backend ジョブ定義 | OK |
| frontend ジョブ定義 | OK |
| Node.js 20 設定（両ジョブ） | OK |
| npm ci（両ジョブ） | OK |
| npm run lint（backend） | OK |
| npm run build（両ジョブ） | OK |
| npm run test（backend unit） | OK |
| npx prisma migrate deploy（E2E前） | OK |
| npm run test:e2e（backend） | OK |
| npm test -- --watchAll=false --ci（frontend） | OK |
| JWT_SECRET env | OK |
| DATABASE_URL=file:./test.db env | OK |
| LINE_LOGIN_CHANNEL_ID env | OK |
| LINE_LOGIN_CHANNEL_SECRET env | OK |
| LINE_MESSAGING_CHANNEL_ID env | OK |
| LINE_MESSAGING_CHANNEL_ACCESS_TOKEN env | OK |
| FRONTEND_URL env | OK |
| actions/checkout@v4 | OK |
| actions/setup-node@v4 | OK |

## サマリー
合格: 23件 / 失敗: 0件 / スキップ: 0件
