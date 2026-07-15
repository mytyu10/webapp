# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Full-stack TypeScript web app: React frontend (port 3000) + NestJS backend (port 8000) with PostgreSQL via Prisma. UI and backend messages are in Japanese.

## Commands

### Backend (`cd backend`)

```bash
npm run start:dev     # dev server with watch
npm run build         # compile TypeScript
npm run lint          # ESLint with auto-fix
npm run format        # Prettier format
npm run test          # run unit tests
npm run test:watch    # unit tests in watch mode
npm run test:cov      # unit tests with coverage
npm run test:e2e      # run E2E tests (requires backend/.env)
```

Run a single test file:
```bash
npx jest src/accounts/service/account.service.spec.ts
```

### Frontend (`cd frontend`)

```bash
npm start             # dev server at localhost:3000
npm run build         # production build
npm test              # interactive test runner
```

### Database (from `backend/`)

```bash
npx prisma migrate dev        # apply migrations (dev)
npx prisma migrate deploy     # apply migrations (prod)
npx prisma studio             # DB GUI
npx prisma generate           # regenerate Prisma client
```

## Architecture

### Backend (NestJS)

Layered module structure: **Controller → Service → Repository → Prisma**.

- `src/accounts/controller/` — REST endpoints (`POST /accounts/login`, `POST /accounts/regist`, `GET /accounts/me`, `GET /accounts/line/login`, `GET /accounts/line/callback`)。`POST /accounts/login` と `POST /accounts/regist` には `@Throttle({ default: { ttl: 60000, limit: 5 } })` で1分5回のレートリミットを適用する
- `src/accounts/service/` — business logic（ログイン・登録・LINE OAuth フロー・ログインユーザー情報取得）。`login()` は bcrypt で照合し、失敗時は SHA-256 フォールバックで旧形式パスワードを確認して自動移行する
- `src/accounts/repository/` — Prisma queries（`updateLineUserId` で LINE User ID を保存。`findAll()` で全ユーザー一覧取得。`updateHashedPassword()` で bcrypt 移行時のパスワード更新）
- `src/accounts/dto/account.dto.ts` — validation DTOs (class-validator)。`LineCallbackQueryDto`（OAuthコード受取）・`AccountMeResponseDto`（LINE連携状態含む）を定義
- `src/tasks/controller/` — REST endpoints (`GET /tasks`, `GET /tasks/categories`, `GET /tasks/:id`, `POST /tasks`, `PATCH /tasks/:id`, `DELETE /tasks/:id`, `POST /tasks/:id/notifications`, `GET /tasks/:id/notifications`, `DELETE /tasks/:id/notifications/:notificationId`) — JwtAuthGuard適用済み。`GET /tasks` と `GET /tasks/categories` は `req.user.username` をサービスに渡してログインユーザーのタスクのみ取得する
- `src/tasks/service/` — タスクのビジネスロジック（`task.service.ts`）・バッチ更新処理（`task-queue.service.ts`: 100msウィンドウ内のリクエストをバッファリングして順次処理）・通知CRUD（`task-notification.service.ts`）。`findAll(username)` / `findAllCategories(username)` はユーザー名をリポジトリに伝播する
- `src/tasks/repository/` — Prisma CRUD・カテゴリ取得（is_completed・closed_by・notifications フィールド対応）。`task-notification.repository.ts` で通知の作成・取得・削除・送信対象抽出・送信済みマークを提供。`findAll(username)` は `created_by = username` OR `assignees に username が含まれる` 条件でフィルタリングする。`findAllCategories(username)` も同様の OR 条件でユーザーのタスクに紐付くカテゴリのみ返す
- `src/tasks/dto/task.dto.ts` — CreateTaskDto / UpdateTaskDto（is_completed含む） / TaskResponseDto（is_completed・closed_by・notifications含む） / Priority型 / CreateNotificationDto / NotificationResponseDto。主要クラスに `@ApiProperty` / `@ApiPropertyOptional` デコレータを追加済み
- `src/line/line-notification.service.ts` — `@Cron(CronExpression.EVERY_MINUTE)` で毎分実行するCronジョブ。未送信かつ `notify_at <= 現在時刻` の通知を取得し、担当者（LINE連携済みのみ）に LINE Messaging API でプッシュ通知を送信。全担当者処理後に `is_sent=true` にマーク。送信失敗時は `is_sent` を更新せず次回再試行
- `src/events/controller/` — REST endpoints (`GET /events`, `GET /events/:id`, `POST /events`, `POST /events/multiple`, `POST /events/repeat`, `PATCH /events/repeat-group/:groupId`, `PATCH /events/:id`, `DELETE /events/:id`) — JwtAuthGuard適用済み。`POST /events/multiple` は複数日付一括作成、`POST /events/repeat` は繰り返しルール一括作成、`PATCH /events/repeat-group/:groupId` は繰り返しグループ全件一括更新（ルート衝突回避のため `:id` より前に定義）。`GET /events` は `req.user.username` をサービスに渡してログインユーザーの予定のみ取得する
- `src/events/service/` — 予定のビジネスロジック（`event.service.ts`）。単件作成（`create`）・複数日付一括作成（`createMultiple`）・繰り返し一括作成（`createRepeat`）・単件更新（`update`）・繰り返しグループ全件更新（`updateRepeatGroup`）・削除。繰り返し展開は daily/weekly/monthly の3タイプ対応。monthly は月末補正あり。最大生成件数100件制限。`createRepeat` は全件に同一 `repeat_group_id`（UUID）を付与する。`updateRepeatGroup` はグループ全件の `created_by` を確認してから `start_diff_ms`/`end_diff_ms` で各日時をシフト更新する。全作成・更新メソッドで `color` フィールドを処理する（未指定時はデフォルト `cyan`）。`findAll(username)` はユーザー名をリポジトリに伝播する
- `src/events/repository/` — Prisma CRUD（findAll/findById/create/createMany/update/updateMany/delete/findByRepeatGroupId）。`createMany`・`updateMany` は SQLite の制約回避のため `$transaction` + 個別操作配列で実装。`findByRepeatGroupId` は `repeat_group_id` で絞り込み `start_at` 昇順で返す。`update`/`updateMany` は `color` フィールドをサポート。`findAll(username)` は `where: { created_by: username }` でログインユーザーの予定のみ返す
- `src/events/dto/event.dto.ts` — CreateEventDto / CreateMultipleEventsDto（start_times配列・end_times配列。件数一致必須） / CreateRepeatEventDto（end_at・RepeatRuleDto含む） / UpdateEventDto / UpdateRepeatGroupEventDto（title?・description?・start_diff_ms?・end_diff_ms?・color? のオプション項目） / EventResponseDto（repeat_group_id・color含む） / RepeatType enum（daily/weekly/monthly）。全 DTO に `color?: string`（@IsOptional・@IsString）を追加。主要クラスに `@ApiProperty` / `@ApiPropertyOptional` デコレータを追加済み
- - `src/links/controller/` — REST endpoints (`GET /links`, `POST /links`, `PATCH /links/:id`, `DELETE /links/:id`) — JwtAuthGuard適用済み。`GET /links` は `req.user.username` をサービスに渡してログインユーザーのリンクのみ取得する
- `src/links/service/` — リンク/フォルダのビジネスロジック。ツリー構築（Map を使ったフラット→ツリー変換）・LINK を親にできない制約チェック・作成者チェック。`findAll(username)` はユーザー名をリポジトリに伝播する
- `src/links/repository/` — Prisma CRUD（findAll/findById/create/update/delete）。order昇順・created_at昇順でソート。`findAll(username)` は `where: { created_by: username }` でログインユーザーのリンク/フォルダのみ返す
- `src/links/dto/link.dto.ts` — CreateLinkItemDto / UpdateLinkItemDto / LinkItemResponseDto（children: LinkItemResponseDto[]）/ LinkItemType型（"FOLDER" | "LINK"）
- `src/chat/controller/` — REST endpoints (`GET /chat/contacts`, `GET /chat/users`, `GET /chat/messages?with=<username>`, `POST /chat/messages`) — JwtAuthGuard適用済み。`GET /chat/contacts` はやり取り済み相手一覧、`GET /chat/users` は全ユーザー一覧（自分を除く）、`GET /chat/messages` は2ユーザー間のメッセージ一覧、`POST /chat/messages` はメッセージ送信
- `src/chat/service/` — チャットのビジネスロジック（`chat.service.ts`）。`findConversation`（2ユーザー間メッセージ取得）・`sendMessage`（メッセージ送信）・`findContacts`（やり取り済み相手取得）・`findAllUsers`（全ユーザー取得、自分を除く）
- `src/chat/repository/` — Prisma CRUD（`findConversation`: OR条件で双方向メッセージ取得・`create`: メッセージ保存・`findContacts`: sent+received を Union して重複排除）
- `src/chat/dto/chat.dto.ts` — CreateChatMessageDto（to_user・content）/ ChatMessageResponseDto / ChatContactResponseDto
- `src/chat/chat.module.ts` — チャットモジュール。REST API（ChatController）のみを提供する。WebSocket Gateway は使用しない。AccountsModule をインポートして AccountRepository を DI で利用
- `src/jwt/jwt.service.ts` — JWT creation (1h expiry, secret from `JWT_SECRET` env)
- `src/jwt/jwt-auth.guard.ts` — JwtAuthGuard（Bearerトークン検証）。検証成功時に `request.user` へ `JwtPayload` をセット
- `src/types/express.d.ts` — Express `Request` 型拡張（`request.user?: JwtPayload`）
- `src/prisma/prisma.service.ts` — Prisma client singleton
- `src/common/service/hash.service.ts` — bcrypt（rounds=10）によるパスワードハッシュ化。`createHash(value)` → bcrypt ハッシュ（async）、`compareHash(value, hashed)` → bcrypt 照合（async）、`isLegacySha256(value, hashed)` → SHA-256 フォールバック照合（sync、移行期間用）
- `src/common/service/logger.service.ts` — ロガーサービス
- `src/common/type/message.ts` — Japanese message constants (centralised)。`AUTH`（LINE OAuth関連含む）・`NOTIFICATION`（通知CRUD・LINE送信失敗）・`LINK`（リンク集CRUD・権限エラー）・`CHAT`（チャット送受信・ユーザー取得）セクションを含む
- `src/common/type/status.enum.ts` — HTTP status enums
- `src/main.ts` — Swagger（OpenAPI）ドキュメントを `/api/docs` で提供する。`DocumentBuilder` で JWT Bearer 認証を設定し `SwaggerModule.setup()` で公開する

`AppModule` imports `ScheduleModule.forRoot()`（Cronジョブ有効化）・`ThrottlerModule.forRoot([{ ttl: 60000, limit: 20 }])`（レートリミット: デフォルト1分20回）・`CommonModule`・`AccountsModule`・`TaskModule`・`EventsModule`・`LinkModule`・`ChatModule`。`LineNotificationService` は `AppModule` の providers に登録し、`TaskModule` エクスポートの `TaskNotificationRepository` と `CommonModule` エクスポートの `LoggerService` を DI で受け取る。`APP_GUARD` として `ThrottlerGuard` をグローバル適用する。`AccountsModule` は `AccountRepository` をエクスポートして `ChatModule` からの DI を可能にする。

**Login flow**: DTO validation → bcrypt compare（bcrypt ハッシュと照合）→ 失敗時は SHA-256 フォールバック（移行ロジック）→ SHA-256 一致時は bcrypt 再ハッシュして DB 更新 → issue JWT.

**Task flow**: JwtAuthGuard → Controller（`req.user.username` 抽出）→ Service → Repository（`username` でフィルタリング）→ Prisma。

**LINE OAuth flow**: `GET /accounts/line/login`（JwtAuthGuard適用）→ LINE認証画面へリダイレクト → LINE から `GET /accounts/line/callback?code=...`（JwtAuthGuard適用）→ コード→トークン交換（axios POST）→ LINE Profile API でUser ID取得（axios GET）→ Account に `line_user_id` を保存 → フロントエンドの `/line-callback?status=success|error` へリダイレクト。

**LINE通知フロー**: Cron毎分 → `findPendingNotifications`（is_sent=false かつ notify_at <= 現在時刻）→ 担当者ごとに line_user_id を確認 → LINE Messaging API push → `markAsSent`。

**リンク集フロー**: JwtAuthGuard → Controller（`req.user.username` 抽出）→ Service（`username` を伝播）→ Repository（`created_by = username` でフィルタリング）→ Prisma。LINK タイプは子を持てない末端要素。FOLDER タイプのみ children を持つ。削除は作成者のみ可能。FOLDER 削除時は Cascade で配下の全子孫も削除される。

**カレンダー予定フロー**: JwtAuthGuard → Controller（`GET /events` では `req.user.username` 抽出）→ Service → Repository（`findAll` は `created_by = username` でフィルタリング）→ Prisma。単件作成（`POST /events`）・複数日付一括作成（`POST /events/multiple`）・繰り返し一括作成（`POST /events/repeat`）の3パターンをサポート。複数・繰り返しは Service 内で日付展開後に `$transaction` で一括 INSERT。更新・削除は作成者のみ可能。繰り返しグループ全件更新（`PATCH /events/repeat-group/:groupId`）は `start_diff_ms`/`end_diff_ms` で全件の日時をシフトする。予定には `color` フィールドがあり、作成・更新時に色識別子（cyan/indigo/emerald/violet/rose/amber）を指定できる。未指定時は `cyan`。

**チャットフロー**: 全通信は REST API で行う。メッセージ送信は `POST /chat/messages`（REST）。メッセージ一覧は `GET /chat/messages` を3秒ごとにポーリングして自動更新する。`GET /chat/users` で全ユーザー一覧を取得してチャット相手を選択する。WebSocket（Socket.io）は使用しない。

### Frontend (React + CRA)

- `src/App.tsx` — router: `/` → `HomePage`（タスク一覧へリダイレクト）, `/login` → `LoginPage`, `/tasks` → `TaskListPage`, `/tasks/new` → `TaskFormPage`, `/calendar` → `CalendarPage`, `/links` → `LinkListPage`, `/chat` → `ChatPage`, `/line-callback` → `LineCallbackPage`（PrivateRoute外・LINE OAuthコールバック用）
- `src/components/PrivateRoute.tsx` — JWT存在チェック + exp有効期限検証。無効時は`/login`へリダイレクト
- `src/components/Sidebar.tsx` — サイドバーコンポーネント（タスク管理・カレンダー・リンク集・チャットリンク・ログアウト・LINE連携状態表示）。NAV_LINKSに `/tasks`・`/calendar`・`/links`・`/chat` を定義。`isOpen: boolean` プロパティを受け取り、`isOpen=false` のとき PC では `sm:w-0 overflow-hidden` で非表示になる（モバイルは常に表示）
- `src/components/SidebarLayout.tsx` — サイドバー付きレイアウト（Outlet使用）。`isSidebarOpen` ステートを管理し、PCのみ表示されるトグルボタン（`◀`/`▶`）でサイドバーの開閉ができる。ボタンは `fixed top-1/2` で画面縦中央に固定し、`left` をサイドバー幅（240px）に連動させる。外側 div は `h-screen overflow-hidden` でブラウザウィンドウの縦スクロールバーを出さない。`main` は `flex-1 h-full overflow-y-auto` で各ページのコンテンツスクロールを担う
- `src/pages/LoginPage.tsx` — login form, posts to backend `/accounts/login`, stores JWT in `localStorage`
- `src/pages/LineCallbackPage.tsx` — LINE OAuth完了後のコールバックページ。クエリパラメータ `status=success` で成功メッセージ＋カウントダウン後タスク一覧へ遷移。`status=error` でエラーメッセージ＋戻るボタン。PrivateRoute外に配置（LINE OAuthから直接リダイレクトされるため）
- `src/pages/TaskListPage.tsx` — タスク一覧・階層表示・カテゴリフィルター・削除確認モーダル・完了セクション折りたたみ。削除は作成者のみ表示・編集は全ユーザー表示。「詳細」ボタン押下時に `awaitToggle` で完了 PATCH の完了を待機してから右側のサイドパネル（`TaskDetailPanel`）を開く（ページ遷移なし・URL変更なし）。パネル表示中は flex 左右分割（左: 一覧、右: 詳細パネル）。スマホ（640px未満）ではパネル開時に一覧を非表示にしてパネルを全画面表示する。`handleDeleteNotification` で通知削除 API を呼び出して `reload()` し `TaskDetailPanel` に `onDeleteNotification` として渡す
- `src/pages/TaskFormPage.tsx` — タスク作成・編集・子タスク作成（URLクエリ`parent_id`で切り替え）。通知日時を複数追加できる UI を提供（`DateTimeField` + 追加ボタン + 削除ボタン付きリスト）
- `src/pages/TaskDetailPage.tsx` — タスク詳細・完了/未完了ボタン・完了スタイル（緑枠・バナー・取り消し線）・`closed_by`表示・子タスク一覧・子タスク作成ボタン。編集ボタンは全ユーザーに表示。直リンク（`/tasks/:id`）対応のため引き続き存在する
- `src/pages/LinkListPage.tsx` — リンク集一覧ページ。エクスプローラー風ツリー表示。`LinkTreeNode` コンポーネントで再帰レンダリング。フォルダクリックで展開/折りたたみ。リンククリックで別タブを開く。追加ボタンで `LinkFormModal` を開く。削除は作成者のみ表示。フォルダ削除時に「配下の全リンク・フォルダも削除されます」という警告を表示する
- `src/pages/ChatPage.tsx` — チャット画面。左ペイン: ユーザーリスト（最近の会話 + 未会話ユーザー）、右ペイン: メッセージ一覧（自分のメッセージは右寄せ・空色バブル、相手は左寄せ・slate バブル）+ 入力欄。Enter で送信・Shift+Enter で改行。メッセージ更新時に末尾へ自動スクロール
- `src/api/taskApi.ts` — タスクAPI通信（`fetchTasks`, `fetchTask`, `fetchCategories`, `createTask`, `updateTask`, `toggleTaskCompletion`, `deleteTask`, `getCurrentUsername`, `fetchNotifications`, `addNotification`, `deleteNotification`, `fetchMe`）。`TaskNotification` インターフェース・`AccountMe` インターフェース・`Task.notifications?: TaskNotification[]` フィールドを含む
- `src/api/eventApi.ts` — カレンダー予定API通信（`fetchEvents`, `createEvent`, `createMultipleEvents`, `createRepeatEvent`, `updateEvent`, `updateRepeatGroupEvent`, `deleteEvent`）。`CalendarEvent`（repeat_group_id・color含む）・`EventInput`（color?含む）・`MultipleEventInput`（end_times配列・color?含む）・`RepeatEventInput`（end_at・color?含む）・`UpdateRepeatGroupInput`（color?含む）・`RepeatRule`・`RepeatType` インターフェースを定義
- - `src/api/linkApi.ts` — リンク集API通信（`fetchLinks`, `createLink`, `updateLink`, `deleteLink`）。`LinkItem` インターフェース（children: LinkItem[] を含む再帰型）・`LinkItemInput` インターフェース・`LinkItemType`（"FOLDER" | "LINK"）を定義
- `src/api/chatApi.ts` — チャットAPI通信（`fetchContacts`, `fetchAllUsers`, `fetchMessages`, `sendMessage`）。`ChatMessage`・`ChatContact` インターフェースを定義。全通信は REST API で行う
- `src/hooks/useTaskList.ts` — タスク一覧・削除・カテゴリフィルタリング・階層ツリー構築（incompleteTrees/completedTrees）フック。`togglingIds`（PATCH処理中のタスクID集合）と `awaitToggle`（PATCH完了を外から待てる関数）を提供する
- `src/hooks/useTaskDetail.ts` — タスク詳細取得・完了切り替えフック
- `src/hooks/useTaskForm.ts` — タスクフォーム（作成/編集/子タスク作成モード対応）フック。`notifications: string[]`（datetime-local形式）状態を管理し、`addNotificationDatetime`・`removeNotificationDatetime` を提供。フォーム送信後に通知日時を `addNotification` API へ順次送信する。編集モード時は既存通知を datetime-local 形式に変換して初期値として読み込む。作成・編集・子タスク作成のいずれの場合も送信後は `/tasks` へ遷移する
- `src/hooks/useLinkList.ts` — リンク集一覧取得・フォルダ展開/折りたたみ状態管理（expandedIds: Set<number>）・削除処理・リロードを提供するフック
- `src/hooks/useLinkForm.ts` — リンク/フォルダ作成・編集フォームを管理するフック。editItem 指定で編集モード。type が FOLDER に変更されたら url をクリアする
- `src/hooks/useCalendar.ts` — カレンダー予定・タスク表示・ビュー切り替えを管理するフック。タスクのカレンダー表示は日表示（timeGridDay）のみ。`taskToEventInput` でタスクをFullCalendar用EventInputに変換する際、`start = due_date - 1時間`・`end = due_date` に設定し、期限がイベントの終了時刻になるようにする。`handleCreateMultipleEvents`（複数日付一括作成）・`handleCreateRepeatEvent`（繰り返し一括作成）を提供し、作成後はローカルステートに全件追加する。`handleUpdateRepeatGroupEvent`（繰り返しグループ全件更新）を提供し、更新後は Set で更新済み ID を特定しローカルステートを置換する。`EVENT_COLOR_MAP`（色識別子→bg/text色マップ）と `resolveEventColor` で `calendarEventToEventInput` の背景色・テキスト色を一元管理する
- `src/hooks/useChat.ts` — チャット機能を管理するカスタムフック。3秒ポーリングによるメッセージ自動更新・メッセージ送信（REST API）・連絡先一覧（REST API）を管理する。`pollingTimerRef` でポーリングタイマーを保持し、`selectedUserRef` でポーリングコールバック内のクロージャ問題を回避する。選択ユーザー変更時にポーリングを再起動し、コンポーネントアンマウント時に `clearInterval` で停止する
- `src/hooks/useIsMobile.ts` — 画面幅が640px未満かどうかをリアクティブに返すカスタムフック。`window.resize` イベントで追従する
- `src/validation/taskValidation.ts` — タスクフォームバリデーション（priority/category含む）。担当者は1人以上必須
- `src/validation/linkValidation.ts` — リンク/フォルダフォームバリデーション。title必須。type="LINK" の場合は url も必須
- `src/components/ConfirmModal.tsx` — 削除確認モーダル
- `src/components/TaskDetailPanel.tsx` — タスク詳細サイドパネル。`task: Task | null` / `isToggling` / `isOwner` / `isMobile` / `onClose` / `onToggleComplete` / `onSelectTask` / `onDeleteClick` / `onUpdate` / `onDeleteNotification` を受け取り、タスクデータを props で表示する（独自 API 呼び出しなし）。スマホ時（`isMobile=true`）は「← 一覧へ戻る」ボタンを表示し PC 向け × ボタンを非表示にする。子タスク・親タスクのリンクは `onSelectTask` 経由でパネル内切り替え（ページ遷移なし）。通知一覧を表示し `onDeleteNotification` コールバックで削除を親に委譲する
- `src/components/LinkFormModal.tsx` — リンク/フォルダ作成・編集フォームモーダル。タイプ選択（編集時は変更不可）・タイトル・URL（LINK タイプのみ）・説明・親フォルダ選択（FOLDER タイプのみ表示）。自分自身と子孫は親フォルダ候補から除外する
- `src/components/TextAreaField.tsx` — textareaラッパー共通コンポーネント
- `src/components/DateTimeField.tsx` — datetime-local入力ラッパー共通コンポーネント
- `src/components/SelectField.tsx` — selectラッパー共通コンポーネント
- `src/components/EventModal.tsx` — 予定作成・編集モーダル。新規作成時は「通常」「複数日付」「繰り返し」の3モードをタブで切り替えられる。編集時は通常フォームのみ表示。繰り返しグループ予定の編集時は「この予定のみ変更」「繰り返し予定を全て変更」のスコープ選択ラジオボタンを表示する。`onSave` コールバックは `(input: EventInput, updateScope: UpdateScope) => Promise<void>` シグネチャ。複数日付モードは `DateTimeField` の開始・終了ペアをリストで追加・削除可能（`start_times`/`end_times` を同期して管理）。繰り返しモードは最初の開始日時・終了日時・繰り返しタイプ（毎日/毎週/毎月）・間隔・曜日（毎週のみ）・終了条件（終了日 or 回数）を設定可能。全 3 モードに `ColorPicker` コンポーネントを配置し、6色（cyan/indigo/emerald/violet/rose/amber）からカラー選択できる。`EVENT_COLORS` 定数をエクスポートして色定義を一元管理する
- `src/validation/eventValidation.ts` — カレンダー予定フォームのバリデーション。`validateEventForm`（通常）・`validateMultipleEventForm`（複数日付: 各ペアで end_time > start_time を検証）・`validateRepeatEventForm`（繰り返し: end_at > start_at を検証）の3種類を提供。`MultipleEventFormValues` は `start_times`/`end_times` 配列、`RepeatEventFormValues` は `end_at` を持つ。全フォーム値型に `color: string` フィールドを含む
- - `src/components/CancelButton.tsx` — キャンセルボタン共通コンポーネント

API base URL is built from env vars: `REACT_APP_API_SCHEME`, `REACT_APP_API_HOST`, `REACT_APP_API_PORT`.

### Database

SQLite（開発環境）。接続URLは `backend/prisma.config.ts` で管理。`JWT_SECRET` は `backend/.env`。

Prisma config file: `backend/prisma.config.ts` (uses dotenv, loads `prisma/schema.prisma`).

**Environment variables (`backend/.env`):**
- `JWT_SECRET` — JWT署名シークレット
- `LINE_LOGIN_CHANNEL_ID` — LINE Login チャネルID（Channel ID: 2009970360）
- `LINE_LOGIN_CHANNEL_SECRET` — LINE Login チャネルシークレット
- `LINE_MESSAGING_CHANNEL_ID` — LINE Messaging API チャネルID（Channel ID: 2009970288）
- `LINE_MESSAGING_CHANNEL_SECRET` — LINE Messaging API チャネルシークレット
- `LINE_MESSAGING_CHANNEL_ACCESS_TOKEN` — LINE Messaging API チャネルアクセストークン
- `FRONTEND_URL` — フロントエンドのベースURL（例: `http://localhost:3000`）。LINE OAuthコールバック後のリダイレクト先構築に使用

**Schema:**

```prisma
model Account {
  username          String         @id
  hashed_password   String
  line_user_id      String?
  task_assignees    TaskAssignee[]
  created_tasks     Task[]         @relation("TaskCreator")
  created_events    Event[]        @relation("EventCreator")
  created_links     LinkItem[]     @relation("LinkCreator")
  sent_messages     ChatMessage[]  @relation("ChatSender")
  received_messages ChatMessage[]  @relation("ChatReceiver")
}

model Task {
  id            Int                @id @default(autoincrement())
  title         String
  description   String
  due_date      DateTime
  priority      String             @default("MEDIUM")  // HIGH / MEDIUM / LOW
  category      String?
  parent_id     Int?
  created_by    String
  created_at    DateTime           @default(now())
  updated_at    DateTime           @updatedAt
  is_completed  Boolean            @default(false)
  closed_by     String?
  assignees     TaskAssignee[]
  notifications TaskNotification[]
  creator       Account            @relation("TaskCreator", fields: [created_by], references: [username])
  parent        Task?              @relation("TaskChildren", fields: [parent_id], references: [id])
  children      Task[]             @relation("TaskChildren")

  @@index([created_by])
  @@index([parent_id])
  @@index([due_date])
}

model TaskAssignee {
  task_id  Int
  username String
  task     Task    @relation(fields: [task_id], references: [id], onDelete: Cascade)
  account  Account @relation(fields: [username], references: [username], onDelete: Cascade)

  @@id([task_id, username])
  @@index([username])
}

model TaskNotification {
  id        Int      @id @default(autoincrement())
  task_id   Int
  notify_at DateTime
  is_sent   Boolean  @default(false)
  task      Task     @relation(fields: [task_id], references: [id], onDelete: Cascade)
}

model Event {
  id              Int      @id @default(autoincrement())
  title           String
  description     String   @default("")
  start_at        DateTime
  end_at          DateTime
  color           String   @default("cyan")  // 予定の色識別子（cyan/indigo/emerald/violet/rose/amber）
  repeat_group_id String?             // 繰り返しグループID（UUID）。繰り返し作成時に同一グループで共有
  created_by      String
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt
  creator         Account  @relation("EventCreator", fields: [created_by], references: [username])

  @@index([created_by])
  @@index([start_at])
}

model LinkItem {
  id          Int        @id @default(autoincrement())
  title       String
  url         String?                // LINK の場合のみ値あり。FOLDER は null
  description String     @default("")
  type        String                 // "FOLDER" | "LINK"
  parent_id   Int?                   // 親フォルダのID（ルート直下は null）
  order       Int        @default(0)
  created_by  String
  created_at  DateTime   @default(now())
  updated_at  DateTime   @updatedAt
  creator     Account    @relation("LinkCreator", fields: [created_by], references: [username])
  parent      LinkItem?  @relation("LinkChildren", fields: [parent_id], references: [id], onDelete: Cascade)
  children    LinkItem[] @relation("LinkChildren")

  @@index([created_by])
  @@index([parent_id])
}

model ChatMessage {
  id         Int      @id @default(autoincrement())
  from_user  String
  to_user    String
  content    String
  created_at DateTime @default(now())
  sender     Account  @relation("ChatSender",   fields: [from_user], references: [username])
  receiver   Account  @relation("ChatReceiver", fields: [to_user],   references: [username])

  @@index([from_user])
  @@index([to_user])
  @@index([created_at])
}
```

## 開発規約

詳細な開発規約は **[.claude/guidelines/conventions.md](.claude/guidelines/conventions.md)** を参照すること。
コードを生成・修正する前に必ずこのファイルを読み込んで規約に従うこと。

### 規約の自動更新ルール

以下のタイミングで `.claude/guidelines/conventions.md` を即座に更新すること:

**会話中の直接指摘**
- 生成したコードに対して「こうしてほしい」「こうするべき」と指摘した場合
- 「〜は使わないで」「〜にして」などのスタイル・設計の修正をした場合
- 採用したアプローチを承認した場合（暗黙のルールとして追記）
- 提案したアプローチをユーザーが承認しなかった場合（「やめておく」「このままでいい」「不要」など）→ そのアプローチを採用しない旨を追記

**エージェントの承認フェーズ（orchestrator-agent が担当）**
- 各ステップの承認ゲートでユーザーが承認せず修正を要求した場合、orchestrator-agent が却下内容（何を・なぜ変えるか）を規約として追記する
- 対象ステップ: 実装計画・実装コード・テスト結果・ソースレビュー・設計書更新

更新時は該当する規約セクションに追記・修正し、ユーザーに「規約を更新しました」と伝えること。

## Key Conventions

- Password hashing uses **bcrypt (rounds=10)**. SHA-256 is used only as a legacy fallback during login migration (auto-rehash to bcrypt on successful SHA-256 login)
- Backend ESLint disables `no-explicit-any`; warns on `no-floating-promises` and `no-unsafe-argument`
- Prettier: single quotes, trailing commas
- Backend `tsconfig.json`: `noImplicitAny: false`, module resolution `nodenext`
- Rate limiting: `ThrottlerModule` global guard (1分20回). Login/regist endpoints: 1分5回
- Swagger: available at `GET /api/docs`
- E2E tests: `backend/test/app.e2e-spec.ts`。`ThrottlerGuard` を `overrideGuard` でモックしてテスト実行する
