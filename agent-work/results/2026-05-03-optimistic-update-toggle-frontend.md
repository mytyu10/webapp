# フロントエンド実装結果: handleToggleComplete 楽観的更新

- 日付: 2026-05-03
- 種別: 修正（第1回）

## 生成・変更ファイル一覧

| ファイルパス | 変更種別 |
|------------|---------|
| `frontend/src/hooks/useTaskDetail.ts` | 修正 |

## 実装内容のサマリー

`useTaskDetail.ts` の `handleToggleComplete` を楽観的更新（Optimistic Update）パターンに変更した。

変更内容:
1. API 呼び出し前に `previousTask` へ更新前の task を退避（ロールバック用）
2. `setTask({ ...task, is_completed: newCompleted })` で UI を即座に反映
3. `setToggleCompleteError('')` を API 呼び出し前に移動
4. API 成功後に `setTask(updated)` でサーバーレスポンスを上書き（`closed_by` 等の確定値を正しく反映）
5. API 失敗時は `setTask(previousTask)` でロールバック

`UseTaskDetailReturn` 型・関数シグネチャ・`useCallback` の依存配列 `[task]` はすべて変更なし。
エラーメッセージはフロントエンドに既存の定数ファイルが存在しなかったため、変更前から使われていた `'タスクの更新に失敗しました。'` をそのまま継続使用。

## ユーザーへの確認事項

なし
