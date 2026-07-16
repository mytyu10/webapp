# GitHub Actions CI/CD パイプライン 実装計画

- 日付: 2026-07-15
- ステータス: 承認済み

## 依頼内容

GitHub Actions を使って、push 時にビルド・lint・テストを実行する CI/CD パイプラインを構築する。

## 実装計画

### 新規ファイル
- `.github/workflows/ci.yml`

### DBスキーマ変更
なし

### バックエンド変更
なし

### フロントエンド変更
なし

### ワークフロー構成

#### トリガー
- `push`: 全ブランチ
- `pull_request`: main・develop ブランチ

#### backend ジョブ
1. actions/checkout
2. Node.js 20 セットアップ
3. `npm ci`（backend/）
4. `npm run lint`
5. `npm run build`
6. `npm run test`
7. `npx prisma migrate deploy`（E2E 用 SQLite スキーマ適用）
8. `npm run test:e2e`

E2E 用 env:
- `JWT_SECRET=test-secret-for-ci`
- `DATABASE_URL=file:./test.db`
- `LINE_LOGIN_CHANNEL_ID=dummy`
- `LINE_LOGIN_CHANNEL_SECRET=dummy`
- `LINE_MESSAGING_CHANNEL_ID=dummy`
- `LINE_MESSAGING_CHANNEL_ACCESS_TOKEN=dummy`
- `FRONTEND_URL=http://localhost:3000`

#### frontend ジョブ
1. actions/checkout
2. Node.js 20 セットアップ
3. `npm ci`（frontend/）
4. `npm run build`
5. `npm test -- --watchAll=false --ci`

### Node.js バージョン
`node-version: '20'`

## レビュー結果

- チェック: 全項目 OK
- リスク: `LINE_MESSAGING_CHANNEL_ID` は E2E テスト対象外（Cron が起動しても dummy 値で問題なし）。念のため env に含める
