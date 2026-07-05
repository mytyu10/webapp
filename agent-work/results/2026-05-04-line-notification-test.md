# LINE通知機能 テスト結果

- 日付: 2026-05-04
- ステータス: 全件合格

## 実行コマンド

```bash
cd /Users/yuto/workspace/webapp/backend && npm run test
```

## テスト結果サマリー

- 合格: 108件
- 失敗: 0件
- スキップ: 0件
- テストスイート: 9スイート（全合格）

## テストスイート詳細

| スイート | 結果 |
|---------|------|
| src/tasks/service/task.service.spec.ts | PASS |
| src/line/line-notification.service.spec.ts | PASS |
| src/accounts/service/account.service.spec.ts | PASS |
| src/tasks/service/task-notification.service.spec.ts | PASS |
| src/events/service/event.service.spec.ts | PASS |
| src/events/repository/event.repository.spec.ts | PASS |
| src/tasks/repository/task.repository.spec.ts | PASS |
| src/common/service/batch-queue.service.spec.ts | PASS |
| src/jwt/jwt-auth.guard.spec.ts | PASS |

## 新規追加テストケース

### account.service.spec.ts（新規）
- login: 正常ログイン・ユーザー不存在・パスワード不一致
- regist: 正常登録・ユーザー名重複・DBエラー
- getLineLoginUrl: LINE認証URLが正しく生成される
- getMe: 未連携時・連携済み時・アカウント未存在時

### task-notification.service.spec.ts（新規）
- addNotification: 正常追加・DBエラー
- getNotifications: 一覧取得・空配列・DBエラー
- removeNotification: 正常削除・削除失敗(NotFoundException)

### line-notification.service.spec.ts（新規）
- sendPendingNotifications: 送信対象なし・LINE連携済み送信・未連携スキップ・トークン未設定早期リターン・API失敗時の動作・メッセージ内容確認

### task.service.spec.ts（既存修正）
- mockTask に notifications: [] を追加（toResponseDto 対応）
- notifications フィールドの変換テスト追加
