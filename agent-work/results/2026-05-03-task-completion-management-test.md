# タスク完了管理機能 テスト結果

- 日付: 2026-05-03
- 対象機能: タスク完了管理・一覧改善・階層表示

## テスト対象ファイル

### バックエンド（新規テストケース追加）
- `backend/src/tasks/service/task.service.spec.ts`
- `backend/src/tasks/repository/task.repository.spec.ts`

### フロントエンド（新規テストファイル作成）
- `frontend/src/hooks/useTaskDetail.spec.ts`（新規作成）
- `frontend/src/hooks/useTaskList.spec.ts`（新規作成）
- `frontend/src/validation/taskValidation.spec.ts`（既存・変更なし）
- `frontend/src/App.test.tsx`（既存・変更なし）

## 実行結果

### バックエンド

```
PASS src/tasks/repository/task.repository.spec.ts
PASS src/tasks/service/task.service.spec.ts

Test Suites: 2 passed, 2 total
Tests:       30 passed, 30 total
Snapshots:   0 total
Time:        0.977 s
```

#### TaskService テスト内訳 (task.service.spec.ts)
- findAll: 4件
  - タスク一覧を返す
  - タスクが存在しない場合は空配列を返す
  - findAll の戻り値に is_completed が含まれる
  - is_completed が true のタスクを返す場合、戻り値の is_completed が true になる
- findById: 3件
  - 指定IDのタスクを返す
  - 存在しないIDの場合はNotFoundExceptionをスローする
  - findById の戻り値に is_completed が含まれる
- create: 2件
  - タスクを作成して返す
  - DBエラー時はInternalServerErrorExceptionをスローする
- update: 5件
  - 存在するタスクを更新して返す
  - 存在しないIDの場合はNotFoundExceptionをスローする
  - DBエラー時はInternalServerErrorExceptionをスローする
  - is_completed: true を渡すと Repository の update が is_completed: true で呼ばれる
  - is_completed: false を渡すと Repository の update が is_completed: false で呼ばれる
  - is_completed を渡さない場合も正常に更新が実行される
- remove: 3件
  - 存在するタスクを削除する
  - 存在しないIDの場合はNotFoundExceptionをスローする
  - DBエラー時はInternalServerErrorExceptionをスローする

#### TaskRepository テスト内訳 (task.repository.spec.ts)
- findAll: 4件
- findById: 2件
- update: 7件（is_completed の各ケース含む）

### フロントエンド

```
PASS src/validation/taskValidation.spec.ts
PASS src/App.test.tsx
PASS src/hooks/useTaskDetail.spec.ts
PASS src/hooks/useTaskList.spec.ts

Test Suites: 4 passed, 4 total
Tests:       45 passed, 45 total
Snapshots:   0 total
Time:        1.661 s
```

#### useTaskDetail テスト内訳（新規・8件）
- 初期状態でローディングが true になる
- タスク取得成功後に task がセットされ loading が false になる
- タスク取得失敗時に error がセットされる
- id が undefined の場合はフェッチを実行しない
- handleToggleComplete で完了状態が true に切り替わる
- handleToggleComplete で完了状態が false に戻る
- handleToggleComplete 失敗時に toggleCompleteError がセットされる
- task が null の場合は handleToggleComplete が何もしない

#### useTaskList テスト内訳（新規・12件）
- 初期状態でローディングが true になる
- タスク・カテゴリ取得成功後に state が更新される
- 未完了タスクは incompleteTrees に含まれる
- 完了済みタスクは completedTrees に含まれる
- 子タスクが depth 1 でフラット配列に展開される
- カテゴリフィルター適用時に一致しないタスクが除外される
- タスク取得失敗時に error がセットされる
- handleDelete でタスクが一覧から削除される
- handleDelete 失敗時に例外がスローされる
- handleToggleComplete で完了状態が更新される
- handleToggleComplete 失敗時に toggleCompleteError がセットされる
- reload を呼ぶと再度 fetchTasks が呼ばれる

## 合計

| 種別 | 合格 | 失敗 | スキップ |
|------|------|------|----------|
| バックエンド | 30 | 0 | 0 |
| フロントエンド | 45 | 0 | 0 |
| **合計** | **75** | **0** | **0** |

## 備考

- フロントエンドテストで `act(...)` 警告が出力されているが、これは `@testing-library/react` の `renderHook` + `waitFor` の組み合わせによる既知の動作（非同期 useEffect の state 更新）。テスト結果への影響なし
- `console.error` はテストフレームワークの警告であり、失敗扱いにはならない
