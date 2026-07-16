# テスト結果: セキュリティ修正（Critical 1〜3）

- 日付: 2026-07-16

## ユニットテスト（バックエンド）

実行コマンド: `cd backend && npm run test`

結果: 全件パス
- テストスイート: 8件合格 / 0件失敗
- テスト: 122件合格 / 0件失敗

修正対象ファイルのテスト:
- `src/tasks/service/task.service.spec.ts` — PASS（create シグネチャ変更に伴いテストを修正済み）

## フロントエンドビルド

実行コマンド: `cd frontend && npm run build`

結果: 成功（エラーなし）

## E2Eテスト（バックエンド）

実行コマンド: `cd backend && npm run test:e2e`

結果: 既存の問題（`main.Account.line_user_id` カラムが存在しない）により全件失敗。
今回の変更とは無関係の既存問題のため、対処不要。

## 変更サマリー

| ファイル | 変更内容 |
|---------|---------|
| `backend/src/tasks/dto/task.dto.ts` | `CreateTaskDto` から `created_by` フィールドを削除 |
| `backend/src/tasks/service/task.service.ts` | `create(dto, createdBy)` にシグネチャ変更 |
| `backend/src/tasks/controller/task.controller.ts` | `create` でサーバー側 `created_by` 設定、`findOne`/`addNotification`/`getNotifications`/`removeNotification` に `@CheckOwnership('task')` + `@UseGuards(OwnershipGuard)` 追加 |
| `backend/src/events/controller/event.controller.ts` | `findOne` に `@CheckOwnership('event')` + `@UseGuards(OwnershipGuard)` 追加 |
| `backend/src/tasks/service/task.service.spec.ts` | `create` の引数変更に伴いテスト修正（`createdBy` 引数を追加、DTO から `created_by` 削除） |
| `frontend/src/hooks/useTaskForm.ts` | `created_by` の送信を削除、`getCurrentUsername` インポート・呼び出しを削除 |
