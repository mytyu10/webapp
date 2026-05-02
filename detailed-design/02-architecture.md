# システムアーキテクチャ

## 全体構成

```
┌─────────────────────────────────┐     ┌──────────────────────────────────────┐
│         Frontend (React)        │     │           Backend (NestJS)           │
│         localhost:3000          │     │           localhost:8000             │
│                                 │     │                                      │
│  BrowserRouter                  │     │  main.ts                             │
│  ├── / → HomePage               │ HTTP│  ├── ValidationPipe (global)         │
│  ├── /login → LoginPage  ───────┼─────┤  ├── AllExceptionsFilter (global)    │
│  └── /regist → RegistPage       │     │  └── AppModule                       │
│                                 │     │       └── AccountsModule             │
│  src/                           │     │            ├── AccountController      │
│  ├── api/          API通信       │     │            ├── AccountService         │
│  ├── hooks/        状態管理       │     │            ├── AccountRepository      │
│  ├── validation/   バリデーション  │     │            ├── PrismaService          │
│  ├── pages/        画面          │     │            ├── JwtService             │
│  └── components/   共通UI        │     │            └── HashService            │
└─────────────────────────────────┘     └──────────────────┬───────────────────┘
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
│  ValidationPipe       │  ← DTOのclass-validatorでリクエストをバリデーション
└──────────┬───────────┘
           │
    ▼
┌──────────────────────┐
│  Controller           │  ← HTTPエンドポイント定義・レスポンス整形のみ
│  (AccountController)  │
└──────────┬───────────┘
           │
    ▼
┌──────────────────────┐
│  Service              │  ← ビジネスロジック（認証・パスワード検証等）
│  (AccountService)     │
└──────────┬───────────┘
           │
    ▼
┌──────────────────────┐
│  Repository           │  ← DBアクセスのみ（Prisma呼び出し）
│  (AccountRepository)  │
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
├── app.module.ts                    # ルートモジュール
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
│   ├── jwt.payload.ts               # JWTペイロード型定義
│   └── jwt.service.ts               # JWT生成
└── prisma/
    └── prisma.service.ts            # Prismaクライアントシングルトン
```

## フロントエンド ディレクトリ構成

```
frontend/src/
├── App.tsx                          # ルーティング定義
├── index.tsx                        # エントリーポイント
├── logger.ts                        # コンソールロガー
├── api/
│   └── accountApi.ts                # バックエンドHTTP通信
├── components/                      # 共通UIコンポーネント
│   ├── FormCard.tsx                 # フォーム外枠カード
│   ├── FormField.tsx                # ラベル＋入力欄＋エラー表示
│   ├── FormErrorBanner.tsx          # APIエラー表示バナー
│   └── SubmitButton.tsx             # 送信ボタン（ローディング対応）
├── hooks/                           # カスタムフック（状態管理・オーケストレーション）
│   ├── useLoginForm.ts              # ログインフォームの状態・送信処理
│   └── useRegistForm.ts             # 登録フォームの状態・送信処理
├── pages/                           # ページコンポーネント（描画のみ）
│   ├── HomePage.tsx                 # ホーム（スタブ）
│   ├── LoginPage.tsx                # ログイン画面
│   └── RegistPage.tsx               # アカウント登録画面
└── validation/                      # バリデーション（純粋関数）
    ├── loginValidation.ts           # ログインフォームバリデーション
    └── registValidation.ts          # 登録フォームバリデーション
```

## DI（依存性注入）構成

```
AccountsModule
├── provides
│   ├── AccountController
│   ├── AccountService      ← HashService, JwtService, AccountRepository に依存
│   ├── AccountRepository   ← PrismaService に依存
│   ├── PrismaService
│   ├── JwtService
│   ├── HashService
│   └── LoggerService
└── imports (なし)
```
