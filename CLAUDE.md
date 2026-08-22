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
- **backend ジョブ**: lint → build → unit test → prisma migrate deploy → E2E test
- **frontend ジョブ**: build → test（`--watchAll=false --ci`）
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
- `src/common/` — OwnershipGuard・ハッシュ・ロガー・共通型

### フロントエンド主要ページ

- `/profile` — `ProfilePage.tsx`。`PATCH /accounts/me` で display_name を更新。GitHub 連携セクション（連携ボタン・リポジトリ追加・削除 UI）も提供する。OAuth コールバック後は `?github=success|error` クエリパラメータで結果を表示する
- `/tasks` — `TaskListPage.tsx`。タスク一覧の下に `GitHubIssueSection` コンポーネントで GitHub Issues を別セクション表示する。`useGitHubIssues` フックで連携状態・リポジトリ・Issue を管理する

### 環境変数 (`backend/.env`)

| 変数名 | 説明 |
|--------|------|
| `JWT_SECRET` | JWT署名シークレット |
| `FRONTEND_URL` | フロントエンドのベースURL |
| `WEBAUTHN_RP_ID` | WebAuthn Relying Party ID（デフォルト: `localhost`）|
| `WEBAUTHN_RP_NAME` | WebAuthn Relying Party Name（デフォルト: `webapp`）|
| `WEBAUTHN_ORIGIN` | WebAuthn 検証対象 Origin（デフォルト: `http://localhost:3000`）|
| `GITHUB_CLIENT_ID` | GitHub OAuth App のクライアントID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App のクライアントシークレット |
| `GITHUB_CALLBACK_URL` | OAuth コールバック URL（例: `http://localhost:8000/github/oauth/callback`）|

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
- Rate limiting: ThrottlerModule グローバル（1分20回）。login/regist/WebAuthn エンドポイント: 1分5回
- Backend ESLint: `no-explicit-any` 無効、`no-floating-promises` / `no-unsafe-argument` 警告
- Prettier: single quotes, trailing commas
- Backend `tsconfig.json`: `noImplicitAny: false`, module resolution `nodenext`
- Swagger: `GET /api/docs`
- E2E tests: `backend/test/app.e2e-spec.ts`。`ThrottlerGuard` を `overrideGuard` でモック
