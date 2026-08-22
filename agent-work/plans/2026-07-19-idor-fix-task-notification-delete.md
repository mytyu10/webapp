# IDOR脆弱性修正 - TaskNotification削除のtaskId検証 実装計画

- 日付: 2026-07-19
- ステータス: 承認済み

## 依頼内容
GitHub Issue #21 の脆弱性修正: `DELETE /tasks/:id/notifications/:notificationId` のIDOR脆弱性を修正する。

リポジトリの `delete(notificationId)` が `notificationId` のみで削除を行い、その通知が指定タスクに属するか検証しない。
攻撃者は自分がアクセスできるタスクIDを使って、他ユーザーの通知を削除できる。

## 実装計画

### DBスキーマ変更: なし

### バックエンド実装ステップ

1. `backend/src/common/type/message.ts` に `NOTIFICATION.INVALID_TASK` メッセージ定数を追加する（例: `'通知が見つからないか指定タスクに属していません'`）
2. `backend/src/tasks/repository/task-notification.repository.ts` の `delete(notificationId)` を `delete(notificationId, taskId)` に変更し、`deleteMany({ where: { id: notificationId, task_id: taskId } })` を使って削除件数（`count`）を返す
3. `backend/src/tasks/service/task-notification.service.ts` の `removeNotification(notificationId)` を `removeNotification(notificationId, taskId)` に変更し、リポジトリから返った削除件数が0の場合は `NotFoundException(MESSAGE.NOTIFICATION.INVALID_TASK)` を投げる
4. `backend/src/tasks/controller/task.controller.ts` の `removeNotification` メソッドで `taskNotificationService.removeNotification(notificationId, id)` と `taskId` を第2引数として渡す

## レビュー結果

### チェックリスト
- [x] 修正箇所が依頼内容と一致している（リポジトリ・サービス・コントローラーの3層すべてを修正）
- [x] DBスキーマ変更なし（Prismaマイグレーション不要）
- [x] `deleteMany` + 件数チェックは Prisma での IDOR 修正として適切なパターン
- [x] `NotFoundException` を投げる場所はサービス層が適切
- [x] 既存のエラーメッセージ定数体系と整合している
- [x] `OwnershipGuard` で taskId に対するアクセス制御は既に実施されており、二重保護となる

### リスク・注意点
- リポジトリの `delete` メソッドシグネチャ変更により呼び出し元の他箇所への影響がないか確認が必要（確認済み: サービス層からのみ呼ばれている）
- `deleteMany` は存在しないIDに対してエラーを投げないため、削除件数チェックが必須
