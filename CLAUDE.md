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

### CI/CD (GitHub Actions)

ワークフローファイル: `.github/workflows/ci.yml`

- **トリガー**: `push`（全ブランチ）、`pull_request`（main/develop）
- **backend ジョブ**: lint → build → unit test → prisma migrate deploy → E2E test
- **frontend ジョブ**: build → test（`--watchAll=false --ci`）
- **Node.js**: 20
- E2E テスト用 env（`DATABASE_URL=file:./test.db`）は GitHub Actions の `env:` で設定。SQLite を使うためサービス不要


## Architecture

### Backend (NestJS)

Layered module structure: **Controller → Service → Repository → Prisma**.

- `src/accounts/controller/` — REST endpoints (`POST /accounts/login`, `POST /accounts/regist`, `GET /accounts/me`)。`POST /accounts/login` と `POST /accounts/regist` には `@Throttle({ default: { ttl: 60000, limit: 5 } })` で1分5回のレートリミットを適用する
- `src/accounts/service/` — business logic（ログイン・登録・ログインユーザー情報取得）。`login()` は bcrypt でパスワードを照合し、一致した場合に JWT を発行する
- `src/accounts/repository/` — Prisma queries（`findAll()` で全ユーザー一覧取得）
- `src/accounts/dto/account.dto.ts` — validation DTOs (class-validator)。`AccountMeResponseDto`（usernameのみ）を定義
- `src/tasks/controller/` — REST endpoints (`GET /tasks`, `GET /tasks/categories`, `GET /tasks/:id`, `POST /tasks`, `PATCH /tasks/:id`, `DELETE /tasks/:id`, `GET /tasks/:id/permissions`, `POST /tasks/:id/permissions`, `DELETE /tasks/:id/permissions/:username`) — JwtAuthGuard適用済み。`GET /tasks` と `GET /tasks/categories` は `req.user.username` をサービスに渡してログインユーザーのタスクのみ取得する。`POST /tasks` は `req.user.username` をサービスに渡して `created_by` をサーバー側でセット（リクエストボディでの指定は不可）。`GET :id` / `PATCH :id` / `DELETE :id` は `@CheckOwnership('task')` + `OwnershipGuard` で作成者・担当者・WRITE権限保持者のみ許可する
- `src/tasks/service/` — タスクのビジネスロジック（`task.service.ts`）・バッチ更新処理（`task-queue.service.ts`: 100msウィンドウ内のリクエストをバッファリングして順次処理）・権限CRUD（`task-permission.service.ts`: 作成者のみ操作可能）。`findAll(username)` / `findAllCategories(username)` はユーザー名をリポジトリに伝播する。`create(dto, createdBy)` は `createdBy` 引数でサーバー側から作成者を設定する
- `src/tasks/repository/` — Prisma CRUD・カテゴリ取得（is_completed・closed_by フィールド対応）。`task-permission.repository.ts` で権限の findAll/findOne/upsert/delete を提供（upsert は権限付与と上書きを兼ねる）。`findAll(username)` は `created_by = username` OR `assignees に username が含まれる` OR `permissions に username が含まれる` の3条件でフィルタリングする。`findAllCategories(username)` も同様の OR 条件でユーザーのタスクに紐付くカテゴリのみ返す
- `src/tasks/dto/task.dto.ts` — CreateTaskDto（`created_by` フィールドなし。サーバー側で JWT から設定） / UpdateTaskDto（is_completed含む） / TaskResponseDto（is_completed・closed_by含む） / Priority型。主要クラスに `@ApiProperty` / `@ApiPropertyOptional` デコレータを追加済み
- `src/events/controller/` — REST endpoints (`GET /events`, `GET /events/proxy-grants/granters`, `GET /events/proxy-grants/grantees`, `POST /events/proxy-grants`, `DELETE /events/proxy-grants/:granteeUsername`, `GET /events/:id`, `POST /events`, `POST /events/multiple`, `POST /events/repeat`, `PATCH /events/repeat-group/:groupId`, `PATCH /events/:id`, `DELETE /events/:id`, `GET /events/:id/permissions`, `POST /events/:id/permissions`, `DELETE /events/:id/permissions/:username`) — JwtAuthGuard適用済み。固定パスルートはすべて `:id` ルートより前に定義する。`GET /events` は `req.user.username` をサービスに渡してログインユーザーの予定（作成者 or 権限付与済み）のみ取得する。`GET :id` / `PATCH :id` / `DELETE :id` は `@CheckOwnership('event')` + `OwnershipGuard` で認可チェックを行う（GET は READ/WRITE 権限で許可、PATCH/DELETE は作成者 or WRITE 権限で許可）。`POST /events` の `created_by` フィールドで代理登録可能（EventProxyGrant 権限チェックをサービス層で実施）。`/events/:id/permissions` は作成者のみ実行可能
- `src/events/service/` — 予定のビジネスロジック（`event.service.ts`）・権限CRUD（`event-permission.service.ts`: 作成者のみ操作可能）・代理登録権限CRUD（`event-proxy-grant.service.ts`: `ProxyGrantResponseDto` インターフェースを定義・export）。`event.service.ts` は単件作成（`create`）・複数日付一括作成（`createMultiple`）・繰り返し一括作成（`createRepeat`）・単件更新（`update(id, dto)`）・繰り返しグループ全件更新（`updateRepeatGroup`）・削除（`remove(id)`）を提供。代理登録の created_by 解決は `resolveCreatedBy(dtoCreatedBy, requestUsername)` で `EventProxyGrant` を確認してから決定する。`update` / `remove` の認可チェックは `OwnershipGuard` が担当するためシグネチャに `requestUsername` なし。`updateRepeatGroup` はグループ全件の `created_by` を確認してから日時シフト更新する（OwnershipGuard では対処できないためサービス層でチェック）。繰り返し展開は daily/weekly/monthly の3タイプ対応。monthly は月末補正あり。最大生成件数100件制限。`createRepeat` は全件に同一 `repeat_group_id`（UUID）を付与する。全作成・更新メソッドで `color` フィールドを処理する（未指定時はデフォルト `cyan`）。`findAll(username)` はユーザー名をリポジトリに伝播する
- `src/events/repository/` — Prisma CRUD（`event.repository.ts`: findAll/findById/create/createMany/update/updateMany/delete/findByRepeatGroupId）・権限CRUD（`event-permission.repository.ts`: findAll/findOne/upsert/delete）・代理登録権限CRUD（`event-proxy-grant.repository.ts`: findAllGrantees/findAllGranters/findOne/upsert/delete）。`createMany`・`updateMany` は SQLite の制約回避のため `$transaction` + 個別操作配列で実装。`findByRepeatGroupId` は `repeat_group_id` で絞り込み `start_at` 昇順で返す。`findAll(username)` は `created_by = username` OR `permissions に username が含まれる` の OR 条件でフィルタリングし、全メソッドで `include: { permissions: true }` を付与して `EventWithPermissions` 型を返す
- `src/events/dto/event.dto.ts` — CreateEventDto（`created_by?: string` 代理登録用フィールド含む）/ CreateMultipleEventsDto / CreateRepeatEventDto / UpdateEventDto / UpdateRepeatGroupEventDto（title?・description?・start_diff_ms?・end_diff_ms?・color? のオプション項目）/ CreateProxyGrantDto（grantee_username）/ EventPermissionResponseDto（username・permission）/ EventResponseDto（repeat_group_id・color・permissions? 含む）/ RepeatType enum（daily/weekly/monthly）。全 DTO に `color?: string` を追加。主要クラスに `@ApiProperty` / `@ApiPropertyOptional` デコレータを追加済み
- `src/links/controller/` — REST endpoints (`GET /links`, `POST /links`, `PATCH /links/:id`, `DELETE /links/:id`, `GET /links/:id/permissions`, `POST /links/:id/permissions`, `DELETE /links/:id/permissions/:username`) — JwtAuthGuard適用済み。`GET /links` は `req.user.username` をサービスに渡してログインユーザーのリンクのみ取得する。`PATCH :id` / `DELETE :id` は `@CheckOwnership('link')` + `OwnershipGuard` で作成者・WRITE権限保持者のみ許可する
- `src/links/service/` — リンク/フォルダのビジネスロジック（`link.service.ts`）・権限CRUD（`link-permission.service.ts`: 作成者のみ操作可能）。ツリー構築（Map を使ったフラット→ツリー変換）・LINK を親にできない制約チェック。更新・削除の認可チェックは `OwnershipGuard` が担当する。`findAll(username)` はユーザー名をリポジトリに伝播する
- `src/links/repository/` — Prisma CRUD（findAll/findById/create/update/delete）。order昇順・created_at昇順でソート。`link-permission.repository.ts` で権限の findAll/findOne/upsert/delete を提供。`findAll(username)` は `created_by = username` OR `permissions に username が含まれる` の2条件でフィルタリングする
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
- `src/common/service/hash.service.ts` — bcrypt（rounds=10）によるパスワードハッシュ化。`createHash(value)` → bcrypt ハッシュ（async）、`compareHash(value, hashed)` → bcrypt 照合（async）
- `src/common/service/logger.service.ts` — ロガーサービス
- `src/common/type/message.ts` — Japanese message constants (centralised)。`AUTH`・`LINK`（リンク集CRUD・権限エラー）・`CHAT`（チャット送受信・ユーザー取得）・`PERMISSION`（権限CRUD・作成者のみ・未存在エラー）・`EVENT`（予定CRUD・権限・代理登録権限メッセージ）・`TASK`（タスクCRUD）セクションを含む
- `src/common/type/status.enum.ts` — HTTP status enums
- `src/common/decorators/check-ownership.decorator.ts` — `@CheckOwnership(resource)` デコレータ。`OwnershipResourceType`（'task' | 'link' | 'event'）を SetMetadata でハンドラーに付与する
- `src/common/guards/ownership.guard.ts` — `OwnershipGuard` (`CanActivate`)。`@CheckOwnership` メタデータを読み込み、リソースタイプに応じてタスク/リンク/予定の所有者チェックを行う。タスク: 作成者 or 担当者 or WRITE権限保持者。リンク: 作成者 or WRITE権限保持者。予定: HTTPメソッドに応じて判定（GET は作成者 or EventPermission（READ/WRITE）を許可、PATCH/DELETE は作成者 or EventPermission（WRITE のみ）を許可）。未存在は 404、権限なしは 403
- `src/permissions/permission.dto.ts` — `CreatePermissionDto`（username・permission: 'READ' | 'WRITE'）/ `PermissionResponseDto` / `PermissionType`（'READ' | 'WRITE'）
- `src/main.ts` — Swagger（OpenAPI）ドキュメントを `/api/docs` で提供する。`DocumentBuilder` で JWT Bearer 認証を設定し `SwaggerModule.setup()` で公開する

`AppModule` imports `ThrottlerModule.forRoot([{ ttl: 60000, limit: 20 }])`（レートリミット: デフォルト1分20回）・`CommonModule`・`AccountsModule`・`TaskModule`・`EventsModule`・`LinkModule`・`ChatModule`。`APP_GUARD` として `ThrottlerGuard` をグローバル適用する。`AccountsModule` は `AccountRepository` をエクスポートして `ChatModule` からの DI を可能にする。

**Login flow**: DTO validation → bcrypt compare（bcrypt ハッシュと照合）→ 一致時に JWT 発行。

**Task flow**: JwtAuthGuard → Controller（`req.user.username` 抽出）→ OwnershipGuard（`GET :id` / `PATCH :id` / `DELETE :id` で認可チェック）→ Service → Repository（`username` でフィルタリング）→ Prisma。`POST /tasks` は `created_by` をリクエストボディではなく `req.user.username` からサーバー側でセットする。

**リンク集フロー**: JwtAuthGuard → Controller（`req.user.username` 抽出）→ OwnershipGuard（PATCH/DELETE 時のみ: 作成者 or WRITE権限保持者を確認）→ Service（`username` を伝播）→ Repository（`created_by = username` OR `permissions に username` でフィルタリング）→ Prisma。LINK タイプは子を持てない末端要素。FOLDER タイプのみ children を持つ。FOLDER 削除時は Cascade で配下の全子孫も削除される。権限管理（GET/POST/DELETE `/links/:id/permissions`）は作成者のみ実行可能。

**カレンダー予定フロー**: JwtAuthGuard → Controller（`GET /events` では `req.user.username` 抽出）→ OwnershipGuard（`GET :id` / `PATCH :id` / `DELETE :id` で認可チェック）→ Service → Repository（`findAll` は `created_by = username` OR `permissions に username` の OR 条件でフィルタリング）→ Prisma。単件作成（`POST /events`）・複数日付一括作成（`POST /events/multiple`）・繰り返し一括作成（`POST /events/repeat`）の3パターンをサポート。複数・繰り返しは Service 内で日付展開後に `$transaction` で一括 INSERT。`PATCH/DELETE :id` の認可チェックは `OwnershipGuard` が担当（作成者 or WRITE 権限保持者）。`PATCH /events/repeat-group/:groupId` は `updateRepeatGroup` サービス内でグループ全件の `created_by` を確認。繰り返しグループ全件更新（`PATCH /events/repeat-group/:groupId`）は `start_diff_ms`/`end_diff_ms` で全件の日時をシフトする。予定には `color` フィールドがあり、作成・更新時に色識別子（cyan/indigo/emerald/violet/rose/amber）を指定できる。未指定時は `cyan`。**代理登録**: `POST /events` の `created_by` フィールドに他ユーザー名を指定すると代理登録となる（EventProxyGrant 権限チェックをサービス層で実施）。**共有登録**: 作成後に `POST /events/:id/permissions` で権限付与することで他ユーザーのカレンダーにも表示される。

**権限管理フロー（タスク/リンク/予定共通）**: 権限付与は作成者のみ（`TaskPermissionService` / `LinkPermissionService` / `EventPermissionService` でサービス層チェック）。権限保持者はリソースの閲覧（READ）・編集（WRITE）が可能。`OwnershipGuard` は GET/PATCH/DELETE 時に作成者・担当者（タスクのみ）・WRITE権限保持者のいずれかであることを DB クエリで確認する。タスク/リンク/予定一覧取得時は `permissions` OR 条件を追加してアクセス可能なリソースをすべて返す。予定の GET :id は READ/WRITE 権限どちらでもアクセス可能（PATCH/DELETE は WRITE のみ）。

**代理登録権限フロー**: `POST /events/proxy-grants` でユーザーが自分の予定への代理登録を別ユーザーに許可する（EventProxyGrant テーブル管理）。代理登録者は `POST /events` に `created_by` を指定して他ユーザー名義の予定を作成できる（EventProxyGrantRepository.findOne で権限確認）。自分自身への代理登録許可は BadRequestException で禁止する。`GET /events/proxy-grants/granters` で自分が代理登録できるユーザー一覧、`GET /events/proxy-grants/grantees` で自分が許可したユーザー一覧を取得できる。

**チャットフロー**: 全通信は REST API で行う。メッセージ送信は `POST /chat/messages`（REST）。メッセージ一覧は `GET /chat/messages` を3秒ごとにポーリングして自動更新する。`GET /chat/users` で全ユーザー一覧を取得してチャット相手を選択する。WebSocket（Socket.io）は使用しない。

### Frontend (React + CRA)

- `src/App.tsx` — router: `/` → `HomePage`（タスク一覧へリダイレクト）, `/login` → `LoginPage`, `/tasks` → `TaskListPage`, `/tasks/new` → `TaskFormPage`, `/calendar` → `CalendarPage`, `/links` → `LinkListPage`, `/chat` → `ChatPage`
- `src/components/PrivateRoute.tsx` — JWT存在チェック + exp有効期限検証。無効時は`/login`へリダイレクト
- `src/components/Sidebar.tsx` — サイドバーコンポーネント（タスク管理・カレンダー・リンク集・チャットリンク・ログアウト）。NAV_LINKSに `/tasks`・`/calendar`・`/links`・`/chat` を定義。`isOpen: boolean` と `onToggle: () => void` プロパティを受け取る。`isOpen=false` のとき PC ではコンテンツを `sm:hidden` で非表示にし、サイドバー幅を `sm:w-8` に縮小してトグルボタンのみ見えるようにする（モバイルは常に全幅表示）。トグルボタンはサイドバー上部に `hidden sm:flex` で PC のみ表示
- `src/components/SidebarLayout.tsx` — サイドバー付きレイアウト（Outlet使用）。`isSidebarOpen` ステートを管理し、`onToggle` コールバックを `Sidebar` に渡す。トグルボタンは `Sidebar` 内部に配置するため `fixed` 位置のボタンは持たない。外側 div は `h-screen overflow-hidden` でブラウザウィンドウの縦スクロールバーを出さない。`main` は `flex-1 h-full overflow-y-auto` で各ページのコンテンツスクロールを担う
- `src/pages/LoginPage.tsx` — login form, posts to backend `/accounts/login`, stores JWT in `localStorage`
- `src/pages/TaskListPage.tsx` — タスク一覧・階層表示・カテゴリフィルター・削除確認モーダル・完了セクション折りたたみ。削除は作成者のみ表示・編集は全ユーザー表示。「詳細」ボタン押下時に `awaitToggle` で完了 PATCH の完了を待機してから右側のサイドパネル（`TaskDetailPanel`）を開く（ページ遷移なし・URL変更なし）。パネル表示中は flex 左右分割（左: 一覧、右: 詳細パネル）。スマホ（640px未満）ではパネル開時に一覧を非表示にしてパネルを全画面表示する
- `src/pages/TaskFormPage.tsx` — タスク作成・編集・子タスク作成（URLクエリ`parent_id`で切り替え）。担当者は `GET /chat/users` + ログインユーザー自身で構築したユーザー一覧セレクトから選択する形式（複数追加可・バッジ表示・× で削除）
- `src/pages/TaskDetailPage.tsx` — タスク詳細・完了/未完了ボタン・完了スタイル（緑枠・バナー・取り消し線）・`closed_by`表示・子タスク一覧・子タスク作成ボタン。編集ボタンは全ユーザーに表示。直リンク（`/tasks/:id`）対応のため引き続き存在する
- `src/pages/LinkListPage.tsx` — リンク集一覧ページ。エクスプローラー風ツリー表示。`LinkTreeNode` コンポーネントで再帰レンダリング。フォルダクリックで展開/折りたたみ。リンククリックで別タブを開く。追加ボタンで `LinkFormModal` を開く。削除は作成者のみ表示。フォルダ削除時に「配下の全リンク・フォルダも削除されます」という警告を表示する。作成者のみ「共有」ボタンを表示し、クリックで `fetchLinkPermissions` を呼び出して `PermissionModal` を開く（`ModalMode` に `permission` タイプを追加）
- `src/pages/CalendarPage.tsx` — カレンダーページ。FullCalendarを使用して予定の表示・作成・編集・削除を提供する。新規作成時は「通常」「複数日付」「繰り返し」の3モードを選択できる。繰り返しグループ予定の編集時は「この予定のみ」「繰り返し全て」の選択ができる。日表示のみタスクを表示し、マウスオーバーでタスク詳細をツールチップ表示する。作成者のみ「共有設定」ボタンで `PermissionModal` を開ける（予定の権限管理）。「代理登録設定」ボタンで `ProxyGrantModal` を開ける（代理登録権限管理）
- `src/pages/ChatPage.tsx` — チャット画面。左ペイン: ユーザーリスト（最近の会話 + 未会話ユーザー）、右ペイン: メッセージ一覧（自分のメッセージは右寄せ・空色バブル、相手は左寄せ・slate バブル）+ 入力欄。Enter で送信・Shift+Enter で改行。メッセージ更新時に末尾へ自動スクロール
- `src/api/taskApi.ts` — タスクAPI通信（`fetchTasks`, `fetchTask`, `fetchCategories`, `createTask`, `updateTask`, `toggleTaskCompletion`, `deleteTask`, `getCurrentUsername`）。`Task` インターフェースを定義
- `src/api/eventApi.ts` — カレンダー予定API通信（`fetchEvents`, `createEvent`, `createMultipleEvents`, `createRepeatEvent`, `updateEvent`, `updateRepeatGroupEvent`, `deleteEvent`, `fetchEventPermissions`, `addEventPermission`, `deleteEventPermission`, `fetchProxyGrantees`, `fetchProxyGranters`, `addProxyGrant`, `deleteProxyGrant`）。`CalendarEvent`（repeat_group_id・color・permissions?含む）・`EventInput`（color?・created_by?含む）・`MultipleEventInput`・`RepeatEventInput`・`UpdateRepeatGroupInput`・`RepeatRule`・`RepeatType`・`EventPermission`・`EventPermissionInput`・`ProxyGrantUser` インターフェースを定義
- `src/api/linkApi.ts` — リンク集API通信（`fetchLinks`, `createLink`, `updateLink`, `deleteLink`）。`LinkItem` インターフェース（children: LinkItem[] を含む再帰型）・`LinkItemInput` インターフェース・`LinkItemType`（"FOLDER" | "LINK"）を定義
- `src/api/permissionApi.ts` — 権限API通信。タスク用（`fetchTaskPermissions`, `addTaskPermission`, `deleteTaskPermission`）・リンク用（`fetchLinkPermissions`, `addLinkPermission`, `deleteLinkPermission`）・予定用（`fetchEventPermissions`, `addEventPermission`, `deleteEventPermission`）を提供。`Permission`・`PermissionType`・`PermissionInput` インターフェースを定義
- `src/api/chatApi.ts` — チャットAPI通信（`fetchContacts`, `fetchAllUsers`, `fetchMessages`, `sendMessage`）。`ChatMessage`・`ChatContact` インターフェースを定義。全通信は REST API で行う
- `src/hooks/useTaskList.ts` — タスク一覧・削除・カテゴリフィルタリング・階層ツリー構築（incompleteTrees/completedTrees）フック。`togglingIds`（PATCH処理中のタスクID集合）と `awaitToggle`（PATCH完了を外から待てる関数）を提供する
- `src/hooks/useTaskDetail.ts` — タスク詳細取得・完了切り替えフック
- `src/hooks/useTaskForm.ts` — タスクフォーム（作成/編集/子タスク作成モード対応）フック。担当者は `fetchAllUsers` + `getCurrentUsername` で全ユーザー一覧（自分含む）を取得し `availableUsers` として提供。`addAssignee(username)`・`removeAssignee(index)` で配列管理。作成・編集・子タスク作成のいずれの場合も送信後は `/tasks` へ遷移する。`created_by` はサーバー側で JWT から設定するため送信しない
- `src/hooks/useLinkList.ts` — リンク集一覧取得・フォルダ展開/折りたたみ状態管理（expandedIds: Set<number>）・削除処理・リロードを提供するフック
- `src/hooks/useLinkForm.ts` — リンク/フォルダ作成・編集フォームを管理するフック。editItem 指定で編集モード。type が FOLDER に変更されたら url をクリアする
- `src/hooks/useCalendar.ts` — カレンダー予定・タスク表示・ビュー切り替えを管理するフック。`CreateEventOptions`（`proxyUsername?`・`sharePermissions?`）インターフェースを定義し、`handleCreateEvent`/`handleCreateMultipleEvents`/`handleCreateRepeatEvent` の第2引数として渡す。代理登録時は `created_by` を payload に追加し、共有登録時は作成後に `applySharePermissions` で EventPermission を付与する。タスクのカレンダー表示は日表示（timeGridDay）のみ。`EVENT_COLOR_MAP`（色識別子→bg/text色マップ）と `resolveEventColor` で `calendarEventToEventInput` の背景色・テキスト色を一元管理する
- `src/hooks/useChat.ts` — チャット機能を管理するカスタムフック。3秒ポーリングによるメッセージ自動更新・メッセージ送信（REST API）・連絡先一覧（REST API）を管理する。`pollingTimerRef` でポーリングタイマーを保持し、`selectedUserRef` でポーリングコールバック内のクロージャ問題を回避する。選択ユーザー変更時にポーリングを再起動し、コンポーネントアンマウント時に `clearInterval` で停止する
- `src/hooks/useIsMobile.ts` — 画面幅が640px未満かどうかをリアクティブに返すカスタムフック。`window.resize` イベントで追従する
- `src/validation/taskValidation.ts` — タスクフォームバリデーション（priority/category含む）。`TaskFormValues.assignees` は `string[]` 型（旧 `assigneesText: string` から変更）。担当者は1人以上必須
- `src/validation/linkValidation.ts` — リンク/フォルダフォームバリデーション。title必須。type="LINK" の場合は url も必須
- `src/components/ConfirmModal.tsx` — 削除確認モーダル
- `src/components/PermissionModal.tsx` — 権限共有モーダル。`GET /chat/users` で全ユーザー一覧を取得し、既に権限付与済みのユーザーを除外してセレクトに表示。READ/WRITE 選択 + 付与ボタン + 既存権限一覧（削除ボタン付き）。タスク・リンク集・予定の3リソースで共通使用する
- `src/components/ProxyGrantModal.tsx` — 代理登録権限管理モーダル。自分の予定に代理登録できるユーザーを追加・削除する。`fetchProxyGrantees`/`addProxyGrant`/`deleteProxyGrant` を使用。`fetchAllUsers` で全ユーザーを取得し、自分自身と既付与ユーザーを除外してセレクトに表示する
- `src/components/TaskDetailPanel.tsx` — タスク詳細サイドパネル。`task: Task | null` / `isToggling` / `isOwner` / `isMobile` / `onClose` / `onToggleComplete` / `onSelectTask` / `onDeleteClick` / `onUpdate` を受け取り、タスクデータを props で表示する（独自 API 呼び出しなし）。スマホ時（`isMobile=true`）は「← 一覧へ戻る」ボタンを表示し PC 向け × ボタンを非表示にする。子タスク・親タスクのリンクは `onSelectTask` 経由でパネル内切り替え（ページ遷移なし）。作成者のみ「共有」ボタンを表示し、クリックで `fetchTaskPermissions` を呼び出して `PermissionModal` を開く。「編集する」ボタン押下でインライン編集フォーム（`TaskEditForm`）を表示する
- `src/components/LinkFormModal.tsx` — リンク/フォルダ作成・編集フォームモーダル。タイプ選択（編集時は変更不可）・タイトル・URL（LINK タイプのみ）・説明・親フォルダ選択（FOLDER タイプのみ表示）。自分自身と子孫は親フォルダ候補から除外する
- `src/components/TextAreaField.tsx` — textareaラッパー共通コンポーネント
- `src/components/DateTimeField.tsx` — datetime-local入力ラッパー共通コンポーネント
- `src/components/SelectField.tsx` — selectラッパー共通コンポーネント
- `src/components/EventModal.tsx` — 予定作成・編集モーダル（オーケストレーター）。新規作成時は「通常」「複数日付」「繰り返し」の3モードをタブで切り替えられる。編集時は通常フォームのみ表示。新規作成時のみ「代理登録オプション」（proxyGranters がいる場合のみ表示）と「共有登録オプション」を表示する。`buildOptions()` で `CreateEventOptions` を生成し `onSaveWithOptions`/`onSaveMultipleWithOptions`/`onSaveRepeatWithOptions` コールバックで親に渡す。各フォームのUIと状態管理は `SingleEventForm` / `MultipleEventForm` / `RepeatEventForm` に委譲する。`EVENT_COLORS` 定数を `ColorPicker.tsx` から re-export する
- `src/components/SingleEventForm.tsx` — 通常予定作成・編集フォームコンポーネント。フォーム状態・バリデーション・送信ロジックを担う。繰り返しグループ予定の編集時にスコープ選択（この予定のみ/全て変更）を表示する
- `src/components/MultipleEventForm.tsx` — 複数日付一括作成フォームコンポーネント。開始・終了日時のペアをリストで追加・削除でき、全ペアで一括作成する
- `src/components/RepeatEventForm.tsx` — 繰り返し予定一括作成フォームコンポーネント。繰り返しタイプ・間隔・曜日・終了条件を設定できる
- `src/components/ColorPicker.tsx` — 色選択パレットコンポーネント。`EVENT_COLORS` 定数（6色）と `ColorPicker` コンポーネントを提供する
- `src/validation/eventValidation.ts` — カレンダー予定フォームのバリデーション。`validateEventForm`（通常）・`validateMultipleEventForm`（複数日付: 各ペアで end_time > start_time を検証）・`validateRepeatEventForm`（繰り返し: end_at > start_at を検証）の3種類を提供。`MultipleEventFormValues` は `start_times`/`end_times` 配列、`RepeatEventFormValues` は `end_at` を持つ。全フォーム値型に `color: string` フィールドを含む
- `src/components/CancelButton.tsx` — キャンセルボタン共通コンポーネント
- `src/components/TaskEditForm.tsx` — タスクインライン編集フォームコンポーネント。`TaskDetailPanel` 内で使用し、タイトル・説明・期限・優先度・カテゴリ・担当者を編集する。担当者はマウント時に `fetchAllUsers` + `getCurrentUsername` でユーザー一覧を取得し、セレクトから複数選択できる（バッジ表示・× で削除）。`onSave(id, input)` / `onCancel()` コールバックで親と通信する
- `src/components/LinkTreeNode.tsx` — リンクツリーの1ノードを再帰的にレンダリングするコンポーネント。FOLDER タイプは展開/折りたたみ可能で子要素を再帰レンダリング。LINK タイプは別タブでリンクを開く。`LinkListPage` から独立ファイルとして抽出

API base URL is built from env vars: `REACT_APP_API_SCHEME`, `REACT_APP_API_HOST`, `REACT_APP_API_PORT`.

### Database

SQLite（開発環境）。接続URLは `backend/prisma.config.ts` で管理。`JWT_SECRET` は `backend/.env`。

Prisma config file: `backend/prisma.config.ts` (uses dotenv, loads `prisma/schema.prisma`).

**Environment variables (`backend/.env`):**
- `JWT_SECRET` — JWT署名シークレット
- `FRONTEND_URL` — フロントエンドのベースURL（例: `http://localhost:3000`）

**Schema:**

```prisma
model Account {
  username              String            @id
  hashed_password       String
  task_assignees        TaskAssignee[]
  task_permissions      TaskPermission[]
  link_permissions      LinkPermission[]
  event_permissions     EventPermission[]
  proxy_grants_given    EventProxyGrant[] @relation("ProxyGranter")
  proxy_grants_received EventProxyGrant[] @relation("ProxyGrantee")
  created_tasks         Task[]            @relation("TaskCreator")
  created_events        Event[]           @relation("EventCreator")
  created_links         LinkItem[]        @relation("LinkCreator")
  sent_messages         ChatMessage[]     @relation("ChatSender")
  received_messages     ChatMessage[]     @relation("ChatReceiver")
}

model Task {
  id            Int              @id @default(autoincrement())
  title         String
  description   String
  due_date      DateTime
  priority      String           @default("MEDIUM")  // HIGH / MEDIUM / LOW
  category      String?
  parent_id     Int?
  created_by    String
  created_at    DateTime         @default(now())
  updated_at    DateTime         @updatedAt
  is_completed  Boolean          @default(false)
  closed_by     String?
  assignees     TaskAssignee[]
  permissions   TaskPermission[]
  creator       Account          @relation("TaskCreator", fields: [created_by], references: [username])
  parent        Task?            @relation("TaskChildren", fields: [parent_id], references: [id])
  children      Task[]           @relation("TaskChildren")

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

model TaskPermission {
  task_id    Int
  username   String
  permission String              // "READ" | "WRITE"
  task       Task    @relation(fields: [task_id], references: [id], onDelete: Cascade)
  account    Account @relation(fields: [username], references: [username], onDelete: Cascade)

  @@id([task_id, username])
  @@index([username])
}

model Event {
  id              Int               @id @default(autoincrement())
  title           String
  description     String            @default("")
  start_at        DateTime
  end_at          DateTime
  color           String            @default("cyan")  // 予定の色識別子（cyan/indigo/emerald/violet/rose/amber）
  repeat_group_id String?                             // 繰り返しグループID（UUID）。繰り返し作成時に同一グループで共有
  created_by      String
  created_at      DateTime          @default(now())
  updated_at      DateTime          @updatedAt
  creator         Account           @relation("EventCreator", fields: [created_by], references: [username])
  permissions     EventPermission[]

  @@index([created_by])
  @@index([start_at])
}

model EventPermission {
  event_id   Int
  username   String
  permission String    // "READ" | "WRITE"
  event      Event   @relation(fields: [event_id], references: [id], onDelete: Cascade)
  account    Account @relation(fields: [username], references: [username], onDelete: Cascade)

  @@id([event_id, username])
  @@index([username])
}

model EventProxyGrant {
  granter_username String
  grantee_username String
  granter          Account @relation("ProxyGranter", fields: [granter_username], references: [username], onDelete: Cascade)
  grantee          Account @relation("ProxyGrantee", fields: [grantee_username], references: [username], onDelete: Cascade)

  @@id([granter_username, grantee_username])
  @@index([grantee_username])
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
  creator     Account          @relation("LinkCreator", fields: [created_by], references: [username])
  parent      LinkItem?        @relation("LinkChildren", fields: [parent_id], references: [id], onDelete: Cascade)
  children    LinkItem[]       @relation("LinkChildren")
  permissions LinkPermission[]

  @@index([created_by])
  @@index([parent_id])
}

model LinkPermission {
  link_item_id Int
  username     String
  permission   String       // "READ" | "WRITE"
  linkItem     LinkItem @relation(fields: [link_item_id], references: [id], onDelete: Cascade)
  account      Account  @relation(fields: [username], references: [username], onDelete: Cascade)

  @@id([link_item_id, username])
  @@index([username])
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

- Password hashing uses **bcrypt (rounds=10)**. SHA-256 is not used; all passwords are hashed and verified with bcrypt only
- Backend ESLint disables `no-explicit-any`; warns on `no-floating-promises` and `no-unsafe-argument`
- Prettier: single quotes, trailing commas
- Backend `tsconfig.json`: `noImplicitAny: false`, module resolution `nodenext`
- Rate limiting: `ThrottlerModule` global guard (1分20回). Login/regist endpoints: 1分5回
- Swagger: available at `GET /api/docs`
- E2E tests: `backend/test/app.e2e-spec.ts`。`ThrottlerGuard` を `overrideGuard` でモックしてテスト実行する
