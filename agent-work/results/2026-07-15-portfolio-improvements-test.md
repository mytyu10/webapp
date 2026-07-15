# ポートフォリオ評価5項目 テスト結果

- 日付: 2026-07-15
- ステータス: 全テスト通過

## ユニットテスト結果

実行コマンド: `npm run test`

```
Test Suites: 9 passed, 9 total
Tests:       133 passed, 133 total
Snapshots:   0 total
Time:        2.322 s
```

- account.service.spec.ts — 合格（bcrypt 対応のモックに更新済み）
- event.service.spec.ts — 合格
- task.service.spec.ts — 合格
- line-notification.service.spec.ts — 合格
- event.repository.spec.ts — 合格
- task.repository.spec.ts — 合格
- task-notification.service.spec.ts — 合格
- batch-queue.service.spec.ts — 合格
- jwt-auth.guard.spec.ts — 合格

## E2E テスト結果

実行コマンド: `npm run test:e2e`

```
Test Suites: 1 passed, 1 total
Tests:       13 passed, 13 total
Snapshots:   0 total
Time:        1.408 s
```

### テストケース詳細

POST /accounts/regist:
- ✓ 新規ユーザーを登録できる（201）
- ✓ 同じユーザー名で再登録すると409が返る
- ✓ パスワードが短すぎる場合は400が返る

POST /accounts/login:
- ✓ 正しい認証情報でJWTが返る（200）
- ✓ パスワードが間違っている場合は400が返る
- ✓ 存在しないユーザーのログインは400が返る

GET /tasks（JWT付き）:
- ✓ JWT付きでタスク一覧が取得できる（200）
- ✓ JWTなしでは401が返る

POST /tasks（JWT付き）:
- ✓ JWT付きでタスクを作成できる（201）
- ✓ タイトルなしのタスク作成は400が返る
- ✓ JWTなしでは401が返る

GET /events（JWT付き）:
- ✓ JWT付きでイベント一覧が取得できる（200）
- ✓ JWTなしでは401が返る
