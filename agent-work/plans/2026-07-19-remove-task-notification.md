# タスク通知機能削除 実装計画

- 日付: 2026-07-19
- ステータス: 承認済み

## 依頼内容
タスク通知機能をすべて削除する。LINE削除後に通知送信ロジックが消えており、通知日時を保存できるだけで実際には何も届かないデッドコードになっているため、完全に撤去する。

## 実装計画

### DBスキーマ変更: あり

### バックエンド削除対象
- schema.prisma から TaskNotification モデルと Task.notifications リレーションを削除
- task-notification.repository.ts を削除
- task-notification.service.ts を削除
- task-notification.service.spec.ts を削除
- task.controller.ts から通知エンドポイント3本を削除
- task.dto.ts から CreateNotificationDto・NotificationResponseDto・TaskResponseDto.notifications を削除
- task.module.ts から TaskNotificationService・TaskNotificationRepository の登録・エクスポートを削除
- task.service.ts から TaskNotification 関連 import・toNotificationDto・notifications フィールドマッピングを削除
- task.repository.ts から notifications include と TaskNotification import・型定義を削除
- message.ts から NOTIFICATION セクションを削除

### フロントエンド削除対象
- taskApi.ts から TaskNotification インターフェース・fetchNotifications・addNotification・deleteNotification・Task.notifications を削除
- TaskFormPage.tsx から通知追加UIセクションを削除
- useTaskForm.ts から通知関連の状態管理・API呼び出しをすべて削除
- TaskListPage.tsx から handleDeleteNotification・deleteNotification import・onDeleteNotification の渡しを削除
- TaskDetailPanel.tsx から通知一覧表示・onDeleteNotification コールバックを削除

### Prismaマイグレーション
- npx prisma migrate dev --name remove_task_notification

## レビュー結果
- リスクなし（デッドコードの削除のみ）
- TaskNotificationRepository が task.module.ts で exports されているため、他モジュールでの参照も確認が必要（CLAUDE.md に記載なし、削除で問題なし）
