# システムアーキテクチャ

## 全体構成

```
┌──────────────────────────────────────────┐     ┌──────────────────────────────────────┐
│           Frontend (React)               │     │           Backend (NestJS)           │
│           localhost:3000                 │     │           localhost:8000             │
│                                          │     │                                      │
│  BrowserRouter                           │     │  main.ts                             │
│  ├── /login → LoginPage          ────────┼─────┤  ├── ValidationPipe (global)         │
│  ├── /regist → RegistPage                │ HTTP│  ├── AllExceptionsFilter (global)    │
│  └── PrivateRoute (JWT検証)              │     │  └── AppModule                       │
│      └── SidebarLayout                   │     │       ├── AccountsModule             │
│          ├── / → HomePage(リダイレクト)  │     │       │    ├── AccountController      │
│          ├── /tasks → TaskListPage       │     │       │    ├── AccountService         │
│          ├── /tasks/new → TaskFormPage   │     │       │    └── AccountRepository      │
│          ├── /tasks/:id → TaskDetailPage │     │       └── TaskModule                 │
│          └── /tasks/:id/edit             │     │            ├── TaskController        │
│                                          │     │            ├── TaskService           │
│  src/                                    │     │            └── TaskRepository        │
│  ├── api/          API通信               │     │                                      │
│  ├── hooks/        状態管理               │     │  共通                                │
│  ├── validation/   バリデーション          │     │  ├── JwtAuthGuard                    │
│  ├── pages/        画面                  │     │  ├── PrismaService                   │
│  └── components/   共通UI                │     │  ├── JwtService                      │
└──────────────────────────────────────────┘     │  ├── HashService                     │
                                                 │  └── LoggerService                   │
                                                 └──────────────────┬───────────────────┘
                                                                    │ Prisma ORM
                                                                    ▼
                                                            ┌───────────────┐
                                                            │  SQLite DB    │
                                                            │  (dev.db)     │
                                                            └───────────────┘
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
│   TaskController)     │
└──────────┬───────────┘
           │
    ▼
┌──────────────────────┐
│  Service              │  ← ビジネスロジック
│  (AccountService      │
│   TaskService)        │
└──────────┬───────────┘
           │
    ▼
┌──────────────────────┐
│  Repository           │  ← DBアクセスのみ（Prisma呼び出し）
│  (AccountRepository   │
│   TaskRepository)     │
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
├── main.ts                          # エントリーポイント・グローバル設定
├── app.module.ts                    # ルートモジュール（AccountsModule, TaskModule をimport）
├── accounts/                        # アカウント機能モジュール
│   ├── controller/
│   │   └── account.controller.ts   # POST /accounts/login, /regist, GET /logout
│   ├── dto/
│   │   └── account.ts              # リクエストDTO（バリデーション定義）
│   ├── module/
│   │   └── account.module.ts       # モジュール定義・DI設定
│   ├── repository/
│   │   └── account.repository.ts   # Prismaを使ったDBアクセス
│   └── service/
│       └── account.service.ts      # ログイン・登録のビジネスロジック
├── tasks/                           # タスク管理機能モジュール
│   ├── controller/
│   │   └── task.controller.ts      # GET/POST/PATCH/DELETE /tasks（JwtAuthGuard適用）
│   ├── dto/
│   │   └── task.dto.ts             # CreateTaskDto, UpdateTaskDto, TaskResponseDto
│   ├── module/
│   │   └── task.module.ts          # モジュール定義・DI設定
│   ├── repository/
│   │   └── task.repository.ts      # Prismaを使ったDBアクセス（is_completed 対応）
│   └── service/
│       └── task.service.ts         # タスクCRUDのビジネスロジック
├── common/                          # 共通ユーティリティ
│   ├── filter/
│   │   └── http-exception.filter.ts # グローバル例外フィルター
│   ├── service/
│   │   ├── hash.service.ts          # SHA-256ハッシュ化
│   │   └── logger.service.ts        # ロガーラッパー
│   └── type/
│       ├── message.ts               # レスポンスメッセージ定数
│       ├── status.enum.ts           # HTTPステータス定数
│       └── string.constants.ts      # 文字列定数
├── jwt/
│   ├── jwt-auth.guard.ts            # JWT認証Guard（CanActivate実装）。検証成功時に request.user へペイロードをセット
│   ├── jwt.payload.ts               # JWTペイロード型定義
│   └── jwt.service.ts               # JWT生成
├── types/
│   └── express.d.ts                 # Express Request型拡張（request.user: JwtPayload）
└── prisma/
    └── prisma.service.ts            # Prismaクライアントシングルトン
```

## フロントエンド ディレクトリ構成

```
frontend/src/
├── App.tsx                          # ルーティング定義（PrivateRoute/SidebarLayout含む）
├── index.tsx                        # エントリーポイント
├── logger.ts                        # コンソールロガー
├── api/
│   ├── accountApi.ts                # バックエンドHTTP通信（ログイン・登録）
│   └── taskApi.ts                   # バックエンドHTTP通信（タスクCRUD・完了切り替え、Bearer認証）
├── components/                      # 共通UIコンポーネント
│   ├── FormCard.tsx                 # フォーム外枠カード
│   ├── FormField.tsx                # ラベル＋入力欄＋エラー表示
│   ├── FormErrorBanner.tsx          # APIエラー表示バナー
│   ├── SubmitButton.tsx             # 送信ボタン（ローディング対応）
│   ├── PrivateRoute.tsx             # JWT有効期限検証（exp チェック）
│   ├── Sidebar.tsx                  # サイドバーナビゲーション
│   └── SidebarLayout.tsx            # サイドバー付きレイアウト
├── hooks/                           # カスタムフック（状態管理・オーケストレーション）
│   ├── useLoginForm.ts              # ログインフォームの状態・送信処理
│   ├── useRegistForm.ts             # 登録フォームの状態・送信処理
│   ├── useTaskList.ts               # タスク一覧・削除・完了切り替え・階層ツリー構築フック
│   ├── useTaskDetail.ts             # タスク詳細取得・完了切り替えフック
│   └── useTaskForm.ts               # タスク作成・編集フォームフック
├── pages/                           # ページコンポーネント（描画のみ）
│   ├── HomePage.tsx                 # ホーム（/tasks へリダイレクト）
│   ├── LoginPage.tsx                # ログイン画面
│   ├── RegistPage.tsx               # アカウント登録画面
│   ├── TaskListPage.tsx             # タスク一覧画面（階層表示・完了セクション折りたたみ）
│   ├── TaskFormPage.tsx             # タスク作成・編集画面
│   └── TaskDetailPage.tsx           # タスク詳細画面（完了/未完了ボタン・完了スタイル）
└── validation/                      # バリデーション（純粋関数）
    ├── loginValidation.ts           # ログインフォームバリデーション
    ├── registValidation.ts          # 登録フォームバリデーション
    └── taskValidation.ts            # タスクフォームバリデーション
```

## DI（依存性注入）構成

```
AppModule
├── AccountsModule
│   └── provides
│       ├── AccountController
│       ├── AccountService      ← HashService, JwtService, AccountRepository に依存
│       ├── AccountRepository   ← PrismaService に依存
│       ├── PrismaService
│       ├── JwtService
│       ├── HashService
│       └── LoggerService
└── TaskModule
    └── provides
        ├── TaskController      ← JwtAuthGuard（@UseGuards）適用
        ├── TaskService         ← TaskRepository, LoggerService に依存
        ├── TaskRepository      ← PrismaService に依存
        ├── PrismaService
        └── LoggerService
```
