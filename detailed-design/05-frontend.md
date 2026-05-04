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
        <Route path="/"          element={<HomePage />}     />
        <Route path="/tasks"     element={<TaskListPage />} />
        <Route path="/tasks/new" element={<TaskFormPage />} />
        <Route path="/calendar"  element={<CalendarPage />} />
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
| `/tasks/new` | `TaskFormPage`（作成モード・子タスク作成モード） | 要認証 | 実装済み |
| `/calendar` | `CalendarPage` | 要認証 | 実装済み |

> **廃止済みルート**: `/tasks/:id`（タスク詳細）、`/tasks/:id/edit`（タスク編集）はサイドパネル統合により削除された。

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

ログイン後の全画面に共通するレイアウトコンポーネント。レスポンシブ対応済み。

```
SidebarLayout（スマホ: flex-col、PC[sm:]: flex-row）
├── Sidebar（スマホ: 上部ナビバー / PC: 左サイドバー）
└── main（flex-1、スマホ: p-4、PC[sm:]: p-8）
    └── <Outlet />（各ページコンポーネント）
```

**レスポンシブブレークポイント:**

| ブレークポイント | レイアウト | 説明 |
|----------------|---------|------|
| `sm:` 未満（スマホ） | `flex-col`（縦積み） | Sidebarが上部ナビバーとして表示 |
| `sm:` 以上（PC） | `flex-row`（横並び） | Sidebarが左サイドバーとして表示 |

### Sidebar

レスポンシブ対応済み。スマホでは上部ナビバー、PCでは左サイドバーとして表示する。

| 要素 | スマホ（`sm:` 未満） | PC（`sm:` 以上） |
|------|------|------|
| 全体レイアウト | `flex-row`（横並び） | `flex-col`（縦並び）、`w-60` |
| タイトル | 表示（左端） | 表示（上部） |
| ナビゲーション | 横並び（`flex-row`） | 縦並び（`flex-col`） |
| ログアウトボタン | 右端に配置 | 下部に配置 |

```typescript
const NAV_LINKS = [
  { to: '/tasks', label: 'タスク管理' },
  { to: '/calendar', label: 'カレンダー' },
] as const;
```

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

**責務**: タスク一覧の表示・削除確認・詳細サイドパネル表示。ロジックは `useTaskList` に委譲。

タスクは親子の階層構造で表示し、未完了セクション・完了済みセクションに分けて表示する。
ルートタスク（depth === 0）かつ子タスクを持つ場合、左端のトグルボタンで子タスク一覧の表示/非表示を切り替えられる。
カードをクリックすると右側にサイドパネル（`TaskDetailPanel`）が開く（ページ遷移なし・URL変更なし）。
パネル表示中は flex 左右分割（左: 一覧、右: 詳細パネル）。一覧とパネルの間にドラッグ可能なディバイダーがあり、パネル幅を 240px〜700px の範囲で変更できる（画面更新でリセット）。

```
TaskListPage
├── [パネル表示時] 外側: flex コンテナ（ref={containerRef}）
│   ├── 一覧エリア（flex-1 min-w-0 / パネル非表示時は w-full）
│   │   ├── ConfirmModal（削除確認モーダル）
│   │   ├── ヘッダー（タイトル + ActionButton "タスクを作成"）
│   │   ├── CategoryFilterBar（"すべて" + 各カテゴリのピルボタン）
│   │   ├── FormErrorBanner（API/削除/完了切り替えエラー）
│   │   ├── 読み込み中テキスト
│   │   ├── タスクなしメッセージ
│   │   ├── 未完了タスクセクション（incompleteTrees を isNodeHidden でフィルター済み）
│   │   │   └── 階層ツリー表示（DEPTH_INDENT_CLASSES による depth ごとのインデント）
│   │   │       └── 各タスクカード（renderTaskCard → TaskCard）
│   │   │           ├── [depth === 0 かつ children あり] カード内左端にトグルボタン（展開時 rotate-90）
│   │   │           ├── [depth === 0 かつ children なし] カード内左端に同幅スペーサー
│   │   │           └── [depth > 0] インデント・「└」アイコン付き（既存構造を維持）
│   │   └── 完了済みタスクセクション（completedTrees を isNodeHidden でフィルター済み）
│   │       ├── SectionToggleButton（"完了済み (N件)"、折りたたみ可）
│   │       └── 折りたたみ展開時: 階層ツリー表示（同上）
│   ├── [パネル表示時] ディバイダー（w-3, cursor-col-resize, ドラッグでパネル幅変更）
│   └── [パネル表示時] パネルコンテナ（style={{ width: panelWidth }}）
│       └── TaskDetailPanel（task・isToggling・isOwner・各コールバック）
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
`DEPTH_INDENT_CLASSES` に存在しない depth には `DEPTH_INDENT_FALLBACK_CLASS`（`'pl-14'`）を使用する。

**子タスクトグル関連定数**

| 定数 | 値 | 定義場所 | 説明 |
|------|-----|---------|------|
| `TOGGLE_BUTTON_WIDTH_CLASS` | `'w-6'` | `TaskCard.tsx` | トグルボタン・スペーサーの幅クラス |
| `MAX_TREE_DEPTH` | `10` | `TaskListPage.tsx` | ツリーノードの最大階層深さ（再帰打ち切り用） |
| `DEPTH_INDENT_FALLBACK_CLASS` | `'pl-14'` | `TaskListPage.tsx` | `DEPTH_INDENT_CLASSES` に存在しない depth のフォールバック |

**タスクカード状態別スタイル定数**（`TaskCard.tsx` に定義）

| 定数 | Tailwindクラス | 適用条件 |
|------|--------------|---------|
| `CARD_COMPLETED_CLASSES` | `border-green-800 opacity-75` | `node.is_completed === true` |
| `CARD_PARTIAL_CLASSES` | `border-yellow-700 bg-yellow-950` | `node.hasPartiallyCompletedChildren === true`（自身は未完了） |
| `CARD_DEFAULT_CLASSES` | `border-slate-600` | 上記以外 |

`CARD_COMPLETED_CLASSES` → `CARD_PARTIAL_CLASSES` → `CARD_DEFAULT_CLASSES` の優先順で適用する。

**「一部完了」バッジ**（`TaskCard.tsx` に定義）

`node.hasPartiallyCompletedChildren` が `true` の場合、タイトル行に「一部完了」バッジを表示する。

```typescript
const PARTIAL_COMPLETE_BADGE_CLASSES =
  'shrink-0 px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-800 text-yellow-200';
```

**`isNodeHidden` 関数（コンポーネント外の純粋関数）**

```typescript
function isNodeHidden(
  node: TaskTreeNode,
  allNodes: TaskTreeNode[],
  collapsed: Set<number>,
  recursionDepth: number = 0,
): boolean
```

指定ノードが折りたたみ状態により非表示となるかを判定する。

- `node.depth === 0` または `recursionDepth >= MAX_TREE_DEPTH` の場合は `false`（常に表示）
- `node.parent_id` が `collapsed` セットに含まれる場合は `true`（直接の親が折りたたまれている）
- それ以外の場合、祖先ノードを再帰的にたどって判定する（循環防止のため `recursionDepth` をインクリメント）

**ローカルステート**

| ステート | 型 | 初期値 | 説明 |
|---------|-----|--------|------|
| `deleteError` | `string` | `''` | 削除エラーメッセージ |
| `deleteTargetId` | `number \| null` | `null` | 削除確認対象タスクID |
| `isCompletedSectionOpen` | `boolean` | `false` | 完了済みセクション展開フラグ |
| `collapsedParentIds` | `Set<number>` | `new Set()` | 折りたたみ中の親タスク ID セット（空 = 全展開） |
| `selectedTaskId` | `number \| null` | `null` | 詳細パネル表示中のタスクID（null: 非表示） |
| `panelWidth` | `number` | `360`（px） | サイドパネル幅（px）。ドラッグで変更され、画面更新でリセット） |

**導出値**

| 変数 | 算出方法 | 説明 |
|------|---------|------|
| `selectedTask` | `findTaskById(tasks, selectedTaskId)` | パネルに表示するタスク（tasks ステートから取得） |
| `isDetailOwner` | `selectedTask?.created_by === currentUsername` | 表示中タスクの作成者かどうか |
| `isDetailToggling` | `togglingIds.has(selectedTaskId)` | 表示中タスクのPATCH処理中フラグ |
| `isPanelOpen` | `selectedTaskId !== null` | パネル表示中かどうか |

**ローカル関数**

| 関数 | 説明 |
|------|------|
| `findTaskById(tasks, id)` | tasks ツリーから指定 ID のタスクを再帰的に探して返す（コンポーネント外の純粋関数） |
| `openDetailPanel(id)` | `awaitToggle(id)` で進行中 PATCH の完了を待機してから `setSelectedTaskId(id)` |
| `closeDetailPanel()` | `setSelectedTaskId(null)` |
| `handleDividerMouseDown(e)` | ドラッグ開始フラグをセット（`isDraggingRef.current = true`） |
| `toggleCollapse(parentId: number)` | 指定 ID を `collapsedParentIds` に追加/削除して子タスクの表示/非表示を切り替える |
| `onDeleteClick(id)` | 削除確認モーダルを開く |
| `onConfirmDelete()` | 削除実行後にパネルが開いていたら閉じる |

**リサイズロジック（useEffect）**

- `window.addEventListener('mousemove', onMouseMove)` でドラッグ中のパネル幅を更新
- `containerRef.current.getBoundingClientRect().right - e.clientX` でパネル幅を計算
- 最小 240px、最大 700px にクランプ
- `window.addEventListener('mouseup', ...)` でドラッグ終了

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

### CalendarPage

**責務**: カレンダーの表示・予定の作成・編集・削除。ロジックは `useCalendar` に委譲。

FullCalendar（dayGridPlugin / timeGridPlugin / interactionPlugin）を使用して月/週/日ビューを切り替える。
日表示（timeGridDay）のみタスクをグレーブロックとして表示し、マウスオーバーで `TaskTooltip` を表示する。
カレンダーの日付・時間帯をクリックすると新規作成モード（`EventModal`）が開く。
カレンダーのイベントをクリックすると編集モード（`EventModal`）が開く。タスクイベントは `isTaskEvent` 型ガードで判定しクリックしても編集モーダルを開かない。

**スマホ対応（レスポンシブ）**: `useIsMobile` フックで画面幅 640px 未満を検知する。スマホ時に `currentView === 'timeGridWeek'` だった場合、`useEffect` で自動的に `timeGridDay`（日ビュー）へフォールバックする。`CalendarViewToggle` には `isMobile` を渡し、スマホ時は週ボタンを非表示にして誤操作を防ぐ。

```
CalendarPage
├── ヘッダー（タイトル "カレンダー" + CalendarViewToggle）
├── FormErrorBanner（エラー表示）
├── 読み込み中: テキスト表示
└── 読み込み完了:
    ├── .calendar-wrapper（FullCalendarダークテーマCSS変数スコープ）
    │   └── FullCalendar
    │       ├── plugins: dayGridPlugin, timeGridPlugin, interactionPlugin
    │       ├── locale: "ja"
    │       ├── headerToolbar: { left: 'prev,next today', center: 'title', right: '' }
    │       ├── selectable: true（日付・時間帯クリックで select イベント発火）
    │       ├── events: calendarEvents（予定 + 日表示時のみタスク）
    │       ├── select → handleDateSelect（新規作成モーダルを開く）
    │       ├── eventClick → handleEventClick（編集モーダルを開く・タスクは無視）
    │       ├── eventMouseEnter → handleEventMouseEnter（タスクツールチップ表示）
    │       └── eventMouseLeave → handleEventMouseLeave（ツールチップ非表示）
    ├── EventModal（open/event/initialStart/currentUsername/onSave/onDelete/onClose）
    └── TaskTooltip（tooltip.visible 時のみ・マウス座標に追従）
```

**ローカルステート**

| ステート | 型 | 初期値 | 説明 |
|---------|-----|--------|------|
| `modalOpen` | `boolean` | `false` | EventModal 表示フラグ |
| `selectedEvent` | `CalendarEvent \| null` | `null` | 編集対象の予定（null: 新規作成） |
| `initialStart` | `string \| undefined` | `undefined` | 新規作成時の初期開始日時 |
| `modalError` | `string` | `''` | モーダルエラーメッセージ |
| `tooltip` | `TooltipState` | 全フィールド初期値 | ツールチップ表示状態・位置・内容 |

**型定義（CalendarPage 内）**

```typescript
interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  title: string;
  description: string;
  priority: Priority;
  category: string | null;
  is_completed: boolean;
  created_by: string;
}

interface TaskEventProps {
  type: 'task';
  description: string;
  priority: Priority;
  category: string | null;
  is_completed: boolean;
  created_by: string;
}
```

**`isTaskEvent` 型ガード関数**

```typescript
function isTaskEvent(extendedProps: Record<string, unknown>): extendedProps is TaskEventProps {
  return extendedProps['type'] === 'task';
}
```

**TaskDetailPage（廃止済み）**

> **削除済み**: このページコンポーネントおよびルート（`/tasks/:id`、`/tasks/:id/edit`）は削除された。タスク詳細・編集の機能は `TaskListPage` の右サイドパネル（`TaskDetailPanel`）に統合された。

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
| `tasks` | `Task[]` | タスク一覧（全件）。`TaskDetailPanel` と共有する |
| `incompleteTrees` | `TaskTreeNode[]` | 未完了タスクの階層ツリー（カテゴリフィルター済み） |
| `completedTrees` | `TaskTreeNode[]` | 完了済みタスクの階層ツリー（カテゴリフィルター済み） |
| `categories` | `string[]` | カテゴリ一覧 |
| `selectedCategory` | `string` | 選択中カテゴリ（空文字 = 全件） |
| `loading` | `boolean` | 読み込み中フラグ |
| `error` | `string` | 取得エラーメッセージ |
| `toggleCompleteError` | `string` | 完了切り替えエラーメッセージ（楽観的更新失敗時にセット） |
| `togglingIds` | `Set<number>` | 現在PATCH処理中のタスクIDセット |

> `deleteError` はフック外（`TaskListPage` のローカルstate）で管理する。

**ref（内部）**

| ref | 型 | 説明 |
|-----|-----|------|
| `tasksRef` | `MutableRefObject<Task[]>` | 並走トグル操作のロールバック競合防止のため最新 tasks を保持 |
| `togglePromisesRef` | `MutableRefObject<Map<number, Promise<void>>>` | PATCH中の各タスクIDに対応する Promise を保持（外部から await するために使用） |

| 関数 | 説明 |
|------|------|
| `handleDelete(id)` | タスクを削除しローカルstateを更新 |
| `handleToggleComplete(id, is_completed)` | タスクの完了状態を楽観的UI更新で切り替える。ボタン押下直後にローカルステートを更新し、`togglingIds` にIDを追加してPATCH処理中フラグを立てる。APIコール成功時はサーバーレスポンスで上書き、失敗時はスナップショットにロールバック。`finally` で `togglingIds` からIDを削除しPromiseを削除する |
| `awaitToggle(id)` | 指定IDのタスクにPATCHが進行中であれば完了まで待機する。進行中でなければ即座に resolve。refベースのため常に最新状態を参照（React stateの更新遅延に依存しない） |
| `handleUpdate(id, input)` | `updateTask` APIを呼び出し、成功時に `replaceTaskInTree` でローカル tasks ステートを更新して返す |
| `setSelectedCategory(category)` | カテゴリフィルターを更新する |
| `reload()` | 一覧を再読み込みするトリガーをインクリメント |

**ヘルパー関数（モジュールレベル）**

```typescript
function replaceTaskInTree(tasks: Task[], updated: Task): Task[]
```

ツリー内の指定IDのタスクを `updated` で再帰的に置き換える。

**UseTaskListReturn に含まれるフィールド（抜粋）**

`tasks`、`togglingIds`、`awaitToggle`、`handleUpdate`、`handleToggleComplete`、`handleDelete`、`incompleteTrees`、`completedTrees`、`categories`、`selectedCategory`、`setSelectedCategory`、`loading`、`error`、`toggleCompleteError`、`reload`

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

### useTaskForm

> **編集モードは現在未使用**: `/tasks/:id/edit` ルート削除により `isEditMode === true` のパスは実行されない。作成・子タスク作成モードは引き続き有効。なお、子タスク作成後の遷移先 `/tasks/:parentId` はすでに削除されたルートのため、子タスク作成後のナビゲーションは Dead code となっている。

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

### useCalendar

カレンダー予定・タスク表示・ビュー切り替えを管理するカスタムフック。

| state | 型 | 説明 |
|-------|-----|------|
| `events` | `CalendarEvent[]` | 予定一覧 |
| `tasks` | `Task[]` | タスク一覧（日表示時にカレンダーに表示するために保持） |
| `currentView` | `CalendarView` | 現在のビュー（初期値: `'dayGridMonth'`） |
| `loading` | `boolean` | 読み込み中フラグ |
| `error` | `string` | エラーメッセージ |

**CalendarView 型**

```typescript
type CalendarView = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay';
```

**UseCalendarReturn に含まれるフィールド**

`events`、`calendarEvents`（FullCalendarへ渡すEventInput配列）、`currentView`、`loading`、`error`、`currentUsername`、`setCurrentView`、`handleCreateEvent`、`handleUpdateEvent`、`handleDeleteEvent`、`reload`

**calendarEvents の構築（useMemo）**

```
- CalendarEvent → EventInput: id は "event-{id}" プレフィックス。背景色: #0369a1（sky系）
- 日表示（timeGridDay）の場合のみタスクを追加
  - Task → EventInput: id は "task-{id}" プレフィックス。背景色: #334155（グレー）
  - start = due_date、end = due_date + 1時間（タイムグリッドで視認できる高さを確保）
  - extendedProps に type: 'task'・taskId・description・priority・category・is_completed・created_by を格納
```

**CRUD操作**

| 関数 | 説明 |
|------|------|
| `handleCreateEvent(input)` | 予定を作成してローカルステートに追加する |
| `handleUpdateEvent(id, input)` | 予定を更新してローカルステートの該当予定をサーバーレスポンスで置き換える |
| `handleDeleteEvent(id)` | 予定を削除してローカルステートから除去する |
| `reload()` | `reloadTrigger` をインクリメントして予定・タスクを再読み込みする |

**データ読み込み（useEffect）**

`reloadTrigger` を依存配列に持つ。`Promise.all([fetchEvents(), fetchTasks()])` で予定とタスクを並列取得する。

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

### eventValidation

`EventFormValues` 型 / `EventValidationErrors` 型を定義。

| フィールド | 条件 | エラーメッセージ |
|-----------|------|----------------|
| title | 空文字 | 「タイトルを入力してください」 |
| title | 201文字以上 | 「タイトルは200文字以内で入力してください」 |
| start_at | 空文字 | 「開始日時を入力してください」 |
| end_at | 空文字 | 「終了日時を入力してください」 |
| end_at | start_at 以前の値 | 「終了日時は開始日時より後に設定してください」 |

`isEventFormValid(errors)` でエラーオブジェクトが空かどうかを検証する。

---

## API通信

### accountApi.ts

**APIベースURL構築**

```typescript
const API_HOST = process.env.REACT_APP_API_HOST;
const BASE_URL = API_HOST
  ? `${process.env.REACT_APP_API_SCHEME}://${API_HOST}:${process.env.REACT_APP_API_PORT}`
  : '';
```

`REACT_APP_API_HOST` が空文字または未設定の場合、`BASE_URL = ''`（空文字）となり相対URLでリクエストを送信する。CRAの `"proxy": "http://localhost:8000"`（`frontend/package.json`）と組み合わせることで、トンネル1本（フロントエンドのURL）でAPIへの疎通が可能になる。`taskApi.ts` / `eventApi.ts` も同じフォールバックロジックを使用する。

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
  closed_by: string | null;  // タスクをクローズしたユーザー名。未完了の場合は null
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

### eventApi.ts

Authorizationヘッダー（`Bearer <token>`）を全リクエストに付与。

**CalendarEvent インターフェース**

```typescript
interface CalendarEvent {
  id: number;
  title: string;
  description: string;
  start_at: string;         // ISO8601形式
  end_at: string;           // ISO8601形式
  created_by: string;
  created_at: string;
  updated_at: string;
}
```

**EventInput インターフェース**

```typescript
interface EventInput {
  title: string;
  description?: string;
  start_at: string;         // ISO8601形式
  end_at: string;           // ISO8601形式
}
```

> `created_by` はサーバー側でJWT認証済みユーザー名を自動セットするため、クライアントから送信しない。

| 関数 | メソッド | エンドポイント | 戻り値 | 説明 |
|------|---------|-------------|-------|------|
| `fetchEvents()` | GET | `/events` | `Promise<CalendarEvent[]>` | 予定一覧取得（start_at 昇順） |
| `createEvent(input)` | POST | `/events` | `Promise<CalendarEvent>` | 予定作成 |
| `updateEvent(id, input)` | PATCH | `/events/:id` | `Promise<CalendarEvent>` | 予定更新 |
| `deleteEvent(id)` | DELETE | `/events/:id` | `Promise<void>` | 予定削除 |

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

### CancelButton

キャンセルボタン。

| props | 型 | 必須 | 説明 |
|-------|-----|------|------|
| `onClick` | `() => void` | ✅ | クリック時のコールバック |
| `disabled` | `boolean` | ❌ | 非活性フラグ |
| `className` | `string` | ❌ | スタイル上書き用 |

### DeleteButton

削除ボタン。削除操作の確認トリガーに使用する。

| props | 型 | 必須 | デフォルト | 説明 |
|-------|-----|------|---------|------|
| `label` | `string` | ❌ | `'削除'` | ボタンラベル |
| `onClick` | `() => void` | ✅ | - | クリック時のコールバック |
| `disabled` | `boolean` | ❌ | - | 非活性フラグ |
| `className` | `string` | ❌ | - | スタイル上書き用（省略時はデフォルトの赤系スタイル） |

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
| NavLink | カレンダー（アクティブ時 `bg-sky-700`） |
| ログアウトボタン | `localStorage.removeItem('token')` → `/login` |

### SidebarLayout

レスポンシブ対応済み。`sm:` ブレークポイントを境にスマホ（縦積み）とPC（横並び）を切り替える。

```
div.flex.min-h-screen（スマホ: flex-col、PC[sm:]: flex-row）
├── Sidebar（スマホ: 上部ナビバー / PC: 左サイドバー w-60）
└── main.flex-1（スマホ: p-4、PC[sm:]: p-8）
    └── <Outlet />
```

### TaskCard

タスク1件の表示を提供するコンポーネント。`TaskListPage` から切り出し。カード全体をクリック可能にし、詳細サイドパネルを開くコールバックを呼び出す。

| props | 型 | 必須 | 説明 |
|-------|-----|------|------|
| `node` | `TaskTreeNode` | ✅ | 表示対象のタスクツリーノード |
| `isCollapsed` | `boolean` | ✅ | 子タスクが折りたたまれているか（depth=0 のみ使用） |
| `onToggleCollapse` | `() => void` | ✅ | 子タスク表示/非表示の切り替えコールバック（`e.stopPropagation()` でカードクリックと分離） |
| `onSelect` | `() => void` | ✅ | カードクリック時に詳細パネルを開くコールバック |

**depth 別レンダリング:**
- `depth === 0` かつ `children.length > 0`: カード内部の左端にトグルボタン（＞）を表示。展開中は `rotate-90`
- `depth === 0` かつ `children.length === 0`: カード内部の左端に同幅スペーサーを表示
- `depth > 0`: タイトル行の先頭に「└」アイコンを表示

**カードクリック:** カード全体（外側 div）が clickable（`onClick={onSelect}`、`cursor-pointer`、`hover:bg-slate-600 transition-colors`）。完了切り替えボタン・詳細ボタン・編集ボタン・削除ボタンはすべて削除。展開/折りたたみボタンは `e.stopPropagation()` でカードクリックと分離。

**`closed_by` 表示:** タスクが完了状態（`isCompleted === true`）かつ `node.closed_by` が存在する場合、期限・担当者行に "クローズ: {username}" を緑文字（`text-green-400`）で表示する。

### TaskDetailPanel

タスク一覧画面の右側に表示するサイドパネルコンポーネント。`useTaskList` の `tasks` ステートを props 経由で受け取り、独自のAPIコールは行わない。詳細表示モードとインライン編集モードを切り替え可能。

| props | 型 | 必須 | 説明 |
|-------|-----|------|------|
| `task` | `Task \| null` | ✅ | 表示対象のタスク（null の場合は「見つかりません」表示） |
| `isToggling` | `boolean` | ✅ | PATCH処理中フラグ（true の間は全ボタンを disabled） |
| `isOwner` | `boolean` | ✅ | 現在のユーザーがタスクの作成者かどうか（削除ボタン表示制御） |
| `onClose` | `() => void` | ✅ | パネルを閉じるコールバック |
| `onToggleComplete` | `(id: number, is_completed: boolean) => Promise<void>` | ✅ | 完了状態切り替え（useTaskList と共有） |
| `onSelectTask` | `(id: number) => void` | ✅ | 子タスク・親タスクのリンクをクリックしたときの切り替えコールバック |
| `onDeleteClick` | `(id: number) => void` | ✅ | 削除確認モーダルを開くコールバック |
| `onUpdate` | `(id: number, input: Partial<TaskInput>) => Promise<Task>` | ✅ | タスク更新コールバック（useTaskList と共有） |

### CalendarViewToggle

カレンダーのビュー切り替えボタングループコンポーネント。月・週・日の3種類を切り替える。
スマホ時（`isMobile=true`）は週ボタンを非表示にする。

| props | 型 | 必須 | 説明 |
|-------|-----|------|------|
| `currentView` | `CalendarView` | ✅ | 現在のビュー |
| `onChange` | `(view: CalendarView) => void` | ✅ | ビュー切り替えコールバック |
| `isMobile` | `boolean` | ❌ | スマホ表示かどうか（`true` のとき週ボタンを非表示、デフォルト: `false`） |

```typescript
const VIEW_BUTTONS: { view: CalendarView; label: string; mobileHidden?: boolean }[] = [
  { view: 'dayGridMonth', label: '月' },
  { view: 'timeGridWeek', label: '週', mobileHidden: true },
  { view: 'timeGridDay', label: '日' },
];
```

選択中: `bg-sky-700 text-white`、非選択: `text-slate-300 bg-slate-700 hover:bg-slate-600`

`isMobile && mobileHidden` が `true` のボタンは `filter` で除外してレンダリングしない。

### EventModal

予定の作成・編集モーダルコンポーネント。`event` が null の場合は新規作成モード、指定されている場合は編集モード。

| props | 型 | 必須 | 説明 |
|-------|-----|------|------|
| `open` | `boolean` | ✅ | モーダルの表示状態 |
| `event` | `CalendarEvent \| null` | ✅ | 編集時は既存予定、新規作成時は null |
| `initialStart` | `string \| undefined` | ❌ | 新規作成時の初期開始日時（datetime-local形式） |
| `currentUsername` | `string \| null` | ✅ | ログイン中ユーザー名（作成者チェックに使用） |
| `onSave` | `(input: EventInput) => Promise<void>` | ✅ | 保存ボタン押下時のコールバック |
| `onDelete` | `(id: number) => Promise<void>` | ✅ | 削除ボタン押下時のコールバック |
| `onClose` | `() => void` | ✅ | モーダルを閉じるコールバック |

**編集モードのアクセス制御**: `event.created_by === currentUsername` が `true` の場合のみ保存・削除ボタンを表示。作成者以外は読み取り専用。

**モーダルが開くたびにフォームを初期化する（useEffect）:**
- 新規作成時: `initialStart` をベースに開始日時・終了日時（+1時間）を初期値にセット
- 編集時: 既存の `event` データをフォームに反映（ISO文字列 → datetime-local 形式変換）

**フォーム構成:**
- `FormField`: タイトル
- `TextAreaField`: 説明
- `DateTimeField`: 開始日時
- `DateTimeField`: 終了日時
- `DeleteButton`（編集モード・作成者のみ）
- `CancelButton` / `SubmitButton`

**削除フロー**: `DeleteButton` 押下 → `ConfirmModal` 表示 → 確認後 `onDelete` 呼び出し → モーダルを閉じる

### TaskTooltip

カレンダー日表示でタスクをマウスオーバーした際に詳細情報を表示するツールチップコンポーネント。

| props | 型 | 必須 | 説明 |
|-------|-----|------|------|
| `title` | `string` | ✅ | タスクタイトル |
| `description` | `string` | ✅ | タスク説明文 |
| `priority` | `Priority` | ✅ | 優先度 |
| `category` | `string \| null` | ✅ | カテゴリ |
| `is_completed` | `boolean` | ✅ | 完了フラグ |
| `created_by` | `string` | ✅ | 作成者 |
| `x` | `number` | ✅ | 表示X座標（px） |
| `y` | `number` | ✅ | 表示Y座標（px） |

`pointer-events-none` でマウスイベントを透過。`fixed z-50` で最前面に表示。マウス座標の右下（+12px）にオフセットして表示する。

---

### ActionButton

ナビゲーション・アクション用の汎用ボタンコンポーネント。スカイブルー塗りつぶしスタイル。

| props | 型 | 必須 | 説明 |
|-------|-----|------|------|
| `label` | `string` | ✅ | ボタンに表示するラベル |
| `onClick` | `() => void` | ✅ | クリック時のコールバック |

### CategoryFilterBar

カテゴリフィルターバーコンポーネント。「すべて」ボタンと各カテゴリのピルボタンを横並びで表示。

| props | 型 | 必須 | 説明 |
|-------|-----|------|------|
| `categories` | `string[]` | ✅ | カテゴリ名の一覧 |
| `selectedCategory` | `string` | ✅ | 現在選択中のカテゴリ（空文字は「すべて」） |
| `onSelect` | `(category: string) => void` | ✅ | カテゴリ選択時のコールバック |

選択中: `bg-sky-600 text-white`、非選択: `bg-slate-600 text-slate-300 hover:bg-slate-500`

### SectionToggleButton

セクション折りたたみボタンコンポーネント。

| props | 型 | 必須 | 説明 |
|-------|-----|------|------|
| `label` | `string` | ✅ | セクション名（例: "完了済み"） |
| `count` | `number` | ✅ | 表示する件数 |
| `isOpen` | `boolean` | ✅ | セクションが展開中かどうか |
| `onClick` | `() => void` | ✅ | クリック時のコールバック |

展開中は `▾`、折りたたみ中は `▸` を表示。ラベルと件数を "ラベル (N件)" の形式で表示。

---

## FullCalendar テーマ設定（index.css）

```css
.calendar-wrapper {
  /* CSS変数でFullCalendarのダークテーマを上書き */
  --fc-border-color: #334155;           /* スレート系ボーダー */
  --fc-today-bg-color: rgba(14, 165, 233, 0.12); /* sky-500 の薄いオーバーレイ（今日ハイライト） */
  --fc-page-bg-color: transparent;
  --fc-neutral-bg-color: #1e293b;
  /* 他のCSS変数... */
}
```

`--fc-today-bg-color` に紺ベースUIで視認しやすい sky 系の薄いオーバーレイを使用する（黄色デフォルトは使用しない）。

**スマホ向けメディアクエリ（フォールバック）**

```css
@media (max-width: 639px) {
  .calendar-wrapper .fc-col-header-cell-cushion {
    font-size: 0.65rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 2.5rem;
    display: block;
  }
  .calendar-wrapper .fc-timegrid-slot-label-cushion {
    font-size: 0.6rem;
  }
}
```

週ビューがスマホで万一表示された場合（ブラウザ幅変化等）に、ヘッダーセルの文字が被らないようフォントサイズ縮小と `text-overflow: ellipsis` を適用するフォールバック。通常は `CalendarPage` の `useEffect` により `timeGridDay` へ自動フォールバックされるため、このCSSが適用されることは稀である。
