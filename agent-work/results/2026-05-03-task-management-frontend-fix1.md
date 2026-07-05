# フロントエンド実装結果: タスク管理機能ソースレビュー修正

- 日付: 2026-05-03
- 種別: 修正（第1回）

## 生成・変更ファイル一覧

| ファイルパス | 変更種別 |
|------------|---------|
| `frontend/src/hooks/useTaskList.ts` | 修正 |
| `frontend/src/pages/TaskListPage.tsx` | 修正 |
| `frontend/src/api/taskApi.ts` | 修正 |
| `frontend/src/hooks/useTaskForm.ts` | 修正 |

## 実装内容のサマリー

### 修正1: `useTaskList.ts`（問題#2 + 問題#9）

**問題#2**: `handleToggleComplete` のエラーを誤って `setDeleteError` に書き込んでいた。
- `UseTaskListReturn` 型に `toggleCompleteError: string` を追加
- `useState` で `toggleCompleteError` / `setToggleCompleteError` を新規追加
- `handleToggleComplete` のエラーキャッチを `setToggleCompleteError(message)` に変更
- `return` 文に `toggleCompleteError` を追加

**問題#9**: `filteredTasks` の `useMemo` 内でソートが元の state を破壊する可能性があった。
- `selectedCategory` がない場合は `tasks` をそのまま参照していたため、`.sort()` が元配列を変更してしまう問題があった
- `[...filtered].sort(...)` で常にコピーしてからソートするよう変更（`selectedCategory` の有無に関わらず常にスプレッドコピー）

### 修正2: `TaskListPage.tsx`（問題#2の続き）

- `deleteError: toggleError` というエイリアス（`useTaskList` の `deleteError` を `toggleError` として受け取っていた誤り）を削除
- 新たに追加された `toggleCompleteError` を正しく受け取るよう変更
- `FormErrorBanner` の `message` プロップで `toggleError` を `toggleCompleteError` に置き換え

### 修正3: `taskApi.ts`（問題#1）

- `createTask` のレスポンスパース型を `{ task: Task }` から `{ message: string; task: Task }` に修正
- `updateTask` のレスポンスパース型を `{ task: Task }` から `{ message: string; task: Task }` に修正

### 修正4: `useTaskForm.ts`（問題#8）

- `if (parent.category)` のtruthyチェックで `string` に絞り込み済みにもかかわらず `?? ''` が残っていた
- `parent.category ?? ''` を `parent.category as string` に変更（TypeScriptの型推論が `string | null` のまま残るため型アサーションを使用）

## ユーザーへの確認事項

なし
