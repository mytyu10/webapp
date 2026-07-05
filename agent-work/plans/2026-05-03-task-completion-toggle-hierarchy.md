# タスク完了状態トグル・一覧階層表示 実装計画

- 日付: 2026-05-03
- ステータス: 承認済み

## 依頼内容

タスク完了状態のトグル機能と一覧ページでの階層表示（完了/未完了セクション分割・折りたたみ）を実装する。

## 実装計画

### DBスキーマ変更
`Task` モデルに `is_completed Boolean @default(false)` を追加

### 変更対象ファイル

**バックエンド（実装済み）**
1. `backend/prisma/schema.prisma` — `is_completed Boolean @default(false)` 追加済み
2. `backend/src/tasks/dto/task.dto.ts` — `TaskResponseDto` に `is_completed: boolean`、`UpdateTaskDto` に `is_completed?: boolean` 追加済み
3. `backend/src/tasks/repository/task.repository.ts` — `update` で `is_completed` を含む条件付き更新ロジック実装済み
4. Prismaマイグレーション `20260503002908_add_is_completed_to_task` 適用済み

**フロントエンド（実装必要）**
5. `frontend/src/hooks/useTaskDetail.ts` — 新規作成（タスク取得・完了トグル・ローディング・エラー状態）
6. `frontend/src/pages/TaskDetailPage.tsx` — 完了ボタン追加・`useTaskDetail.ts` への切り出し
7. `frontend/src/hooks/useTaskList.ts` — 完了/未完了セクション分割ロジック追加
8. `frontend/src/pages/TaskListPage.tsx` — 完了済みセクション（折りたたみ可）の表示追加

### 注意事項
- 子タスクを完了にしても親タスクは自動完了しない（独立した完了管理）
- カテゴリフィルター適用時も階層構造を保持
- `PATCH /tasks/:id` 既存エンドポイントを流用（新エンドポイント不要）

## レビュー結果

**判定: 承認**

### チェックリスト
- [x] DBスキーマ変更済み
- [x] マイグレーション適用済み
- [x] バックエンドDTO・リポジトリ実装済み
- [x] フロントエンドAPI層（toggleTaskCompletion）実装済み
- [ ] useTaskDetail フック作成
- [ ] TaskDetailPage 完了ボタン追加
- [ ] useTaskList 完了/未完了セクション分割
- [ ] TaskListPage 完了済みセクション表示

### リスク
- カテゴリフィルターと階層表示の組み合わせ時、子タスクのみ一致する場合の親タスク表示制御に注意
- TaskDetailPage のロジック切り出しは既存の状態管理を useTaskDetail フックに移行するリファクタリングも含む
