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
- `src/tasks/controller/` — REST endpoints (`GET /tasks`, `GET /tasks/categories`, `GET /tasks/:id`, `POST /tasks`, `PATCH /tasks/:id`, `DELETE /tasks/:id`) — JwtAuthGuard適用済み
- `src/tasks/service/` — タスクのビジネスロジック
- `src/tasks/repository/` — Prisma CRUD・カテゴリ取得
- `src/tasks/dto/task.dto.ts` — CreateTaskDto / UpdateTaskDto / TaskResponseDto / Priority型
- `src/jwt/jwt.service.ts` — JWT creation (1h expiry, secret from `JWT_SECRET` env)
- `src/jwt/jwt-auth.guard.ts` — JwtAuthGuard（Bearerトークン検証）
- `src/prisma/prisma.service.ts` — Prisma client singleton
- `src/common/service/hash.service.ts` — SHA256 password hashing
- `src/common/service/logger.service.ts` — ロガーサービス
- `src/common/type/message.ts` — Japanese message constants (centralised)
- `src/common/type/status.enum.ts` — HTTP status enums

`AppModule` imports `AccountsModule` and `TasksModule`. `PrismaService` and `JwtService` are provided at the `AppModule` level.

**Login flow**: DTO validation → SHA256 hash password → query DB by username → compare hashes → issue JWT.

**Task flow**: JwtAuthGuard → Controller → Service → Repository → Prisma.

### Frontend (React + CRA)

- `src/App.tsx` — router: `/` → `HomePage`（タスク一覧へリダイレクト）, `/login` → `LoginPage`, `/tasks` → `TaskListPage`, `/tasks/new` → `TaskFormPage`, `/tasks/:id` → `TaskDetailPage`, `/tasks/:id/edit` → `TaskFormPage`
- `src/components/PrivateRoute.tsx` — JWT存在チェック + exp有効期限検証。無効時は`/login`へリダイレクト
- `src/components/Sidebar.tsx` — サイドバーコンポーネント（タスク管理リンク・ログアウト）
- `src/components/SidebarLayout.tsx` — サイドバー付きレイアウト（Outlet使用）
- `src/pages/LoginPage.tsx` — login form, posts to backend `/accounts/login`, stores JWT in `localStorage`
- `src/pages/TaskListPage.tsx` — タスク一覧・カテゴリフィルター・削除確認モーダル。作成者のみ編集/削除表示
- `src/pages/TaskFormPage.tsx` — タスク作成・編集・子タスク作成（URLクエリ`parent_id`で切り替え）
- `src/pages/TaskDetailPage.tsx` — タスク詳細・子タスク一覧・子タスク作成ボタン。作成者のみ編集ボタン表示
- `src/api/taskApi.ts` — タスクAPI通信（`fetchTasks`, `fetchTask`, `fetchCategories`, `createTask`, `updateTask`, `deleteTask`, `getCurrentUsername`）
- `src/hooks/useTaskList.ts` — タスク一覧・削除・カテゴリフィルタリングフック
- `src/hooks/useTaskForm.ts` — タスクフォーム（作成/編集/子タスク作成モード対応）フック
- `src/validation/taskValidation.ts` — タスクフォームバリデーション（priority/category含む）
- `src/components/ConfirmModal.tsx` — 削除確認モーダル
- `src/components/TextAreaField.tsx` — textareaラッパー共通コンポーネント
- `src/components/DateTimeField.tsx` — datetime-local入力ラッパー共通コンポーネント
- `src/components/SelectField.tsx` — selectラッパー共通コンポーネント
- `src/components/CancelButton.tsx` — キャンセルボタン共通コンポーネント

API base URL is built from env vars: `REACT_APP_API_SCHEME`, `REACT_APP_API_HOST`, `REACT_APP_API_PORT`.

### Database

SQLite（開発環境）。接続URLは `backend/prisma.config.ts` で管理。`JWT_SECRET` は `backend/.env`。

Prisma config file: `backend/prisma.config.ts` (uses dotenv, loads `prisma/schema.prisma`).

**Schema:**

```prisma
model Account {
  username        String         @id
  hashed_password String
  task_assignees  TaskAssignee[]
  created_tasks   Task[]         @relation("TaskCreator")
}

model Task {
  id          Int            @id @default(autoincrement())
  title       String
  description String
  due_date    DateTime
  priority    String         @default("MEDIUM")  // HIGH / MEDIUM / LOW
  category    String?
  parent_id   Int?
  created_by  String
  created_at  DateTime       @default(now())
  updated_at  DateTime       @updatedAt
  assignees   TaskAssignee[]
  creator     Account        @relation("TaskCreator", fields: [created_by], references: [username])
  parent      Task?          @relation("TaskChildren", fields: [parent_id], references: [id])
  children    Task[]         @relation("TaskChildren")
}

model TaskAssignee {
  task_id  Int
  username String
  task     Task    @relation(fields: [task_id], references: [id], onDelete: Cascade)
  account  Account @relation(fields: [username], references: [username], onDelete: Cascade)

  @@id([task_id, username])
}
```

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
