# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Full-stack TypeScript web app: React frontend (port 3000) + NestJS backend (port 8000) with PostgreSQL via Prisma. UI and backend messages are in Japanese.

## Commands

### Backend (`cd backend`)

```bash
npm run start:dev     # dev server with watch
npm run build         # compile TypeScript
npm run lint          # ESLint with auto-fix
npm run format        # Prettier format
npm run test          # run unit tests
npm run test:watch    # unit tests in watch mode
npm run test:cov      # unit tests with coverage
```

Run a single test file:
```bash
npx jest src/accounts/service/account.service.spec.ts
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

## Architecture

### Backend (NestJS)

Layered module structure: **Controller → Service → Repository → Prisma**.

- `src/accounts/controller/` — REST endpoints (`POST /accounts/login`, `POST /accounts/regist`)
- `src/accounts/service/` — business logic
- `src/accounts/repository/` — Prisma queries
- `src/accounts/dto/` — validation DTOs (class-validator)
- `src/jwt/jwt.service.ts` — JWT creation (1h expiry, secret from `JWT_SECRET` env)
- `src/prisma/prisma.service.ts` — Prisma client singleton
- `src/common/service/hash.service.ts` — SHA256 password hashing
- `src/common/type/message.ts` — Japanese message constants (centralised)
- `src/common/type/status.enum.ts` — HTTP status enums

`AppModule` imports `AccountsModule`. `PrismaService` and `JwtService` are provided at the `AppModule` level and injected into `AccountsModule`.

**Login flow**: DTO validation → SHA256 hash password → query DB by username → compare hashes → issue JWT.

### Frontend (React + CRA)

- `src/App.tsx` — router: `/` → `HomePage`, `/login` → `LoginPage`
- `src/pages/LoginPage.tsx` — login form with client-side validation, posts to `http://localhost:8000/accounts/login`, stores JWT in `localStorage`

Frontend hardcodes `localhost:8000` as the backend URL — no `.env` configuration.

### Database

PostgreSQL hosted on Prisma (db.prisma.io). Connection string and `JWT_SECRET` live in `backend/.env`.

Schema: single `Account` model with `id`, `username` (unique), `hashed_password`.

Prisma config file: `backend/prisma.config.ts` (uses dotenv, loads `prisma/schema.prisma`).

## 開発規約

詳細な開発規約は **[.claude/guidelines/conventions.md](.claude/guidelines/conventions.md)** を参照すること。
コードを生成・修正する前に必ずこのファイルを読み込んで規約に従うこと。

### 規約の自動更新ルール

以下のタイミングで `.claude/guidelines/conventions.md` を即座に更新すること:

**会話中の直接指摘**
- 生成したコードに対して「こうしてほしい」「こうするべき」と指摘した場合
- 「〜は使わないで」「〜にして」などのスタイル・設計の修正をした場合
- 採用したアプローチを承認した場合（暗黙のルールとして追記）
- 提案したアプローチをユーザーが承認しなかった場合（「やめておく」「このままでいい」「不要」など）→ そのアプローチを採用しない旨を追記

**エージェントの承認フェーズ（orchestrator-agent が担当）**
- 各ステップの承認ゲートでユーザーが承認せず修正を要求した場合、orchestrator-agent が却下内容（何を・なぜ変えるか）を規約として追記する
- 対象ステップ: 実装計画・実装コード・テスト結果・ソースレビュー・設計書更新

更新時は該当する規約セクションに追記・修正し、ユーザーに「規約を更新しました」と伝えること。

## Key Conventions

- Password hashing uses **SHA256** (not bcrypt, despite bcrypt being installed)
- Backend ESLint disables `no-explicit-any`; warns on `no-floating-promises` and `no-unsafe-argument`
- Prettier: single quotes, trailing commas
- Backend `tsconfig.json`: `noImplicitAny: false`, module resolution `nodenext`
