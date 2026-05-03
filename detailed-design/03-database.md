# データベース設計

## 概要

| 項目 | 内容 |
|------|------|
| DB エンジン | SQLite |
| ドライバー | better-sqlite3 |
| Prismaアダプター | @prisma/adapter-better-sqlite3 |
| 接続方法 | `DATABASE_URL` 環境変数（例: `file:./dev.db`） |

## Prisma スキーマ

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
}

model Account {
  username        String         @id
  hashed_password String
  task_assignees  TaskAssignee[]
  created_tasks   Task[]         @relation("TaskCreator")
}

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
  closed_by    String?
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

## テーブル定義

### Account テーブル

| カラム名 | 型 | 制約 | 説明 |
|---------|-----|------|------|
| `username` | String | PRIMARY KEY | ユーザー名（1〜10文字） |
| `hashed_password` | String | NOT NULL | SHA-256ハッシュ化されたパスワード（hex文字列） |

### Task テーブル

| カラム名 | 型 | 制約 | 説明 |
|---------|-----|------|------|
| `id` | Int | PRIMARY KEY, AUTOINCREMENT | タスクID |
| `title` | String | NOT NULL | タスクタイトル（最大200文字） |
| `description` | String | NOT NULL | タスク説明文（最大1000文字） |
| `due_date` | DateTime | NOT NULL | タスク期限 |
| `priority` | String | NOT NULL, DEFAULT "MEDIUM" | 優先度（`HIGH` / `MEDIUM` / `LOW`） |
| `category` | String | NULL 許容 | カテゴリ（任意、最大100文字） |
| `parent_id` | Int | NULL 許容, FK → Task.id | 親タスクID（子タスクの場合に設定） |
| `created_by` | String | NOT NULL, FK → Account.username | 作成者ユーザー名 |
| `created_at` | DateTime | NOT NULL, DEFAULT now() | 作成日時 |
| `updated_at` | DateTime | NOT NULL, @updatedAt | 更新日時 |
| `is_completed` | Boolean | NOT NULL, DEFAULT false | 完了状態（`true`: 完了 / `false`: 未完了） |
| `closed_by` | String | NULL 許容 | タスクをクローズ（完了）したユーザー名。未完了の場合は NULL |

- `parent_id` による自己参照で親子タスク構造をサポートする（`children` リレーションで子タスク取得）
- Task削除時に子タスクの `parent_id` は NULL になる（Cascade削除ではない）

### TaskAssignee テーブル（中間テーブル）

| カラム名 | 型 | 制約 | 説明 |
|---------|-----|------|------|
| `task_id` | Int | PK（複合）, FK → Task.id | タスクID |
| `username` | String | PK（複合）, FK → Account.username | ユーザー名 |

- `task_id` + `username` の複合主キー
- Task削除時はCascade削除（担当者レコードも削除）
- Account削除時はCascade削除

## Prisma操作一覧

### AccountRepository

| メソッド | Prisma操作 | 説明 |
|---------|-----------|------|
| `getAccount(username)` | `findUnique({ where: { username } })` | ユーザー名でアカウントを取得 |
| `createUser(data)` | `create({ data })` | アカウントを新規作成 |

### TaskRepository

| メソッド | Prisma操作 | 説明 |
|---------|-----------|------|
| `findAll()` | `findMany({ where: { parent_id: null }, include: { assignees, children }, orderBy: { due_date: 'asc' } })` | ルートタスク（親なし）のみを担当者・子タスク情報込みで取得（期限昇順） |
| `findById(id)` | `findUnique({ where: { id }, include: { assignees, children } })` | 指定IDのタスクを担当者・子タスク情報込みで取得 |
| `create(data)` | `create({ data: { ...assignees: { create } } })` | タスクと担当者を一括作成 |
| `update(id, data)` | `$transaction` → `deleteMany` + `update` | 担当者を削除してから再登録するトランザクション更新（`is_completed` を含む全フィールドが部分更新可能） |
| `delete(id)` | `delete({ where: { id } })` | タスクを削除（担当者はCascadeで自動削除） |
| `findAllCategories()` | `findMany({ where: { category: { not: null } }, distinct: ['category'], orderBy: { category: 'asc' } })` | 全タスクから設定済みカテゴリを重複なしで取得（昇順） |

## PrismaService の初期化

```typescript
// PrismaClient を継承し、better-sqlite3アダプター経由で接続
// DATABASE_URL から "file:" プレフィックスを除去してファイルパスとして使用
const adapter = new PrismaBetterSqlite3(database);
super({ adapter });

// ライフサイクルフック
onModuleInit()    → $connect()
onModuleDestroy() → $disconnect()
```

## マイグレーション

```bash
# 開発環境（マイグレーションファイル生成＋適用）
npx prisma migrate dev

# 本番環境（適用のみ）
npx prisma migrate deploy

# クライアント再生成
npx prisma generate

# DB GUI
npx prisma studio
```

## 設計上の注意点

- パスワードは **SHA-256（ソルトなし）** でハッシュ化して保存
  - セキュリティ上の懸念: ソルトなしのSHA-256はレインボーテーブル攻撃に脆弱
  - `bcrypt` パッケージが依存関係に含まれているが現状未使用
- `username` が主キーのため、同一ユーザー名の重複登録は DB レベルでも拒否される
- `TaskAssignee` の担当者更新は `delete + insert` トランザクションで実施
