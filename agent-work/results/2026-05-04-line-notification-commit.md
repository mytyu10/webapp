# コミット結果: LINE通知機能

- 日付: 2026-05-04

## コミット情報（10件・関心事別分割）

| # | ハッシュ | メッセージ |
|---|--------|-----------|
| 1 | a65cb62 | feat: LINE通知のためにAccount.line_user_idとTaskNotificationモデルを追加 |
| 2 | 059c78d | chore: LINE通知機能に必要な依存パッケージを追加 |
| 3 | 77056fa | feat: LINE Login OAuth連携エンドポイントとユーザー情報取得APIを追加 |
| 4 | 08370b3 | feat: タスク通知CRUDエンドポイントとリポジトリを追加 |
| 5 | bfa851d | feat: LINE Messaging APIによる毎分Cron通知送信サービスを追加 |
| 6 | 809962a | test: LINE OAuth・タスク通知・LINE通知CronのUnit Testを追加 |
| 7 | 86f297c | feat: サイドバーにLINE連携ボタンとLINEコールバックページを追加 |
| 8 | 75f418e | feat: タスクフォームと詳細パネルにLINE通知設定UIを追加 |
| 9 | 85cddc5 | feat: 通知API関数・担当者必須バリデーション・/line-callbackルートを追加 |
| 10 | 7825a01 | docs: LINE通知機能を反映してCLAUDE.md・規約・詳細設計書を更新 |

## コミット対象ファイル

### コミット1: DBスキーマ・マイグレーション
- backend/prisma/schema.prisma
- backend/prisma/migrations/20260504092959_add_line_notification/migration.sql

### コミット2: 依存パッケージ
- backend/package.json
- backend/package-lock.json

### コミット3: バックエンド LINE OAuth連携
- backend/src/accounts/controller/account.controller.ts
- backend/src/accounts/dto/account.dto.ts（新規）
- backend/src/accounts/module/account.module.ts
- backend/src/accounts/repository/account.repository.ts
- backend/src/accounts/service/account.service.ts

### コミット4: バックエンド タスク通知CRUD
- backend/src/tasks/repository/task-notification.repository.ts（新規）
- backend/src/tasks/service/task-notification.service.ts（新規）
- backend/src/tasks/controller/task.controller.ts
- backend/src/tasks/dto/task.dto.ts
- backend/src/tasks/module/task.module.ts
- backend/src/tasks/repository/task.repository.ts
- backend/src/tasks/service/task.service.ts

### コミット5: バックエンド LINE通知Cronバッチ
- backend/src/line/line-notification.service.ts（新規）
- backend/src/app.module.ts
- backend/src/common/type/message.ts

### コミット6: バックエンド テスト
- backend/src/accounts/service/account.service.spec.ts（新規）
- backend/src/line/line-notification.service.spec.ts（新規）
- backend/src/tasks/service/task-notification.service.spec.ts（新規）
- backend/src/tasks/service/task.service.spec.ts

### コミット7: フロントエンド LINE連携UI
- frontend/src/pages/LineCallbackPage.tsx（新規）
- frontend/src/components/Sidebar.tsx

### コミット8: フロントエンド タスク通知UI
- frontend/src/pages/TaskFormPage.tsx
- frontend/src/hooks/useTaskForm.ts
- frontend/src/components/TaskDetailPanel.tsx
- frontend/src/pages/TaskListPage.tsx

### コミット9: フロントエンド API・バリデーション・ルーター
- frontend/src/api/taskApi.ts
- frontend/src/validation/taskValidation.ts
- frontend/src/App.tsx

### コミット10: 設計書・規約更新
- CLAUDE.md
- .claude/guidelines/conventions.md
- .claude/settings.json
- detailed-design/01-overview.md
- detailed-design/02-architecture.md
- detailed-design/03-database.md
- detailed-design/04-api.md
- detailed-design/05-frontend.md
- detailed-design/06-auth-flow.md
- detailed-design/README.md
