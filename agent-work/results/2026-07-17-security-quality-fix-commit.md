# コミット結果: security-quality-fix

- 日付: 2026-07-17

## コミット情報

### コミット1: バックエンドのセキュリティ・品質修正

- ハッシュ: a19a3e7
- メッセージ: fix: バックエンドのセキュリティ・品質を改善する

### コミット2: フロントエンドのバグ修正

- ハッシュ: 8767a54
- メッセージ: fix: フロントエンドのバグ修正とテスト更新

### コミット3: @CurrentUser デコレーターとリファクタリング

- ハッシュ: 66a3444
- メッセージ: refactor: @CurrentUser デコレーターを追加しコントローラーの nullチェックを集約する

## コミット対象ファイル

### コミット1
- backend/src/accounts/controller/account.controller.ts
- backend/src/accounts/repository/account.repository.ts
- backend/src/chat/controller/chat.controller.ts
- backend/src/events/dto/event.dto.ts
- backend/src/links/dto/link.dto.ts
- backend/src/links/service/link-permission.service.ts
- backend/src/tasks/service/task-permission.service.ts
- backend/src/tasks/service/task.service.ts
- backend/test/app.e2e-spec.ts

### コミット2
- frontend/src/hooks/useCalendar.ts
- frontend/src/hooks/useCalendar.spec.ts
- frontend/src/hooks/useTaskForm.ts

### コミット3
- backend/src/common/decorators/current-user.decorator.ts（新規）
- backend/src/tasks/controller/task.controller.ts
- backend/src/events/controller/event.controller.ts
- backend/src/links/controller/link.controller.ts
- backend/src/chat/controller/chat.controller.ts
- backend/src/accounts/controller/account.controller.ts
