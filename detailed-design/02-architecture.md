# システムアーキテクチャ

## 全体構成

```
┌──────────────────────────────────────────────┐     ┌────────────────────────────────────────────┐
│           Frontend (React)                   │     │           Backend (NestJS)                 │
│           localhost:3000                     │     │           localhost:8000                   │
│                                              │     │                                            │
│  BrowserRouter                               │     │  main.ts                                   │
│  ├── /login → LoginPage           ───────────┼─────┤  ├── ValidationPipe (global)               │
│  ├── /regist → RegistPage                    │ HTTP│  ├── AllExceptionsFilter (global)          │
│  ├── /line-callback → LineCallbackPage       │     │  └── AppModule                             │
│  └── PrivateRoute (JWT検証)                  │     │       ├── ScheduleModule.forRoot()         │
│      └── SidebarLayout                       │     │       ├── CommonModule                     │
│          ├── / → HomePage(リダイレクト)      │     │       │    ├── LoggerService               │
│          ├── /tasks → TaskListPage           │     │       │    └── BatchQueueService           │
│          ├── /tasks/new → TaskFormPage       │     │       ├── AccountsModule                   │
│          └── /calendar → CalendarPage       │     │       │    ├── AccountController            │
│                                              │     │       │    ├── AccountService              │
│  src/                                        │     │       │    └── AccountRepository           │
│  ├── api/          API通信                   │     │       ├── TaskModule                       │
│  ├── hooks/        状態管理                   │     │       │    ├── TaskController              │
│  ├── validation/   バリデーション              │     │       │    ├── TaskService                │
│  ├── pages/        画面                      │     │       │    ├── TaskRepository              │
│  └── components/   共通UI                    │     │       │    ├── TaskNotificationService     │
└──────────────────────────────────────────────┘     │       │    └── TaskNotificationRepository  │
                                                     │       ├── EventsModule                     │
                                                     │       │    ├── EventController             │
                                                     │       │    ├── EventService                │
                                                     │       │    └── EventRepository             │
                                                     │       └── LineNotificationService (Cron)   │
                                                     │                                            │
                                                     │  共通                                      │
                                                     │  ├── JwtAuthGuard                          │
                                                     │  ├── PrismaService                         │
                                                     │  ├── JwtService                            │
                                                     │  └── HashService                           │
                                                     └──────────────────┬─────────────────────────┘
                                                                        │ Prisma ORM
                                                                        ▼
                                                                ┌───────────────┐
                                                                │  SQLite DB    │
                                                                │  (dev.db)     │
                                                                └───────────────┘
                                                                        
                                                     LINE OAuth ┌──────────────────────────────┐
                                                     ──────────▶│  LINE Login API               │
                                                                │  （認可コード→トークン→Profile）│
                                                                └──────────────────────────────┘

                                                     LINE Push  ┌──────────────────────────────┐
                                                     ──────────▶│  LINE Messaging API           │
                                                                │  （Cronジョブ毎分実行）         │
                                                                └──────────────────────────────┘
```

## バックエンド レイヤー構成

```
HTTP Request
    │
    ▼
┌──────────────────────┐
│  JwtAuthGuard         │  ← 保護ルートのみ。BearerトークンのJWT検証
└──────────┬───────────┘
           │
    ▼
┌──────────────────────┐
│  ValidationPipe       │  ← DTOのclass-validatorでリクエストをバリデーション
└──────────┬───────────┘
           │
    ▼
┌──────────────────────┐
│  Controller           │  ← HTTPエンドポイント定義・レスポンス整形のみ
│  (AccountController   │
│   TaskController      │
│   EventController)    │
└──────────┬───────────┘
           │
    ▼
┌──────────────────────┐
│  Service              │  ← ビジネスロジック
│  (AccountService      │
│   TaskService         │
│   TaskNotification    │
│   Service             │
│   EventService)       │
└──────────┬───────────┘
           │
    ▼
┌──────────────────────┐
│  Repository           │  ← DBアクセスのみ（Prisma呼び出し）
│  (AccountRepository   │
│   TaskRepository      │
│   TaskNotification    │
│   Repository          │
│   EventRepository)    │
└──────────┬───────────┘
           │
    ▼
┌──────────────────────┐
│  PrismaService        │  ← Prismaクライアント管理
└──────────┬───────────┘
           │
    ▼
┌──────────────────────┐
│  SQLite DB            │
└──────────────────────┘
```

## バックエンド ディレクトリ構成

```
backend/src/
├── main.ts                                     # エントリーポイント・グローバル設定
├── app.module.ts                               # ルートモジュール（ScheduleModule・CommonModule・AccountsModule・TaskModule・EventsModule をimport）
├── accounts/                                   # アカウント機能モジュール
│   ├── controller/
│   │   └── account.controller.ts              # POST /accounts/login, /regist
│   │                                          # GET /accounts/me, /line/login, /line/callback
│   ├── dto/
│   │   └── account.dto.ts                     # AccountDto・LineCallbackQueryDto・AccountMeResponseDto
│   ├── module/
│   │   └── account.module.ts                  # モジュール定義・DI設定
│   ├── repository/
│   │   └── account.repository.ts              # Prismaを使ったDBアクセス（updateLineUserId 含む）
│   └── service/
│       └── account.service.ts                 # ログイン・登録・LINE OAuth・ユーザー情報取得のビジネスロジック
├── tasks/                                      # タスク管理機能モジュール
│   ├── controller/
│   │   └── task.controller.ts                 # GET/POST/PATCH/DELETE /tasks（JwtAuthGuard適用）
│   │                                          # POST/GET/DELETE /tasks/:id/notifications
│   ├── dto/
│   │   └── task.dto.ts                        # CreateTaskDto, UpdateTaskDto, TaskResponseDto
│   │                                          # CreateNotificationDto, NotificationResponseDto
│   ├── module/
│   │   └── task.module.ts                     # モジュール定義・DI設定（TaskNotificationRepository をエクスポート）
│   ├── repository/
│   │   ├── task.repository.ts                 # Prismaを使ったDBアクセス（notifications include 対応）
│   │   └── task-notification.repository.ts    # TaskNotification CRUD・送信対象取得・送信済みマーク
│   └── service/
│       ├── task.service.ts                    # タスクCRUDのビジネスロジック（BatchQueueService 経由で更新をバッチ処理）
│       └── task-notification.service.ts       # 通知追加・一覧取得・削除
├── events/                                     # カレンダー予定機能モジュール
│   ├── controller/
│   │   └── event.controller.ts               # GET/POST/PATCH/DELETE /events（JwtAuthGuard適用）
│   ├── dto/
│   │   └── event.dto.ts                      # CreateEventDto, UpdateEventDto, EventResponseDto
│   ├── repository/
│   │   └── event.repository.ts               # Prismaを使ったDBアクセス
│   ├── service/
│   │   └── event.service.ts                  # 予定CRUDのビジネスロジック（作成者のみ編集・削除可）
│   └── events.module.ts                       # EventsModule定義・DI設定
├── line/
│   └── line-notification.service.ts           # Cronジョブ（毎分）: 未送信通知を取得してLINE Messaging APIでプッシュ送信
├── common/                                     # 共通ユーティリティ
│   ├── common.module.ts                        # CommonModule（LoggerService・BatchQueueService を providers/exports に登録）
│   ├── filter/
│   │   └── http-exception.filter.ts           # グローバル例外フィルター
│   ├── service/
│   │   ├── batch-queue.service.ts             # 汎用バッチキューサービス（100msウィンドウ・順次処理）
│   │   ├── hash.service.ts                    # SHA-256ハッシュ化
│   │   └── logger.service.ts                  # ロガーラッパー
│   └── type/
│       ├── message.ts                         # レスポンスメッセージ定数（TASK・EVENT・AUTH・NOTIFICATION・DB・VALIDATION）
│       ├── status.enum.ts                     # HTTPステータス定数
│       └── string.constants.ts               # 文字列定数
├── jwt/
│   ├── jwt-auth.guard.ts                      # JWT認証Guard（CanActivate実装）。検証成功時に request.user へペイロードをセット
│   ├── jwt.payload.ts                         # JWTペイロード型定義
│   └── jwt.service.ts                         # JWT生成
├── types/
│   └── express.d.ts                           # Express Request型拡張（request.user: JwtPayload）
└── prisma/
    └── prisma.service.ts                      # Prismaクライアントシングルトン
```

## フロントエンド ディレクトリ構成

```
frontend/src/
├── App.tsx                          # ルーティング定義（PrivateRoute/SidebarLayout含む）
├── index.tsx                        # エントリーポイント
├── index.css                        # グローバルCSS（FullCalendarダークテーマ: .calendar-wrapperスコープ）
├── logger.ts                        # コンソールロガー
├── api/
│   ├── accountApi.ts                # バックエンドHTTP通信（ログイン・登録）
│   ├── taskApi.ts                   # バックエンドHTTP通信（タスクCRUD・通知CRUD・LINE連携状態取得・Bearer認証）
│   └── eventApi.ts                  # バックエンドHTTP通信（予定CRUD、Bearer認証）
├── components/                      # 共通UIコンポーネント
│   ├── FormCard.tsx                 # フォーム外枠カード
│   ├── FormField.tsx                # ラベル＋入力欄＋エラー表示
│   ├── FormErrorBanner.tsx          # APIエラー表示バナー
│   ├── SubmitButton.tsx             # 送信ボタン（ローディング対応）
│   ├── CancelButton.tsx             # キャンセルボタン
│   ├── DeleteButton.tsx             # 削除ボタン
│   ├── TextAreaField.tsx            # textareaラッパー
│   ├── DateTimeField.tsx            # datetime-local入力ラッパー
│   ├── SelectField.tsx              # selectラッパー
│   ├── ConfirmModal.tsx             # 削除確認モーダル
│   ├── PrivateRoute.tsx             # JWT有効期限検証（exp チェック）
│   ├── Sidebar.tsx                  # サイドバーナビゲーション（LINE連携状態表示含む）
│   ├── SidebarLayout.tsx            # サイドバー付きレイアウト
│   ├── TaskCard.tsx                 # タスク1件表示カードコンポーネント
│   ├── TaskDetailPanel.tsx          # タスク詳細サイドパネル（詳細表示＋インライン編集＋通知一覧）
│   ├── CalendarViewToggle.tsx       # カレンダービュー切り替えボタングループ（月/週/日）
│   ├── EventModal.tsx               # 予定作成・編集モーダル
│   └── TaskTooltip.tsx              # カレンダー日表示タスクのホバーツールチップ
├── hooks/                           # カスタムフック（状態管理・オーケストレーション）
│   ├── useLoginForm.ts              # ログインフォームの状態・送信処理
│   ├── useRegistForm.ts             # 登録フォームの状態・送信処理
│   ├── useTaskList.ts               # タスク一覧・削除・完了切り替え・階層ツリー構築・インライン更新フック
│   ├── useTaskForm.ts               # タスクフォームフック（作成/編集/子タスク作成・通知日時管理）
│   ├── useIsMobile.ts               # 画面幅640px未満の判定フック（window.resizeでリアクティブ追従）
│   └── useCalendar.ts               # カレンダー予定・タスク表示・ビュー切り替えフック
├── pages/                           # ページコンポーネント（描画のみ）
│   ├── HomePage.tsx                 # ホーム（/tasks へリダイレクト）
│   ├── LoginPage.tsx                # ログイン画面
│   ├── RegistPage.tsx               # アカウント登録画面
│   ├── TaskListPage.tsx             # タスク一覧画面（サイドパネル・リサイズディバイダー・完了セクション折りたたみ）
│   ├── TaskFormPage.tsx             # タスク作成・編集画面（通知日時設定UI含む）
│   ├── CalendarPage.tsx             # カレンダー画面（FullCalendar・予定CRUD・タスク表示）
│   └── LineCallbackPage.tsx         # LINE OAuth コールバックページ（PrivateRoute外）
└── validation/                      # バリデーション（純粋関数）
    ├── loginValidation.ts           # ログインフォームバリデーション
    ├── registValidation.ts          # 登録フォームバリデーション
    ├── taskValidation.ts            # タスクフォームバリデーション（担当者1人以上必須）
    └── eventValidation.ts           # 予定フォームバリデーション
```

## DI（依存性注入）構成

```
AppModule
├── imports
│   ├── ScheduleModule.forRoot()     ← Cronジョブ有効化
│   ├── CommonModule                 ← LoggerService / BatchQueueService をエクスポート
│   ├── AccountsModule
│   ├── TaskModule                   ← TaskNotificationRepository をエクスポート
│   └── EventsModule
├── providers
│   ├── AppService
│   └── LineNotificationService      ← TaskModule の TaskNotificationRepository と
│                                       CommonModule の LoggerService を DI で受け取る（重複登録なし）
│
├── AccountsModule
│   └── provides
│       ├── AccountController
│       ├── AccountService           ← HashService, JwtService, AccountRepository に依存
│       ├── AccountRepository        ← PrismaService に依存
│       ├── PrismaService
│       ├── JwtService
│       ├── HashService
│       └── LoggerService
│
├── TaskModule
│   ├── imports
│   │   └── CommonModule             ← LoggerService / BatchQueueService を提供
│   ├── provides
│   │   ├── TaskController           ← JwtAuthGuard（@UseGuards）適用
│   │   ├── TaskService              ← BatchQueueService, TaskRepository, LoggerService に依存
│   │   ├── TaskRepository           ← PrismaService に依存
│   │   ├── TaskNotificationService  ← TaskNotificationRepository に依存
│   │   ├── TaskNotificationRepository ← PrismaService に依存
│   │   └── PrismaService
│   └── exports
│       └── TaskNotificationRepository
│
├── EventsModule
│   ├── imports
│   │   └── CommonModule             ← LoggerService を提供
│   └── provides
│       ├── EventController          ← JwtAuthGuard（@UseGuards）適用
│       ├── EventService             ← EventRepository, LoggerService に依存
│       ├── EventRepository          ← PrismaService に依存
│       └── PrismaService
│
└── CommonModule
    └── provides/exports
        ├── LoggerService
        └── BatchQueueService        ← LoggerService に依存（バッチ処理ログ出力）
```
