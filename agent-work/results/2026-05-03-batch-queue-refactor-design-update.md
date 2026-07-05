# 設計書更新結果: BatchQueueService 共通モジュール化リファクタリング

- 日付: 2026-05-03

## 更新した設計書

| 設計書 | 更新内容 |
|--------|---------|
| `detailed-design/02-architecture.md` | 全体構成 ASCII 図: `TaskQueueService` を削除し `CommonModule`（`LoggerService` / `BatchQueueService`）をモジュールツリーに追加。バックエンド ディレクトリ構成: `tasks/service/task-queue.service.ts` を削除し `common/common.module.ts` と `common/service/batch-queue.service.ts` を追加。`task.service.ts` のコメントを BatchQueueService 経由に修正。DI 構成: `TaskModule` の providers から `TaskQueueService`/`LoggerService` を削除して `imports: CommonModule` を追加。`CommonModule` ブロックを新規追加し `LoggerService`/`BatchQueueService` を provides/exports に記載。 |

## 更新しなかった設計書

| 設計書 | 理由 |
|--------|------|
| `detailed-design/01-overview.md` | 新機能追加・技術スタック変更・環境変数追加なし |
| `detailed-design/03-database.md` | Prisma スキーマ・テーブル定義の変更なし |
| `detailed-design/04-api.md` | エンドポイント・DTO・レスポンス仕様の変更なし（PATCH の処理フロー記述は `TaskQueueService` → `BatchQueueService` の内部名変更だが、設計書上は「キュー」という概念で記述されており動作仕様は不変のため変更不要と判断） |
| `detailed-design/05-frontend.md` | フロントエンドコードの変更なし |
| `detailed-design/06-auth-flow.md` | 認証・認可フローの変更なし |
