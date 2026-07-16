# フロントエンド設計

## ルーティング

```typescript
// App.tsx
<BrowserRouter>
  <Routes>
    {/* 公開ルート */}
    <Route path="/login"         element={<LoginPage />}        />
    <Route path="/regist"        element={<RegistPage />}       />

    {/* 認証済みルート（PrivateRoute + SidebarLayout） */}
    <Route element={<PrivateRoute />}>
      <Route element={<SidebarLayout />}>
        <Route path="/"          element={<HomePage />}     />
        <Route path="/tasks"     element={<TaskListPage />} />
        <Route path="/tasks/new" element={<TaskFormPage />} />
        <Route path="/calendar"  element={<CalendarPage />} />
      </Route>
    </Route>
  </Routes>
</BrowserRouter>
```

| パス | コンポーネント | 認証 | 説明 |
|------|-------------|------|------|
| `/` | `HomePage` → `/tasks` リダイレクト | 要認証 | 実装済み |
| `/login` | `LoginPage` | 不要 | 実装済み |
| `/regist` | `RegistPage` | 不要 | 実装済み |
| `/tasks` | `TaskListPage` | 要認証 | 実装済み |
| `/tasks/new` | `TaskFormPage`（作成・子タスク作成モード） | 要認証 | 実装済み |
| `/calendar` | `CalendarPage` | 要認証 | 実装済み |

> **廃止済みルート**: `/tasks/:id`（タスク詳細）、`/tasks/:id/edit`（タスク編集）はサイドパネル統合により削除された。

---

## 認証フロー（PrivateRoute）

```
PrivateRoute
├── localStorage.getItem('token') を取得
├── token が null → /login へリダイレクト
├── JWTをBase64デコードしてペイロードのexpを取得
├── exp が未存在または現在時刻 >= exp → /login へリダイレクト
└── 有効 → <Outlet /> をレンダリング（SidebarLayout → ページコンポーネント）
```

---

## レイアウト

### SidebarLayout

ログイン後の全画面に共通するレイアウトコンポーネント。レスポンシブ対応済み。

```
SidebarLayout（スマホ: flex-col、PC[sm:]: flex-row）
├── Sidebar（スマホ: 上部ナビバー / PC: 左サイドバー）
└── main（flex-1、スマホ: p-4、PC[sm:]: p-8）
    └── <Outlet />（各ページコンポーネント）
```

**レスポンシブブレークポイント:**

| ブレークポイント | レイアウト |
|----------------|---------|
| `sm:` 未満（スマホ・640px未満） | `flex-col`（縦積み）：Sidebarが上部ナビバーとして表示 |
| `sm:` 以上（PC） | `flex-row`（横並び）：Sidebarが左サイドバーとして表示 |

### Sidebar

レスポンシブ対応済み。

| 要素 | 説明 |
|------|------|
| ブランド名 | "WebApp" |
| NavLink | タスク管理（/tasks、アクティブ時 `bg-sky-700`） |
| NavLink | カレンダー（/calendar、アクティブ時 `bg-sky-700`） |
| ログアウトボタン | `localStorage.removeItem('token')` → `/login` |

---

## ページコンポーネント

### LoginPage

ロジックは `useLoginForm` に委譲。

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

ロジックは `useRegistForm` に委譲。

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

タスク一覧・階層表示・カテゴリフィルター・削除確認・詳細サイドパネル。ロジックは `useTaskList` に委譲。

```
TaskListPage
├── [パネル表示時] 外側: flex コンテナ（ref={containerRef}）
│   ├── 一覧エリア（flex-1 min-w-0 / パネル非表示時は w-full）
│   │   ├── [スマホかつパネル表示中] hidden（一覧を非表示）
│   │   ├── ConfirmModal（削除確認モーダル）
│   │   ├── ヘッダー（"タスク管理" + ActionButton "タスクを作成"）
│   │   ├── CategoryFilterBar（"すべて" + カテゴリピルボタン）
│   │   ├── FormErrorBanner（API/削除/完了切り替えエラー）
│   │   ├── 未完了タスクセクション（incompleteTrees・isNodeHiddenフィルター・インデント）
│   │   └── 完了済みタスクセクション（completedTrees・SectionToggleButton・折りたたみ可）
│   ├── [パネル表示時・PCのみ] ドラッグリサイザー（w-3、cursor-col-resize、240〜700px）
│   └── [パネル表示時] パネルコンテナ（スマホ: w-full / PC: style={{ width: panelWidth }}）
│       └── TaskDetailPanel（task・isToggling・isOwner・isMobile・各コールバック）
```

**スマホ対応:**
- `useIsMobile` フックで640px未満を判定
- パネル表示中はスマホで一覧エリアを `hidden` にしてパネルを全画面表示
- ドラッグリサイザーはスマホでは非表示

**通知削除フロー:**
```
handleDeleteNotification(taskId, notificationId)
  → deleteNotification(taskId, notificationId) [API]
  → reload() [一覧再取得]
```

**ローカルステート**

| ステート | 型 | 初期値 | 説明 |
|---------|-----|--------|------|
| `deleteError` | `string` | `''` | 削除エラーメッセージ |
| `deleteTargetId` | `number \| null` | `null` | 削除確認対象タスクID |
| `isCompletedSectionOpen` | `boolean` | `true` | 完了済みセクション展開フラグ |
| `collapsedParentIds` | `Set<number>` | `new Set()` | 折りたたみ中の親タスクIDセット |
| `selectedTaskId` | `number \| null` | `null` | 詳細パネル表示中タスクID（null: 非表示） |
| `panelWidth` | `number` | `320`（px） | サイドパネル幅（ドラッグで変更・画面更新でリセット） |

### TaskFormPage

タスク作成・編集フォーム。ロジックは `useTaskForm` に委譲。

```
TaskFormPage
└── FormCard（"タスクを作成" / "タスクを編集" / "子タスクを作成"）
    ├── FormErrorBanner
    ├── FormField（タイトル）
    ├── TextAreaField（説明文）
    ├── DateTimeField（期限）
    ├── SelectField（優先度: 高/中/低）
    ├── FormField（カテゴリ・任意）
    ├── FormField（担当者・カンマ区切り・1人以上必須）
    ├── 通知日時セクション（任意・複数設定可）
    │   ├── DateTimeField（通知日時入力）+ "追加" ボタン
    │   └── 追加済み通知リスト（日時表示 + "削除" ボタン）
    ├── CancelButton
    └── SubmitButton（"作成する" / "更新する"）
```

**動作モード:**

| モード | 条件 | フォームタイトル | 送信後遷移 |
|--------|------|--------------|---------|
| 新規作成 | `id` も `parentId` も未指定 | "タスクを作成" | `/tasks` |
| 子タスク作成 | `parentId` が URLクエリ `parent_id` で指定 | "子タスクを作成" | `/tasks` |
| 編集 | URLパラメータ `id` が指定 | "タスクを編集" | `/tasks` |

### CalendarPage

カレンダー表示・予定CRUD。ロジックは `useCalendar` に委譲。

```
CalendarPage
├── ヘッダー（"カレンダー" + CalendarViewToggle）
├── FormErrorBanner
├── 読み込み中テキスト
└── .calendar-wrapper
    └── FullCalendar（dayGrid/timeGrid/interaction）
        ├── 月ビュー（dayGridMonth）: 予定のみ
        ├── 週ビュー（timeGridWeek）: 予定のみ（スマホ時は日ビューへ自動フォールバック）
        └── 日ビュー（timeGridDay）: 予定 + タスク（グレーブロック）
```

**スマホ対応:**
- `useIsMobile` で640px未満を判定
- 週ビュー表示中にスマホになった場合 `useEffect` で日ビューへ自動フォールバック
- `CalendarViewToggle` でスマホ時は週ボタンを非表示

---

## カスタムフック

### useLoginForm / useRegistForm

ログイン・登録フォームの状態と送信処理を管理する。

| state | 型 | 説明 |
|-------|-----|------|
| `username` | `string` | ユーザー名入力値 |
| `password` | `string` | パスワード入力値 |
| `errors` | `LoginFormErrors` / `RegistFormErrors` | クライアントバリデーションエラー |
| `apiError` | `string` | APIエラーメッセージ |
| `loading` | `boolean` | 送信中フラグ |

### useIsMobile

```typescript
function useIsMobile(): boolean
```

`window.innerWidth < 640` を初期値として返し、`window.resize` イベントでリアクティブに追従する。
スマホ判定のブレークポイントは 640px（Tailwind の `sm:` と同一）。

### useTaskList

タスク一覧・削除・完了切り替え・階層ツリー構築・インライン更新を管理するフック。

| state / ref | 型 | 説明 |
|-------------|-----|------|
| `tasks` | `Task[]` | タスク一覧（全件）。`TaskDetailPanel` と共有 |
| `incompleteTrees` | `TaskTreeNode[]` | 未完了タスクの階層ツリー（カテゴリフィルター済み） |
| `completedTrees` | `TaskTreeNode[]` | 完了済みタスクの階層ツリー（カテゴリフィルター済み） |
| `categories` | `string[]` | カテゴリ一覧 |
| `selectedCategory` | `string` | 選択中カテゴリ（空文字 = 全件） |
| `togglingIds` | `Set<number>` | 現在PATCH処理中のタスクIDセット |
| `togglePromisesRef` | `MutableRefObject<Map<number, Promise<void>>>` | PATCH中の各タスクIDに対応するPromise（外部からawaitするために使用） |

| 関数 | 説明 |
|------|------|
| `handleDelete(id)` | タスクを削除してローカルstateを更新 |
| `handleToggleComplete(id, is_completed)` | 楽観的UI更新で完了状態を切り替え。失敗時スナップショットにロールバック |
| `awaitToggle(id)` | 指定IDのPATCH進行中なら完了まで待機（refベースで最新状態を参照） |
| `handleUpdate(id, input)` | `updateTask` APIを呼び出し、`replaceTaskInTree` でローカルstateを更新 |
| `setSelectedCategory(category)` | カテゴリフィルターを更新 |
| `reload()` | `reloadTrigger` をインクリメントして一覧を再取得 |

**TaskTreeNode 型**

```typescript
interface TaskTreeNode extends Task {
  depth: number;                         // 階層深さ（ルート: 0）
  hasPartiallyCompletedChildren: boolean; // 自身未完了かつ直接子に1件以上完了あり
}
```

### useTaskForm

タスクフォーム（作成/編集/子タスク作成）と通知日時管理を統合するフック。

| state | 型 | 説明 |
|-------|-----|------|
| `values` | `TaskFormValues` | フォーム入力値 |
| `errors` | `TaskFormErrors` | バリデーションエラー |
| `apiError` | `string` | APIエラーメッセージ |
| `loading` | `boolean` | 送信/読み込み中フラグ |
| `isEditMode` | `boolean` | 編集モードフラグ |
| `notifications` | `string[]` | 追加済み通知日時（datetime-local形式） |

| 関数 | 説明 |
|------|------|
| `addNotificationDatetime(datetime)` | 通知日時を追加する |
| `removeNotificationDatetime(index)` | 指定インデックスの通知日時を削除する |
| `handleSubmit(e)` | バリデーション → タスク作成/更新 → 通知日時を `addNotification` API へ順次送信 |

**編集モード時の既存通知読み込み:**

`fetchTask(id)` で取得したタスクの `notifications` を datetime-local 形式に変換して `notifications` stateに設定する。

### useCalendar

カレンダー予定・タスク表示・ビュー切り替えを管理するフック。

| state | 型 | 説明 |
|-------|-----|------|
| `events` | `CalendarEvent[]` | 予定一覧 |
| `tasks` | `Task[]` | タスク一覧（日表示時にカレンダーに表示） |
| `currentView` | `CalendarView` | 現在のビュー（初期値: `'dayGridMonth'`） |
| `loading` | `boolean` | 読み込み中フラグ |
| `error` | `string` | エラーメッセージ |

**calendarEvents の構築（useMemo）:**

```
- CalendarEvent → EventInput: id "event-{id}", 背景色 #0369a1（sky系）
- 日表示時のみタスクを追加
  - Task → EventInput: id "task-{id}", 背景色 #334155（グレー）
  - start = due_date - 1時間、end = due_date（期限がイベント終了時刻）
  - extendedProps: type:'task', description, priority, category, is_completed, created_by
```

---

## バリデーション

### taskValidation

| フィールド | 条件 | エラーメッセージ |
|-----------|------|----------------|
| title | 空文字 | 「タイトルを入力してください」 |
| title | 201文字以上 | 「タイトルは200文字以内で入力してください」 |
| description | 空文字 | 「説明文を入力してください」 |
| description | 1001文字以上 | 「説明文は1000文字以内で入力してください」 |
| due_date | 空文字 | 「期限を入力してください」 |
| due_date | 不正な日時形式 | 「正しい日時形式で入力してください」 |
| assignees | 0人 | 「担当者を1人以上入力してください」 |
| assignees | 51人以上 | 「担当者は50人以内で設定してください」 |

### eventValidation

| フィールド | 条件 | エラーメッセージ |
|-----------|------|----------------|
| title | 空文字 | 「タイトルを入力してください」 |
| title | 201文字以上 | 「タイトルは200文字以内で入力してください」 |
| start_at | 空文字 | 「開始日時を入力してください」 |
| end_at | 空文字 | 「終了日時を入力してください」 |
| end_at | start_at 以前の値 | 「終了日時は開始日時より後に設定してください」 |

---

## API通信（taskApi.ts）

Authorizationヘッダー（`Bearer <token>`）を全リクエストに付与。

| 関数 | メソッド | エンドポイント | 説明 |
|------|---------|-------------|------|
| `fetchTasks()` | GET | `/tasks` | ルートタスク一覧取得 |
| `fetchTask(id)` | GET | `/tasks/:id` | 指定IDのタスク取得 |
| `fetchCategories()` | GET | `/tasks/categories` | カテゴリ一覧取得 |
| `createTask(input)` | POST | `/tasks` | タスク作成 |
| `updateTask(id, input)` | PATCH | `/tasks/:id` | タスク更新 |
| `toggleTaskCompletion(id, is_completed)` | PATCH | `/tasks/:id` | `updateTask` のラッパー |
| `deleteTask(id)` | DELETE | `/tasks/:id` | タスク削除 |
| `fetchNotifications(taskId)` | GET | `/tasks/:id/notifications` | 通知一覧取得 |
| `addNotification(taskId, notify_at)` | POST | `/tasks/:id/notifications` | 通知追加 |
| `deleteNotification(taskId, notificationId)` | DELETE | `/tasks/:id/notifications/:notificationId` | 通知削除 |
| `getCurrentUsername()` | - | - | localStorage の JWT をデコードして username を取得 |

**Task インターフェース**

```typescript
interface Task {
  id: number;
  title: string;
  description: string;
  due_date: string;
  priority: Priority;
  category: string | null;
  parent_id: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_completed: boolean;
  closed_by: string | null;
  assignees: string[];
  children: Task[];
  notifications?: TaskNotification[];
}
```

**TaskNotification インターフェース**

```typescript
interface TaskNotification {
  id: number;
  task_id: number;
  notify_at: string;    // ISO8601形式
  is_sent: boolean;
}
```

---

## 共通コンポーネント

### TaskDetailPanel

タスク一覧画面の右側に表示するサイドパネル。独自 API 呼び出しを行わない。

| props | 型 | 必須 | 説明 |
|-------|-----|------|------|
| `task` | `Task \| null` | ✅ | 表示対象タスク |
| `isToggling` | `boolean` | ✅ | PATCH処理中フラグ（全ボタンdisabled） |
| `isOwner` | `boolean` | ✅ | 作成者かどうか（削除ボタン表示制御） |
| `isMobile` | `boolean` | ✅ | スマホ表示かどうか |
| `onClose` | `() => void` | ✅ | パネルを閉じるコールバック |
| `onToggleComplete` | `(id, is_completed) => Promise<void>` | ✅ | 完了状態切り替え |
| `onSelectTask` | `(id: number) => void` | ✅ | 子タスク・親タスクリンクのコールバック |
| `onDeleteClick` | `(id: number) => void` | ✅ | 削除確認モーダルを開くコールバック |
| `onUpdate` | `(id, input) => Promise<Task>` | ✅ | タスク更新コールバック |
| `onDeleteNotification` | `(taskId, notificationId) => Promise<void>` | ✅ | 通知削除コールバック（親に委譲） |

**スマホ対応（`isMobile`）:**
- `isMobile=true` 時: 「← 一覧へ戻る」ボタンを表示（PC向け × ボタンは非表示）
- `isMobile=false` 時: × ボタンを表示（「← 一覧へ戻る」は非表示）

**通知一覧表示:**
- `task.notifications` が存在する場合、「通知設定」セクションとして各通知を表示
- 各通知に `notify_at`（日時）・`is_sent`（"送信済み" バッジ）・"削除" ボタン

### Sidebar

| 要素 | 説明 |
|------|------|
| ブランド名 | "WebApp" |
| NavLink | タスク管理・カレンダー |
| ログアウト | `localStorage.removeItem('token')` → `/login` |

### CalendarViewToggle

月/週/日ビューの切り替えボタングループ。スマホ時は週ボタンを非表示。

| props | 型 | 必須 | 説明 |
|-------|-----|------|------|
| `currentView` | `CalendarView` | ✅ | 現在のビュー |
| `onChange` | `(view: CalendarView) => void` | ✅ | ビュー切り替えコールバック |
| `isMobile` | `boolean` | ❌ | スマホ表示かどうか（デフォルト: `false`） |

### その他共通コンポーネント

| コンポーネント | 説明 |
|--------------|------|
| `FormCard` | フォームページ外枠（`bg-slate-800`） |
| `FormField` | ラベル＋input＋エラー表示 |
| `FormErrorBanner` | APIエラー赤バナー |
| `SubmitButton` | 送信ボタン（ローディング対応） |
| `CancelButton` | キャンセルボタン |
| `DeleteButton` | 削除ボタン（確認トリガー） |
| `TextAreaField` | textareaラッパー |
| `DateTimeField` | datetime-local入力ラッパー |
| `SelectField` | selectラッパー |
| `ConfirmModal` | 削除確認モーダル |
| `PrivateRoute` | JWT exp検証コンポーネント |
| `SidebarLayout` | Sidebar＋メインコンテンツのレイアウト |
| `TaskCard` | タスク1件表示カード（クリックでパネル表示） |
| `EventModal` | 予定作成・編集モーダル（作成者のみ編集可） |
| `TaskTooltip` | カレンダー日表示タスクのホバーツールチップ |
| `ActionButton` | ナビゲーション用スカイブルーボタン |
| `CategoryFilterBar` | カテゴリフィルターピルボタン群 |
| `SectionToggleButton` | 完了済みセクション折りたたみボタン |

---

## FullCalendar テーマ設定（index.css）

```css
.calendar-wrapper {
  --fc-border-color: #334155;
  --fc-today-bg-color: rgba(14, 165, 233, 0.12); /* sky系薄いオーバーレイ */
  --fc-page-bg-color: transparent;
  --fc-neutral-bg-color: #1e293b;
}

/* スマホ向けフォールバック（週ビュー万一表示時） */
@media (max-width: 639px) {
  .calendar-wrapper .fc-col-header-cell-cushion {
    font-size: 0.65rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 2.5rem;
    display: block;
  }
}
```
