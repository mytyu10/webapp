# 案C: 処理中フラグ + 詳細遷移待機 実装計画

- 日付: 2026-05-03
- ステータス: 承認済み

## 依頼内容

タスク一覧で「完了」ボタンを押してすぐ「詳細」ボタンで遷移すると、詳細画面で完了状態が反映されないバグを修正する。
原因: 楽観的更新で一覧の表示は即座に変わるが、PATCH リクエスト完了前に詳細画面の fetchTask（GET）が実行されてしまい古いデータが返る競合状態。

## 実装計画

### DBスキーマ変更: なし

### バックエンド変更: なし

### フロントエンド変更

#### 1. `frontend/src/hooks/useTaskList.ts`

- `togglingIds: Set<number>` state を追加（PATCH 実行中のタスクID集合）
- `togglePromisesRef: Map<number, Promise<void>>` を ref として追加
- `handleToggleComplete` 修正:
  - 開始時に togglingIds に id を追加し、Promise をマップに保存
  - finally で togglingIds から id を除去し、マップからも削除
- `awaitToggle(id: number): Promise<void>` 関数を追加（togglePromisesRef に Promise があれば await、なければ即 resolve）
- `UseTaskListReturn` 型に `togglingIds` と `awaitToggle` を追加

#### 2. `frontend/src/pages/TaskListPage.tsx`

- `useTaskList()` の分解代入に `togglingIds`, `awaitToggle` を追加
- `renderTaskCard` の `onNavigateDetail` を非同期化: `togglingIds.has(id)` なら `awaitToggle(id)` を待ってから `navigate`

## レビュー結果

- Set state は必ず `new Set(prev)` で新しいオブジェクトを作成して再レンダリングを保証する
- `awaitToggle` は ref 参照のみで依存なし → `useCallback` の deps は `[]`
- `TaskCard` の `onNavigateDetail: (id: number) => void` に async 関数を渡しても TypeScript 上は問題ない
- 既存の楽観的更新ロジック（updateIsCompletedInTree・ロールバック）は変更しない
- リスク: なし（既存動作への影響なし）
