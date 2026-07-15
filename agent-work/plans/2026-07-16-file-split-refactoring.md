# ファイル分割リファクタリング 実装計画

- 日付: 2026-07-16
- ステータス: 承認済み

## 依頼内容

全体的にファイルが肥大化している部分がありそう。責務分割などを今一度確認してファイル分割などを実施して。

## 調査結果

| ファイル | 行数 | 問題 |
|---|---|---|
| frontend/src/components/EventModal.tsx | 833 | 3種類のフォームが1ファイルに混在 |
| frontend/src/components/TaskDetailPanel.tsx | 611 | 詳細表示・編集フォーム・権限管理が混在 |
| frontend/src/pages/LinkListPage.tsx | 418 | LinkTreeNodeコンポーネントが内部定義 |
| frontend/src/api/taskApi.ts | 345 | 優先度定数・認証・タスクCRUD・通知APIが混在 |
| frontend/src/hooks/useCalendar.ts | 329 | イベントCRUD・変換ロジックが混在（許容範囲） |
| frontend/src/hooks/useTaskList.ts | 308 | ツリーヘルパー関数とフック本体が混在（許容範囲） |

## 実装計画

### DBスキーマ変更: なし

### 分割方針
- 動作を変えない（ロジック変更なし）
- エクスポートを維持するか、変更時は全 import 先を更新する
- テストが通ることを最終確認する

### Step 1: ColorPicker コンポーネントを独立ファイルへ抽出

**新規作成:**
- `frontend/src/components/ColorPicker.tsx`
  - `EVENT_COLORS` 定数と `ColorPicker` コンポーネントを `EventModal.tsx` から移動
  - `EVENT_COLORS` と `ColorPicker` を named export する

**変更:**
- `frontend/src/components/EventModal.tsx`
  - `ColorPicker` と `EVENT_COLORS` の定義を削除、`ColorPicker.tsx` からインポートに変更
  - `EVENT_COLORS` は引き続き `EventModal.tsx` からも re-export して既存の import を壊さない

### Step 2: EventModal 内フォームを3つのコンポーネントに分割

**新規作成:**
- `frontend/src/components/SingleEventForm.tsx`
  - 通常フォームのJSX・状態（formValues, errors）・送信ロジック（handleSingleSubmit）
  - props: `initialValues`, `disabled`, `isOwner`, `showDelete`, `onSubmit`, `onDelete`, `onClose`

- `frontend/src/components/MultipleEventForm.tsx`
  - 複数日付フォームのJSX・状態・送信ロジック
  - props: `initialValues`, `disabled`, `onSubmit`, `onClose`

- `frontend/src/components/RepeatEventForm.tsx`
  - 繰り返しフォームのJSX・状態・送信ロジック
  - props: `initialValues`, `disabled`, `onSubmit`, `onClose`

**変更:**
- `frontend/src/components/EventModal.tsx`
  - 3フォームのJSXを上記コンポーネントに委譲
  - モーダル枠・タブ切り替え・スコープ選択・削除確認モーダルのみを担当
  - 行数目標: 150行程度

### Step 3: TaskDetailPanel の編集フォームを分離

**新規作成:**
- `frontend/src/components/TaskEditForm.tsx`
  - インライン編集フォームのJSX・状態（editValues, editErrors, saveError, isSaving）
  - 送信ロジック（handleSave）
  - props: `task`, `onSave（id, input）`, `onCancel`

**変更:**
- `frontend/src/components/TaskDetailPanel.tsx`
  - isEditing === true のとき `TaskEditForm` を表示する
  - 行数目標: 350行程度

### Step 4: LinkTreeNode を独立ファイルへ抽出

**新規作成:**
- `frontend/src/components/LinkTreeNode.tsx`
  - `LinkTreeNode` コンポーネントと関連定数（アイコン・インデントクラス）を `LinkListPage.tsx` から移動
  - `collectAllFolders` は `LinkListPage.tsx` の関心事なのでそのまま残す

**変更:**
- `frontend/src/pages/LinkListPage.tsx`
  - `LinkTreeNode` の定義を削除、インポートに変更
  - 行数目標: 250行程度

## レビュー結果

### 承認

### リスク・注意点
- `ColorPicker` の `EVENT_COLORS` 定数と `useCalendar.ts` の `EVENT_COLOR_MAP` は別物（用途が異なる）ので混同しないこと
- フォームコンポーネント分割時にフォーム状態は子コンポーネント内に持たせる（props drilling 最小化）
- `TaskEditForm` は `onSave(id, input)` / `onCancel()` コールバックで親と通信する設計にする
- 既存テストが変更したファイルをテストしている場合、import パスの更新が必要な場合がある
