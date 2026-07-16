# セキュリティ修正（Critical 1〜3） 実装計画

- 日付: 2026-07-16
- ステータス: 承認済み

## 依頼内容

Critical 1〜3 のセキュリティ問題を修正する。

### Critical 1: `POST /tasks` の `created_by` をサーバー側で設定する
- `CreateTaskDto` から `created_by` フィールドを削除
- `TaskController.create` で `req.user.username` を `created_by` として使用
- `TaskService.create` のシグネチャを変更（`createdBy` 引数を追加）
- フロントエンドの `useTaskForm.ts` から `created_by` 送信を削除

### Critical 2: `GET /tasks/:id` と `GET /events/:id` に認可チェックを追加する
- `task.controller.ts` の `findOne` に `@CheckOwnership('task')` + `@UseGuards(OwnershipGuard)` を追加
- `event.controller.ts` の `findOne` に `@CheckOwnership('event')` + `@UseGuards(OwnershipGuard)` を追加

### Critical 3: 通知エンドポイントに所有者チェックを追加する
- `POST /tasks/:id/notifications` に `@CheckOwnership('task')` + `@UseGuards(OwnershipGuard)` を追加
- `DELETE /tasks/:id/notifications/:notificationId` に `@CheckOwnership('task')` + `@UseGuards(OwnershipGuard)` を追加

## 実装計画

### バックエンド

1. `backend/src/tasks/dto/task.dto.ts`
   - `CreateTaskDto` から `created_by` フィールド（`@ApiProperty`・`@IsString`・`@IsNotEmpty`・フィールド定義）を削除

2. `backend/src/tasks/service/task.service.ts`
   - `create(dto: CreateTaskDto)` → `create(dto: CreateTaskDto, createdBy: string)` にシグネチャ変更
   - `taskRepository.create` 呼び出しの `created_by: dto.created_by` → `created_by: createdBy` に変更

3. `backend/src/tasks/controller/task.controller.ts`
   - `create` メソッドに `@Req() req: Request` を追加
   - `req.user` の nullチェックを追加
   - `taskService.create(dto, requestUser.username)` に変更
   - `findOne` に `@CheckOwnership('task')` + `@UseGuards(OwnershipGuard)` を追加し `@Req()` を追加
   - `addNotification` に `@CheckOwnership('task')` + `@UseGuards(OwnershipGuard)` を追加し `@Req()` を追加
   - `removeNotification` に `@CheckOwnership('task')` + `@UseGuards(OwnershipGuard)` を追加し `@Req()` を追加

4. `backend/src/events/controller/event.controller.ts`
   - `findOne` に `@CheckOwnership('event')` + `@UseGuards(OwnershipGuard)` を追加し `@Req()` を追加

### フロントエンド

5. `frontend/src/hooks/useTaskForm.ts`
   - `input` オブジェクトから `created_by: username` を削除
   - `getCurrentUsername()` の呼び出しと関連エラーハンドリングを削除（`getCurrentUsername` のインポートも削除）

## レビュー結果

- DBスキーマ変更: なし
- リスク: `findOne` に `OwnershipGuard` を追加すると、他人のタスク/予定へのリンク直アクセスが 403 になる。これはセキュリティ修正の意図どおり
- 通知削除エンドポイント `DELETE /tasks/:id/notifications/:notificationId` では `request.params['id']` がタスクIDとして `OwnershipGuard` に渡されるため、正しく動作する
