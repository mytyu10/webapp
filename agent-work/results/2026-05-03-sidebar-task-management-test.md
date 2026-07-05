# テスト結果: サイドバーレイアウト + タスク管理

- 日付: 2026-05-03
- ステータス: 全件合格

## バックエンド (Jest)

### 実行コマンド
```bash
cd backend && npx jest --forceExit
```

### 結果サマリー
- Test Suites: 2 passed, 2 total
- Tests: 17 passed, 17 total
- Snapshots: 0
- Time: ~0.8s

### テストファイル
| ファイル | 結果 | テスト数 |
|---------|------|---------|
| src/tasks/service/task.service.spec.ts | PASS | 12 |
| src/jwt/jwt-auth.guard.spec.ts | PASS | 5 |

### TaskService テスト詳細 (12件合格)
- findAll: タスク一覧を返す / タスクが存在しない場合は空配列を返す
- findById: 指定IDのタスクを返す / 存在しないIDの場合はNotFoundExceptionをスローする
- create: タスクを作成して返す / DBエラー時はInternalServerErrorExceptionをスローする
- update: 存在するタスクを更新して返す / 存在しないIDの場合はNotFoundExceptionをスローする / DBエラー時はInternalServerErrorExceptionをスローする
- remove: 存在するタスクを削除する / 存在しないIDの場合はNotFoundExceptionをスローする / DBエラー時はInternalServerErrorExceptionをスローする

### カバレッジ (テスト対象ファイル)
| ファイル | Stmts | Branch | Funcs | Lines |
|---------|-------|--------|-------|-------|
| src/tasks/service/task.service.ts | 88.88% | 84.61% | 76.92% | 88.33% |
| src/jwt/jwt-auth.guard.ts | 100% | 100% | 100% | 100% |
| src/common/type/message.ts | 100% | 100% | 100% | 100% |

## フロントエンド (React Testing Library / Jest)

### 実行コマンド
```bash
cd frontend && CI=true npm test
```

### 結果サマリー
- Test Suites: 2 passed, 2 total
- Tests: 25 passed, 25 total
- Snapshots: 0
- Time: ~0.6s

### テストファイル
| ファイル | 結果 | テスト数 |
|---------|------|---------|
| src/App.test.tsx | PASS | 1 |
| src/validation/taskValidation.spec.ts | PASS | 24 |

### taskValidation テスト詳細 (24件合格)
- validateTaskForm / title: 正常値 / 空 / 空白のみ / 200文字以内 / 201文字以上
- validateTaskForm / description: 空 / 1000文字以内 / 1001文字以上
- validateTaskForm / due_date: 空 / 不正な日時形式 / 正しいISO形式
- validateTaskForm / assignees: 空 / 50人以内 / 51人以上
- validateTaskForm / priority: HIGH / MEDIUM / LOW
- validateTaskForm / category: 空 / 100文字以内 / 101文字以上
- parseAssignees: カンマ区切り変換 / 前後空白トリム / 空文字 / 空白エントリー除外

## 修正事項

### App.test.tsx の修正
react-router-dom v7 は ESM のみ提供しており CRA の Jest 環境では直接解決できない問題が発覚。
対応:
1. `src/__mocks__/react-router-dom.tsx` を作成し手動モックを定義
2. `src/App.test.tsx` を現在の実装に合致した内容に書き換え（CRAテンプレートの `learn react` テストを削除）

## 失敗
なし（全件合格）
