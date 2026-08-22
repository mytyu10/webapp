# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Full-stack TypeScript web app: React frontend (port 3000) + NestJS backend (port 8000) with SQLite via Prisma. UI and backend messages are in Japanese.

## Commands

### Backend (`cd backend`)

```bash
npm run start:dev     # dev server with watch
npm run build         # compile TypeScript
npm run lint          # ESLint with auto-fix
npm run format        # Prettier format
npm run test          # run unit tests
npm run test:cov      # unit tests with coverage
npm run test:e2e      # run E2E tests (requires backend/.env)
npx jest src/accounts/service/account.service.spec.ts  # single test file
```

### Frontend (`cd frontend`)

```bash
npm start             # dev server at localhost:3000
npm run build         # production build
npm test              # interactive test runner
```

### Playwright E2E テスト (`cd e2e`)

```bash
npm test              # ヘッドレスで全テスト実行
npm run test:headed   # ブラウザ表示ありで実行
npm run test:ui       # Playwright UI モードで実行
npm run test:debug    # デバッグモードで実行
npm run report        # テストレポートを開く
```

事前準備:
1. `cd backend && npm run build` — バックエンドをビルド
2. `cd frontend && REACT_APP_API_SCHEME=http REACT_APP_API_HOST=localhost REACT_APP_API_PORT=8000 CI=false npm run build` — フロントエンドをビルド
3. `cd backend && DATABASE_URL="file:./prisma/playwright-test.db" npx prisma migrate deploy` — テスト用DBを作成
4. `cd e2e && DATABASE_URL="file:../backend/prisma/playwright-test.db" JWT_SECRET="..." THROTTLE_LIMIT=100 npm test`

### Database (from `backend/`)

```bash
npx prisma migrate dev        # apply migrations (dev)
npx prisma migrate deploy     # apply migrations (prod)
npx prisma studio             # DB GUI
npx prisma generate           # regenerate Prisma client
```

### CI/CD (GitHub Actions)

ワークフローファイル: `.github/workflows/ci.yml`

- **トリガー**: `push`（全ブランチ）、`pull_request`（main/develop）
- **backend ジョブ**: lint → build → unit test → prisma migrate deploy → E2E test（Jest/supertest）
- **frontend ジョブ**: build → test（`--watchAll=false --ci`）
- **playwright ジョブ**: backend・frontend 完了後に実行。Chromium でブラウザ操作テスト。レポートを artifact として保存
- E2E テスト用 env（`DATABASE_URL=file:./test.db`）は GitHub Actions の `env:` で設定

## Architecture

Layered structure: **Controller → Service → Repository → Prisma**.

詳細設計は **[detailed-design/](detailed-design/)** を参照。スキーマは `backend/prisma/schema.prisma` を参照。

### 主要モジュール

- `src/accounts/` — アカウント管理・JWT 認証・WebAuthn（顔認証）。`GET /accounts/me`（ログインユーザー情報取得）・`PATCH /accounts/me`（display_name 更新）を提供。`UpdateMeDto`（`display_name?: string | null`）で入力検証
- `src/tasks/` — タスク管理・権限管理
- `src/events/` — カレンダー予定・繰り返し・権限・代理登録
- `src/links/` — リンク集・フォルダ管理・権限管理
- `src/chat/` — チャット（REST ポーリング、WebSocket不使用）
- `src/github/` — GitHub OAuth 連携・リポジトリ管理・Issue 取得。`GET /github/oauth/start`（認可URL取得・JwtAuthGuard適用）・`GET /github/oauth/callback`（公開エンドポイント・state パラメータから username を復元してトークンを DB 保存・フロントへリダイレクト）・`GET /github/status`・`GET /github/repos`・`POST /github/repos`・`DELETE /github/repos/:id`・`GET /github/issues`（全連携リポジトリのopenなIssueをGitHub REST API経由で取得・PR除外）。`GitHubToken`（アクセストークン保存）・`GitHubRepository`（連携リポジトリ設定）の2テーブルを管理する
- `src/voice/` — 音声コマンド。`POST /voice/command`（JwtAuthGuard適用）で音声認識テキストを受け取り、Claude API（`@anthropic-ai/sdk`・モデル: claude-3-5-haiku-20241022）で意図解析して `{ action, params }` 形式のJSONを返す。action種別: `navigate`（画面遷移）・`create_task`（タスク作成）・`complete_task`（タスク完了）・`create_event`（予定作成）・`unknown`（認識不能）。APIキーは環境変数 `ANTHROPIC_API_KEY` で管理。フロントエンドは `useVoiceCommand` フック（`frontend/src/hooks/useVoiceCommand.ts`）と `Sidebar.tsx` のマイクボタンで操作する（Web Speech API・lang: ja-JP）
- `src/common/` — OwnershipGuard・ハッシュ・ロガー・共通型

### フロントエンド主要ページ

- `/profile` — `ProfilePage.tsx`。`PATCH /accounts/me` で display_name を更新。GitHub 連携セクション（連携ボタン・リポジトリ追加・削除 UI）も提供する。OAuth コールバック後は `?github=success|error` クエリパラメータで結果を表示する
- `/tasks` — `TaskListPage.tsx`。タスク一覧の下に `GitHubIssueSection` コンポーネントで GitHub Issues を別セクション表示する。`useGitHubIssues` フックで連携状態・リポジトリ・Issue を管理する

### 環境変数 (`backend/.env`)

| 変数名 | 説明 |
|--------|------|
| `JWT_SECRET` | JWT署名シークレット |
| `FRONTEND_URL` | フロントエンドのベースURL（CORS・WebAuthn Origin・OAuthリダイレクトに使用）|
| `BACKEND_URL` | バックエンドのベースURL（GitHub OAuthコールバックURLの生成に使用）|
| `WEBAUTHN_RP_ID` | WebAuthn Relying Party ID（デフォルト: `localhost`）|
| `WEBAUTHN_RP_NAME` | WebAuthn Relying Party Name（デフォルト: `webapp`）|
| `GITHUB_CLIENT_ID` | GitHub OAuth App のクライアントID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App のクライアントシークレット |
| `ANTHROPIC_API_KEY` | Claude API キー（音声コマンド機能で使用） |
| `THROTTLE_LIMIT` | レートリミット上限数（E2Eテスト時は 100 程度に設定して緩和する） |
| `THROTTLE_TTL` | レートリミット時間窓(ms)（E2Eテスト時は 1000 程度に設定して緩和する） |

## 開発規約

詳細な開発規約は **[.claude/guidelines/conventions.md](.claude/guidelines/conventions.md)** を参照すること。
コードを生成・修正する前に必ずこのファイルを読み込んで規約に従うこと。

### 規約の自動更新ルール

以下のタイミングで `.claude/guidelines/conventions.md` を即座に更新すること:

**会話中の直接指摘**
- 生成したコードに対して「こうしてほしい」「こうするべき」と指摘した場合
- 「〜は使わないで」「〜にして」などのスタイル・設計の修正をした場合
- 採用したアプローチを承認した場合（暗黙のルールとして追記）
- 提案したアプローチをユーザーが承認しなかった場合 → そのアプローチを採用しない旨を追記

**エージェントの承認フェーズ（orchestrator-agent が担当）**
- 各ステップの承認ゲートでユーザーが承認せず修正を要求した場合、orchestrator-agent が却下内容を規約として追記する

更新時は該当する規約セクションに追記・修正し、ユーザーに「規約を更新しました」と伝えること。
追記は1〜3行以内に収める。CLAUDE.md 自体の更新も同様に最小限の変更に留める。

## Key Conventions

- Password hashing: **bcrypt (rounds=10)**。SHA-256 は使わない
- `POST /tasks` / `POST /events`（自分名義）の `created_by` はリクエストボディではなく JWT からサーバー側でセットする
- 権限付与（TaskPermission / LinkPermission / EventPermission）は作成者のみ実行可能
- `EventProxyGrant`: 他ユーザーが `POST /events` に `created_by` を指定して代理登録できる権限。サービス層で確認する
- OwnershipGuard: タスク（作成者 or 担当者 or WRITE権限）、リンク（作成者 or WRITE権限）、予定GET（作成者 or READ/WRITE権限）、予定PATCH/DELETE（作成者 or WRITE権限）。未存在は404・権限なしは403
- GitHub OAuth コールバックは JWT なしのブラウザリダイレクトで呼ばれるため JwtAuthGuard を使わない。state パラメータに username を Base64 エンコードして渡す
- チャットは REST API のみ。WebSocket（Socket.io）は使用しない
- Rate limiting: ThrottlerModule グローバル（1分20回）。login/regist/WebAuthn エンドポイント: 1分5回。`THROTTLE_LIMIT` / `THROTTLE_TTL` 環境変数で上書き可能（E2E テスト時に使用）
- Backend ESLint: `no-explicit-any` 無効、`no-floating-promises` / `no-unsafe-argument` 警告
- Prettier: single quotes, trailing commas
- Backend `tsconfig.json`: `noImplicitAny: false`, module resolution `nodenext`
- Swagger: `GET /api/docs`
- E2E tests（API）: `backend/test/app.e2e-spec.ts`。`ThrottlerGuard` を `overrideGuard` でモック
- E2E tests（ブラウザ）: `e2e/` ディレクトリ。`@playwright/test` でブラウザ操作テスト。テストファイルは `e2e/tests/*.spec.ts`
