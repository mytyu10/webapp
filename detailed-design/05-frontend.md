# フロントエンド設計

## ルーティング

```typescript
// App.tsx
<BrowserRouter>
  <Routes>
    {/* 公開ルート */}
    <Route path="/login"  element={<LoginPage />}  />
    <Route path="/regist" element={<RegistPage />} />

    {/* 認証済みルート（PrivateRoute + SidebarLayout） */}
    <Route element={<PrivateRoute />}>
      <Route element={<SidebarLayout />}>
        <Route path="/"              element={<HomePage />}       />
        <Route path="/tasks"         element={<TaskListPage />}   />
        <Route path="/tasks/new"     element={<TaskFormPage />}   />
        <Route path="/tasks/:id"     element={<TaskDetailPage />} />
        <Route path="/tasks/:id/edit" element={<TaskFormPage />}  />
      </Route>
    </Route>
  </Routes>
</BrowserRouter>
```

| パス | コンポーネント | 認証 | 状態 |
|------|-------------|------|------|
| `/` | `HomePage` → `/tasks` リダイレクト | 要認証 | 実装済み |
| `/login` | `LoginPage` | 不要 | 実装済み |
| `/regist` | `RegistPage` | 不要 | 実装済み |
| `/tasks` | `TaskListPage` | 要認証 | 実装済み |
| `/tasks/new` | `TaskFormPage`（作成モード） | 要認証 | 実装済み |
| `/tasks/:id` | `TaskDetailPage` | 要認証 | 実装済み |
| `/tasks/:id/edit` | `TaskFormPage`（編集モード） | 要認証 | 実装済み |

---

## 認証フロー（PrivateRoute）

```
PrivateRoute
├── localStorage.getItem('token') を取得
├── token が null → /login へリダイレクト
├── JWTをBase64デコードしてペイロードのexpを取得
├── exp が未存在または現在時刻 <= exp → /login へリダイレクト
└── 有効 → <Outlet /> をレンダリング（SidebarLayout → ページコンポーネント）
```

---

## レイアウト

### SidebarLayout

ログイン後の全画面に共通するレイアウトコンポーネント。

```
SidebarLayout
├── Sidebar（左固定、w-60）
└── main（flex-1、p-8）
    └── <Outlet />（各ページコンポーネント）
```

### Sidebar

| 要素 | 内容 |
|------|------|
| ヘッダー | "WebApp" テキスト |
| ナビゲーション | タスク管理（/tasks） |
| フッター | ログアウトボタン（localStorage削除 → /login） |

---

## ページコンポーネント

### LoginPage

**責務**: UIの描画のみ。ロジックは `useLoginForm` に委譲。

```
LoginPage
└── FormCard（タイトル: "ログイン"）
    ├── FormField（ユーザー名）
    ├── FormField（パスワード）
    ├── FormErrorBanner（APIエラー表示）
    ├── SubmitButton（"ログイン"）
    └── <Link to="/regist">アカウント登録はこちら</Link>
```

### RegistPage

**責務**: UIの描画のみ。ロジックは `useRegistForm` に委譲。

```
RegistPage
└── FormCard（タイトル: "アカウント登録"）
    ├── FormField（ユーザー名）
    ├── FormField（パスワード）
    ├── FormErrorBanner（APIエラー表示）
    ├── SubmitButton（"登録"）
    └── <Link to="/login">ログインはこちら</Link>
```

### TaskListPage

**責務**: タスク一覧の表示・削除確認・ナビゲーション。ロジックは `useTaskList` に委譲。

タスクは親子の階層構造で表示し、未完了セクション・完了済みセクションに分けて表示する。

```
TaskListPage
├── ConfirmModal（削除確認モーダル）
├── ヘッダー（タイトル + "タスクを作成"ボタン）
├── カテゴリフィルターボタン群（"すべて" + 各カテゴリ）
├── FormErrorBanner（API/削除/完了切り替えエラー）
├── 読み込み中テキスト
├── タスクなしメッセージ
├── 未完了タスクセクション（incompleteTrees）
│   └── 階層ツリー表示（DEPTH_INDENT_CLASSES による depth ごとのインデント）
│       └── 各タスクカード
│           ├── タイトル（完了時: 打ち消し線 + 薄表示）・優先度バッジ・カテゴリバッジ
│           ├── 説明文・期限・担当者
│           └── 完了切り替えボタン・詳細ボタン・編集ボタン（作成者のみ）・削除ボタン（作成者のみ）
└── 完了済みタスクセクション（completedTrees）
    ├── 折りたたみトグル（"完了済みタスク (N件)"）
    └── 折りたたみ展開時: 階層ツリー表示（同上）
```

**インデントクラス定数 `DEPTH_INDENT_CLASSES`**

```typescript
const DEPTH_INDENT_CLASSES: Record<number, string> = {
  0: 'pl-0',
  1: 'pl-5',
  2: 'pl-10',
};
```

depth 0 がルートタスク、depth 1 以降が子・孫タスクに対応する。

**タスクカード状態別スタイル定数**

| 定数 | Tailwindクラス | 適用条件 |
|------|--------------|---------|
| `CARD_COMPLETED_CLASSES` | `border-green-800 opacity-75` | `node.is_completed === true` |
| `CARD_PARTIAL_CLASSES` | `border-yellow-700 bg-yellow-950` | `node.hasPartiallyCompletedChildren === true`（自身は未完了） |
| `CARD_DEFAULT_CLASSES` | `border-slate-600` | 上記以外 |

`CARD_COMPLETED_CLASSES` → `CARD_PARTIAL_CLASSES` → `CARD_DEFAULT_CLASSES` の優先順で適用する。

**「一部完了」バッジ**

`node.hasPartiallyCompletedChildren` が `true` の場合、タイトル行に「一部完了」バッジを表示する。

```typescript
const PARTIAL_COMPLETE_BADGE_CLASSES =
  'shrink-0 px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-800 text-yellow-200';
```

### TaskFormPage

**責務**: タスク作成・編集フォームの表示。ロジックは `useTaskForm` に委譲。
URLパラメータに `id` がある場合は編集モード。

```
TaskFormPage
└── FormCard（"タスクを作成" or "タスクを編集"）
    ├── FormErrorBanner
    ├── FormField（タイトル）
    ├── textarea（説明文）
    ├── input[datetime-local]（期限）
    ├── FormField（担当者、カンマ区切り）
    └── キャンセル / SubmitButton（"作成する" or "更新する"）
```

### TaskDetailPage

**責務**: タスク詳細の表示・完了状態の切り替え。ロジックは `useTaskDetail` に委譲。

```
TaskDetailPage
├── ヘッダー（"← 一覧に戻る"ボタン + "タスク詳細"タイトル）
├── FormErrorBanner
├── 読み込み中テキスト
└── 詳細カード（完了時: 緑枠 `border-green-500`）
    ├── 完了済みバナー（完了時のみ: 緑背景 "このタスクは完了済みです"）
    ├── "← 親タスクへ" リンク（parent_id がある場合のみ表示）
    ├── タイトル（完了時: 打ち消し線）
    ├── 説明文
    ├── 優先度バッジ・カテゴリバッジ
    ├── 期限
    ├── 担当者（タグ表示）
    ├── 作成者
    ├── 作成日時
    ├── 子タスク一覧（クリッカブルリンク、完了済みは打ち消し線 + 薄表示）
    ├── 完了にする / 未完了に戻すボタン（完了状態に応じて切り替え）
    ├── 編集するボタン（作成者のみ）
    └── 子タスクを作成ボタン
```

---

## カスタムフック

### useLoginForm

| state | 型 | 説明 |
|-------|-----|------|
| `username` | `string` | ユーザー名入力値 |
| `password` | `string` | パスワード入力値 |
| `errors` | `LoginFormErrors` | クライアントバリデーションエラー |
| `apiError` | `string` | APIエラーメッセージ |
| `loading` | `boolean` | 送信中フラグ |

**handleSubmit フロー**

```
1. validateLoginForm(username, password) でクライアントバリデーション
   → エラーあり: errors にセット、処理終了
2. loading = true
3. loginRequest(username, password) を呼び出し
4. 成功: localStorage.setItem('token', token) → navigate('/')
5. 失敗: apiError にエラーメッセージをセット
6. loading = false
```

### useRegistForm

| state | 型 | 説明 |
|-------|-----|------|
| `username` | `string` | ユーザー名入力値 |
| `password` | `string` | パスワード入力値 |
| `errors` | `RegistFormErrors` | クライアントバリデーションエラー |
| `apiError` | `string` | APIエラーメッセージ |
| `loading` | `boolean` | 送信中フラグ |

### useTaskList

| state | 型 | 説明 |
|-------|-----|------|
| `tasks` | `Task[]` | タスク一覧（全件） |
| `incompleteTrees` | `TaskTreeNode[]` | 未完了タスクの階層ツリー（カテゴリフィルター済み） |
| `completedTrees` | `TaskTreeNode[]` | 完了済みタスクの階層ツリー（カテゴリフィルター済み） |
| `categories` | `string[]` | カテゴリ一覧 |
| `selectedCategory` | `string` | 選択中カテゴリ（空文字 = 全件） |
| `loading` | `boolean` | 読み込み中フラグ |
| `error` | `string` | 取得エラーメッセージ |
| `toggleCompleteError` | `string` | 完了切り替えエラーメッセージ（楽観的更新失敗時にセット） |

> `deleteError` はフック外（`TaskListPage` のローカルstate）で管理する。

| 関数 | 説明 |
|------|------|
| `handleDelete(id)` | タスクを削除しローカルstateを更新 |
| `handleToggleComplete(id, is_completed)` | タスクの完了状態を楽観的UI更新で切り替える。ボタン押下直後にローカルステートを更新し、APIコール成功時はサーバーレスポンスで上書き、失敗時はスナップショットにロールバックする |
| `setSelectedCategory(category)` | カテゴリフィルターを更新する |
| `reload()` | 一覧を再読み込みするトリガーをインクリメント |

**TaskTreeNode 型**

```typescript
interface TaskTreeNode extends Task {
  /** 階層の深さ（ルートタスク: 0, 子タスク: 1, ...） */
  depth: number;
  /** 自身が未完了かつ直接の子タスク（孫以下は対象外）に1件以上完了があるかどうか */
  hasPartiallyCompletedChildren: boolean;
}
```

**buildTaskTrees 関数**

ルートタスク（`parent_id: null`）を起点に、`children` リレーションを再帰的に展開して `TaskTreeNode[]` を構築する。
各ノードの `hasPartiallyCompletedChildren` は、自身が未完了かつ直接の子（孫以下は対象外）に1件以上完了タスクがある場合に `true` となる。

**ソートロジック（getEffectiveDueDate）**

`incompleteTrees` / `completedTrees` の並び順は `getEffectiveDueDate` 関数で計算した有効期限の昇順。
子タスクを持つ親タスクは、子タスクの中で最も早い `due_date` を有効期限として扱う。

**フィルタリングロジック**

`selectedCategory` が指定されている場合、自タスクまたはいずれかの子孫タスクがそのカテゴリを持つツリーのみを表示する。

### useTaskDetail

タスク詳細ページのデータ取得・完了状態切り替えを管理するフック。

| state | 型 | 説明 |
|-------|-----|------|
| `task` | `Task \| null` | 取得したタスクデータ |
| `loading` | `boolean` | データ取得中フラグ |
| `error` | `string` | エラーメッセージ |
| `toggleLoading` | `boolean` | 完了切り替え中フラグ |

| 関数 | 説明 |
|------|------|
| `handleToggleComplete()` | 現在の `is_completed` を反転して `toggleTaskCompletion` を呼び出す。成功後に task state を更新 |

**初期化フロー**

```
1. useEffect: fetchTask(id) でタスク取得 → task に格納
2. エラー時: error にメッセージをセット
```

### useTaskForm

`id`（編集対象タスクID）と `parentId`（子タスク作成時の親タスクID）で3モードを切り替える。

| state | 型 | 説明 |
|-------|-----|------|
| `values` | `TaskFormValues` | フォーム入力値（title, description, due_date, assigneesText, priority, category） |
| `errors` | `TaskFormErrors` | バリデーションエラー |
| `apiError` | `string` | APIエラーメッセージ |
| `loading` | `boolean` | 送信/読み込み中フラグ |
| `isEditMode` | `boolean` | 編集モードフラグ（`id` が指定された場合 `true`） |

**動作モード**

| モード | 条件 | 動作 |
|--------|------|------|
| 新規作成 | `id` も `parentId` も未指定 | 空フォームで作成し `/tasks` へ遷移 |
| 子タスク作成 | `parentId` が指定された場合 | 親タスクの `category` を初期値に設定。作成後 `/tasks/:parentId` へ遷移 |
| 編集 | `id` が指定された場合 | 既存タスクデータを取得してフォームに反映。更新後 `/tasks/:id` へ遷移 |

**handleSubmit フロー**

```
1. validateTaskForm(values) でバリデーション
2. 編集モード: updateTask(id, input) を呼び出し → navigate('/tasks/:id')
3. 作成モード: getCurrentUsername() でユーザー名取得 → createTask(input) を呼び出し
   - parentId あり: navigate('/tasks/:parentId')
   - parentId なし: navigate('/tasks')
4. 失敗: apiError にセット
```

**子タスク作成時のカテゴリ引き継ぎ**

`parentId` が指定された場合、マウント時に `fetchTask(parentId)` で親タスクを取得し、`parent.category` を `values.category` の初期値にセットする。

---

## バリデーション

### loginValidation / registValidation（同一ロジック）

| フィールド | 条件 | エラーメッセージ |
|-----------|------|----------------|
| username | 空文字 | 「ユーザー名を入力してください。」 |
| username | 11文字以上 | 「ユーザー名は10文字以内で入力してください。」 |
| password | 空文字 | 「パスワードを入力してください。」 |
| password | 8文字未満 または 21文字以上 | 「パスワードは8〜20文字で入力してください。」 |

### taskValidation

| フィールド | 条件 | エラーメッセージ |
|-----------|------|----------------|
| title | 空文字 | 「タイトルを入力してください」 |
| title | 201文字以上 | 「タイトルは200文字以内で入力してください」 |
| description | 空文字 | 「説明文を入力してください」 |
| description | 1001文字以上 | 「説明文は1000文字以内で入力してください」 |
| due_date | 空文字 | 「期限を入力してください」 |
| due_date | 不正な日時形式 | 「正しい日時形式で入力してください」 |
| assignees | 51人以上 | 「担当者は50人以内で設定してください」 |

---

## API通信

### accountApi.ts

**APIベースURL構築**

```typescript
const BASE_URL = `${process.env.REACT_APP_API_SCHEME}://${process.env.REACT_APP_API_HOST}:${process.env.REACT_APP_API_PORT}`;
```

| 関数 | メソッド | エンドポイント | 戻り値 | エラー |
|------|---------|-------------|-------|-------|
| `loginRequest(username, password)` | POST | `/accounts/login` | `Promise<string>`（JWTトークン） | Error をthrow |
| `registRequest(username, password)` | POST | `/accounts/regist` | `Promise<void>` | Error をthrow |

### taskApi.ts

Authorizationヘッダー（`Bearer <token>`）を全リクエストに付与。

| 関数 | メソッド | エンドポイント | 戻り値 | 説明 |
|------|---------|-------------|-------|------|
| `fetchTasks()` | GET | `/tasks` | `Promise<Task[]>` | ルートタスク一覧取得（期限昇順）。`children` リレーション込み |
| `fetchTask(id)` | GET | `/tasks/:id` | `Promise<Task>` | 指定IDのタスク取得 |
| `fetchCategories()` | GET | `/tasks/categories` | `Promise<string[]>` | カテゴリ一覧取得 |
| `createTask(input)` | POST | `/tasks` | `Promise<Task>` | タスク作成 |
| `updateTask(id, input)` | PATCH | `/tasks/:id` | `Promise<Task>` | タスク更新 |
| `toggleTaskCompletion(id, is_completed)` | PATCH | `/tasks/:id` | `Promise<Task>` | `updateTask` のラッパー。完了状態のみ切り替え |
| `deleteTask(id)` | DELETE | `/tasks/:id` | `Promise<void>` | タスク削除 |
| `getCurrentUsername()` | - | - | `string \| null` | localStorage の JWT をデコードしてusernameを取得 |

**Task インターフェース（フロントエンド型定義）**

```typescript
interface Task {
  id: number;
  title: string;
  description: string;
  due_date: string;
  priority: Priority;        // HIGH / MEDIUM / LOW
  category: string | null;
  parent_id: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_completed: boolean;
  assignees: string[];
  children: Task[];
}
```

**定数・ユーティリティ**

| 定数 | 型 | 説明 |
|------|-----|------|
| `PRIORITY_VALUES` | `readonly ['HIGH', 'MEDIUM', 'LOW']` | 優先度の有効値 |
| `PRIORITY_LABELS` | `Record<Priority, string>` | 優先度の日本語表示ラベル（高/中/低） |
| `PRIORITY_BADGE_CLASSES` | `Record<Priority, string>` | 優先度バッジのTailwindクラス |

---

## 共通コンポーネント

### FormCard

フォームページ全体の外枠。ダーク系フルスクリーン中央配置。

| props | 型 | 必須 | 説明 |
|-------|-----|------|------|
| `title` | `string` | ✅ | カードタイトル |
| `onSubmit` | `FormEventHandler` | ✅ | フォーム送信ハンドラー |
| `children` | `ReactNode` | ✅ | カード内コンテンツ |

スタイル: `bg-slate-900`（背景）、`bg-slate-800`（カード）

### FormField

ラベル＋入力欄＋エラーメッセージのセット。

| props | 型 | 必須 | デフォルト | 説明 |
|-------|-----|------|---------|------|
| `id` | `string` | ✅ | - | input の id |
| `label` | `string` | ✅ | - | ラベルテキスト |
| `type` | `'text' \| 'password'` | ❌ | `'text'` | input の type |
| `value` | `string` | ✅ | - | 入力値 |
| `onChange` | `(v: string) => void` | ✅ | - | 変更ハンドラー |
| `error` | `string` | ❌ | - | エラーメッセージ |
| `disabled` | `boolean` | ❌ | `false` | 非活性フラグ |
| `maxLength` | `number` | ❌ | - | 最大文字数 |
| `autoComplete` | `string` | ❌ | - | オートコンプリート |

エラー時: `border-red-500` + 赤テキスト表示

### FormErrorBanner

APIエラーメッセージを赤背景バナーで表示。

| props | 型 | 必須 | 説明 |
|-------|-----|------|------|
| `message` | `string` | ✅ | エラーメッセージ（空文字で非表示） |

### SubmitButton

送信ボタン。ローディング中はラベル変更＋非活性。

| props | 型 | 必須 | デフォルト | 説明 |
|-------|-----|------|---------|------|
| `label` | `string` | ✅ | - | ボタンラベル |
| `loadingLabel` | `string` | ❌ | `'処理中...'` | ローディング中ラベル |
| `loading` | `boolean` | ❌ | `false` | ローディングフラグ |

### PrivateRoute

JWT有効期限検証コンポーネント。

- `localStorage` の `token` を取得
- JWTのペイロード `exp`（UNIX秒）を検証
- 無効・期限切れ → `<Navigate to="/login" replace />`
- 有効 → `<Outlet />`

### Sidebar

| 要素 | 説明 |
|------|------|
| ブランド名 | "WebApp" |
| NavLink | タスク管理（アクティブ時 `bg-sky-700`） |
| ログアウトボタン | `localStorage.removeItem('token')` → `/login` |

### SidebarLayout

```
div.flex.min-h-screen
├── Sidebar
└── main.flex-1
    └── <Outlet />
```
