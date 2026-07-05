# タスク詳細サイドパネル表示 実装計画

- 日付: 2026-05-03
- ステータス: 承認済み

## 依頼内容

タスク一覧画面（/tasks）で「詳細」ボタンを押したとき、別ページへ遷移するのをやめ、
同じ画面の右側にタスク詳細パネルを表示するレイアウトに変更する。

## 実装計画

### DBスキーマ変更: なし

### 新規作成ファイル

1. `frontend/src/components/TaskDetailPanel.tsx`
   - TaskDetailPage の内容を流用した詳細表示コンポーネント
   - Props: taskId: number | null, onClose: () => void, onSelectTask: (id: number) => void
   - 内部で useTaskDetail(String(taskId)) を呼び出す
   - 子タスクリンクは onSelectTask(child.id) を呼ぶボタンに変更
   - 親タスクリンクも onSelectTask(task.parent_id) を呼ぶボタンに変更
   - 閉じるボタン（×）を右上に設置

### 変更ファイル

2. `frontend/src/pages/TaskListPage.tsx`
   - selectedTaskId: number | null ステートを追加（初期値: null）
   - onNavigateDetail コールバックを navigate 呼び出しから setSelectedTaskId セットに変更（awaitToggle待機は維持）
   - パネル表示時に flex で左右分割（左: タスク一覧 flex-1、右: TaskDetailPanel w-96）

3. `frontend/src/App.tsx`
   - /tasks/:id ルートは残す（直リンク対応のため）

## レビュー結果

- チェックリスト: 全項目パス
- リスク: なし
