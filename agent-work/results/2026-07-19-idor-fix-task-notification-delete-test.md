# IDOR脆弱性修正 - TaskNotification削除のtaskId検証 テスト結果

- 日付: 2026-07-19
- 対象: task-notification.service.spec.ts

## 実行コマンド
```
cd backend && npm run test
```

## 結果
- Test Suites: 8 passed, 8 total
- Tests: 124 passed, 124 total（修正前: 123 passed, 2 failed）

## 追加・修正テストケース
- `removeNotification > 通知を削除する`: 引数を `(1, 10)` に更新し、delete が `(1, 10)` で呼ばれることを検証
- `removeNotification > notificationId が taskId に属さない場合は NotFoundException をスローする`: delete が 0 を返すとき `NotFoundException(MESSAGE.NOTIFICATION.INVALID_TASK)` を投げることを検証
- `removeNotification > DBエラー時は InternalServerErrorException をスローする`: DBエラー時は `InternalServerErrorException(MESSAGE.NOTIFICATION.DELETE_FAILED)` を投げることを検証
