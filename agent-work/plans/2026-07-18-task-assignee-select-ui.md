# タスク担当者セレクトUI変更 実装計画

- 日付: 2026-07-18
- ステータス: 承認済み

## 依頼内容
タスク管理の担当者設定を、すでにいるユーザーの中から選択できる形式に変更する。複数登録できる仕様は維持する。

## 実装計画

### 機能概要
タスク作成フォーム（TaskFormPage.tsx）とタスクインライン編集フォーム（TaskEditForm.tsx）の担当者入力UIを、テキスト入力からセレクト選択方式に変更する。

### DBスキーマ変更: なし

### 影響範囲
- フロントエンドのみ（バックエンド変更不要）
- frontend/src/hooks/useTaskForm.ts
- frontend/src/pages/TaskFormPage.tsx
- frontend/src/components/TaskEditForm.tsx
- frontend/src/validation/taskValidation.ts

### 実装ステップ

#### Step 1: taskValidation.ts の修正
- TaskFormValues の assigneesText: string を assignees: string[] に変更
- validateTaskForm の担当者バリデーションを assignees 配列直接チェックに変更
- parseAssignees 関数は削除（不要になる）

#### Step 2: useTaskForm.ts の修正
- values.assigneesText を values.assignees: string[] に変更（初期値 []）
- setAssigneesText の代わりに addAssignee(username: string) と removeAssignee(index: number) を追加
- fetchAllUsers を呼び出してユーザー一覧を管理する state と usersLoading を追加
- getCurrentUsername() で自分自身もユーザーリストに追加
- 編集モード時の assignees 初期値は task.assignees をそのまま使用
- handleSubmit の parseAssignees(values.assigneesText) を values.assignees に変更

#### Step 3: TaskFormPage.tsx の担当者UIを変更
- addAssignee, removeAssignee, availableUsers を受け取る
- select: まだ追加されていないユーザーのみ表示。選択したら addAssignee してリセット
- 選択済み担当者リスト: バッジ形式で表示し、×ボタンで removeAssignee

#### Step 4: TaskEditForm.tsx の担当者UIを変更
- editValues.assigneesText を editValues.assignees: string[] に変更
- コンポーネントマウント時に fetchAllUsers + getCurrentUsername で選択肢を構築
- 同様のセレクトUIを提供

#### Step 5: 自分自身を選択肢に追加
- GET /chat/users は自分を除くため、getCurrentUsername() でログインユーザー名を取得
- ユーザーリストの先頭に追加して選択可能にする

## レビュー結果

### チェックリスト
- [x] TaskFormValues の型変更は全ファイルに波及するが計画に含まれている
- [x] parseAssignees は変更後不要になる（削除計画あり）
- [x] fetchAllUsers のチャットAPI依存は許容範囲
- [x] getCurrentUsername() は同期取得可能
- [x] バリデーション維持（1人以上必須）

### リスク・注意点
- TaskFormValues の型変更は useTaskForm.ts、TaskFormPage.tsx、TaskEditForm.tsx、taskValidation.ts に波及するため漏れなく修正すること
- TaskEditForm.tsx は独自 state を持つため、useTaskForm フックとは別に fetchAllUsers を呼び出す必要がある（マウント時1回のみ）
- ユーザー一覧取得中のローディング状態を適切に管理すること
