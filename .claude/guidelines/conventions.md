# 開発規約

## 技術スタック

| 領域 | 技術 |
|------|------|
| Frontend | React (TypeScript) |
| Backend | NestJS (TypeScript) |
| ORM | Prisma |
| 認証 | JWT |
| スタイリング | Tailwind CSS |
| DB | SQLite（開発）/ PostgreSQL（本番: db.prisma.io） |

---

## 共通規約

- TypeScriptの`any`型は使用禁止
- TypeScriptでは全てに型宣言を行うこと（設定できない場合の例外を除く）
- `noImplicitAny: false`はESLint設定の都合によるものだが、新規コードでは`any`を書かない
- Prettier設定: シングルクォート、末尾カンマあり
- UI・バックエンドのメッセージは日本語で記述する
- マジックナンバーを使用せず、意味がわかるように定数化（enum も可）を行うこと
- 各処理にはJsDocを付与し、なんの処理をしているかわかるように記載すること

---

## バックエンド規約（NestJS）

### モジュール構成

機能ごとに以下のファイルを作成する:

```
src/<feature>/
  <feature>.module.ts
  controller/
    <feature>.controller.ts
  service/
    <feature>.service.ts
  repository/
    <feature>.repository.ts
  dto/
    <feature>.dto.ts
```

### レイヤー責務

- **Controller**: HTTPエンドポイントの定義のみ。ビジネスロジックを書かない
- **Service**: ビジネスロジック
- **Repository**: Prismaを使ったDBアクセスのみ。ServiceからPrismaClientを直接呼ばない
- **DTO**: `class-validator`でバリデーション。リクエスト/レスポンスの型定義

### Prisma

- DBアクセスは必ずRepositoryレイヤーで行う
- モデルは`backend/prisma/schema.prisma`に定義する
- マイグレーションは`npx prisma migrate dev`で実施
- **スキーマ変更後は必ず`npx prisma migrate dev --name <migration_name>`を実行してマイグレーションファイルを作成・適用すること**。`prisma generate`だけでは不十分でDBに反映されない
- `PrismaService`のシャットダウン処理は`OnModuleDestroy`を実装し`onModuleDestroy()`で`$disconnect()`を呼ぶ（Prisma 7で廃止された`$on('beforeExit')`は使用しない）
- [2026-05-03] Prisma 7では`schema.prisma`の`datasource`ブロックに`url`を書かない。接続URLは`prisma.config.ts`の`datasource.url`で管理する

### 認証（JWT）

- JWTの生成は`src/jwt/jwt.service.ts`で行う（有効期限1h、`JWT_SECRET`環境変数使用）
- JWTのペイロード型は`src/jwt/jwt.payload.ts`に`JwtPayload`インターフェースとして定義する（`AccountDto`を渡さない）
- トークン生成はServiceレイヤーで行う（Controllerでは行わない）
- 保護されたルートには`JwtAuthGuard`を適用する（`src/jwt/jwt-auth.guard.ts`）

### パスワード

- ハッシュ化は`src/common/service/hash.service.ts`のSHA256を使用する（bcryptは使用しない）

### メッセージ定数

- レスポンスメッセージは`src/common/type/message.ts`に日本語で定義して使用する
- 文字列リテラルを直接コードに書かない

### HTTPステータス

- `src/common/type/status.enum.ts`のenumを使用する

---

## フロントエンド規約（React）

### コンポーネント

- 関数コンポーネント＋Hooksのみ使用（クラスコンポーネント禁止）
- 1ファイル1コンポーネントを原則とする
- [2026-05-03] 関数コンポーネントの戻り値型に`JSX.Element`を使用しない（`tsconfig.json`の`jsx: "react-jsx"`設定では`JSX`名前空間が存在しないため）。戻り値型は省略するか`React.ReactElement`を使用すること

### 共通UIコンポーネント

- フォーム要素は`src/components/`に定義したPJ固有の共通コンポーネントを使用する
- `<input>`・`<button>`・`<form>`などのHTML要素をページコンポーネントに直接書かない
- 共通コンポーネントの例: `FormCard`（フォーム外枠）、`FormField`（ラベル＋入力欄＋エラー表示）、`FormErrorBanner`（APIエラー表示）、`SubmitButton`（送信ボタン）、`TextAreaField`（テキストエリア）、`DateTimeField`（日時入力）、`SelectField`（セレクトボックス）、`CancelButton`（キャンセルボタン）、`ConfirmModal`（削除確認モーダル）
- 新しい画面を追加する際も同様に共通コンポーネントを呼び出す形で実装する

### スタイリング

- Tailwind CSSのユーティリティクラスのみ使用する
- CSSモジュール・インラインスタイル・外部CSSファイルは禁止
- レスポンシブ対応はTailwindのブレークポイント（sm, md, lg）を使用する

### ディレクトリ構成

単一責務の原則に従い、役割ごとにファイルを分割する:

```
src/
  api/           バックエンドとのHTTP通信のみ（fetch呼び出し）
  hooks/         カスタムフック（状態管理・オーケストレーション）
  validation/    バリデーションロジックのみ（純粋関数）
  pages/         ページコンポーネント（描画のみ・ロジックを持たない）
```

### 単一責務

- ページコンポーネントにビジネスロジック・API呼び出し・バリデーションを書かない
- ロジックはカスタムフック（`src/hooks/`）に切り出す
- API通信は`src/api/`に集約し、fetch を直接ページ・フックに書かない
- バリデーションは`src/validation/`に純粋関数として定義する

### API通信

- バックエンドへの接続先は環境変数から構築する（ハードコード禁止）
- 変数名: `REACT_APP_API_SCHEME` / `REACT_APP_API_HOST` / `REACT_APP_API_PORT`
- 開発デフォルト値は`.env`に定義し、ローカル上書きは`.env.local`を使用する（`.env.local`はgit管理外）
- JWTは現状`localStorage`に保存（セキュリティ改善は別途対応）

### 認証済みルート（PrivateRoute）

- [2026-05-03] PrivateRouteではトークンの存在チェックのみでなく、JWTをデコードして`exp`（有効期限）も検証すること。トークンが存在しない・期限切れの場合はログイン画面（`/login`）へリダイレクトする（トークン存在チェックのみの実装は却下）

### ルーティング

- `src/App.tsx`でルート定義を管理する
- ページコンポーネントは`src/pages/`に1ファイル1コンポーネントで配置する

### アクセス制御

- タスクの編集・削除ボタンは作成者（`created_by`）とログイン中ユーザー（`getCurrentUsername()`）が一致する場合のみ表示する

---

## データベース規約

### Accountモデル（現行スキーマ）

```prisma
model Account {
  username        String         @id
  hashed_password String
  task_assignees  TaskAssignee[]
  created_tasks   Task[]         @relation("TaskCreator")
}
```

- [2026-05-03] `username`を主キーとして使用する（`id: Int @id @default(autoincrement())`は使用しない）。実装を正として採用済み

### Taskモデル（現行スキーマ）

```prisma
model Task {
  id           Int            @id @default(autoincrement())
  title        String
  description  String
  due_date     DateTime
  priority     String         @default("MEDIUM")  // HIGH / MEDIUM / LOW
  category     String?
  parent_id    Int?
  created_by   String
  created_at   DateTime       @default(now())
  updated_at   DateTime       @updatedAt
  is_completed Boolean        @default(false)
  assignees    TaskAssignee[]
  creator      Account        @relation("TaskCreator", fields: [created_by], references: [username])
  parent       Task?          @relation("TaskChildren", fields: [parent_id], references: [id])
  children     Task[]         @relation("TaskChildren")
}

model TaskAssignee {
  task_id  Int
  username String
  task     Task    @relation(fields: [task_id], references: [id], onDelete: Cascade)
  account  Account @relation(fields: [username], references: [username], onDelete: Cascade)

  @@id([task_id, username])
}
```

- priorityフィールドは`HIGH` / `MEDIUM` / `LOW`の文字列で管理する（デフォルト: `MEDIUM`）
- categoryはオプショナル（`String?`）。カテゴリ一覧は`GET /tasks/categories`で取得する
- parent_idによる親子タスク構造をサポートする。子タスクは`children`リレーションで取得
- is_completedフィールドはタスクの完了状態を管理する（デフォルト: `false`）。`PATCH /tasks/:id` の `is_completed` フィールドで切り替える
- TaskAssigneeの担当者更新はdelete+insertトランザクションで対応する
- Taskの削除はCascade設定によりTaskAssigneeも連動削除される

### 命名規則

- テーブル名: PascalCase（Prismaモデル名に準拠）
- カラム名: snake_case
