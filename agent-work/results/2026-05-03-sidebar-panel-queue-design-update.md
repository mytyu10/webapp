# 設計書更新結果: サイドパネル統合・TaskQueueService追加

- 日付: 2026-05-03

## 更新した設計書

| 設計書 | 更新内容 |
|--------|---------|
| `detailed-design/02-architecture.md` | フロントエンド全体構成図から `/tasks/:id`・`/tasks/:id/edit` ルートを削除。バックエンド TaskModule に `TaskQueueService` を追記。バックエンド ディレクトリ構成に `task-queue.service.ts` を追記。フロントエンド ディレクトリ構成に `TaskDetailPanel.tsx` を追記、`TaskDetailPage.tsx` を削除、各フック・ページの説明を更新。DI構成の TaskModule に `TaskQueueService` を追加し `TaskService` の依存関係を更新。 |
| `detailed-design/04-api.md` | `PATCH /tasks/:id` の成功レスポンスメッセージを `"タスクを更新しました"` から `"タスクをキューで処理し更新しました"` に変更。処理フローに `TaskQueueService.enqueue()` 経由でのFIFOキュー処理ステップを追記。 |
| `detailed-design/05-frontend.md` | ルーティングコードブロックおよびテーブルから `/tasks/:id`・`/tasks/:id/edit` を削除。`TaskListPage` セクションを新アーキテクチャ（サイドパネル・リサイズディバイダー・共有ステート・awaitToggle）に全面更新。ローカルステート・導出値・ローカル関数・リサイズロジックを追記。`TaskCard` の Props テーブルを更新（ボタン系props削除、`onSelect` 追加）。`TaskDetailPanel` セクションを新規追加（Props・ローカルステート・コンポーネント構造・バリデーション・保存フロー）。`TaskDetailPage` セクションを削除済みの旨に更新。`useTaskList` フックに `togglingIds`・`tasksRef`・`togglePromisesRef`・`awaitToggle`・`handleUpdate`・`replaceTaskInTree` を追記。`useTaskDetail` に「現在未使用」注記を追加。`useTaskForm` に「編集モードは現在未使用」注記を追加。 |

## 更新しなかった設計書

| 設計書 | 理由 |
|--------|------|
| `detailed-design/01-overview.md` | 新機能の追加・技術スタック変更・環境変数の追加なし。実装済み機能テーブルの内容は変化なし（タスク詳細・編集機能は引き続き実装済み、表示方式が変わっただけ）。 |
| `detailed-design/03-database.md` | Prisma モデルの変更なし。 |
| `detailed-design/06-auth-flow.md` | 認証・認可フローの変更なし。 |
