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
}

model Task {
  id          Int            @id @default(autoincrement())
  title       String
  description String
  due_date    DateTime
  created_at  DateTime       @default(now())
  updated_at  DateTime       @updatedAt
  assignees   TaskAssignee[]
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
| `created_at` | DateTime | NOT NULL, DEFAULT now() | 作成日時 |
| `updated_at` | DateTime | NOT NULL, @updatedAt | 更新日時 |

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
| `findAll()` | `findMany({ include: { assignees: true }, orderBy: { created_at: 'desc' } })` | 全タスクを担当者情報込みで取得（作成日降順） |
| `findById(id)` | `findUnique({ where: { id }, include: { assignees: true } })` | 指定IDのタスクを担当者情報込みで取得 |
| `create(data)` | `create({ data: { ...assignees: { create } } })` | タスクと担当者を一括作成 |
| `update(id, data)` | `$transaction` → `deleteMany` + `update` | 担当者を削除してから再登録するトランザクション更新 |
| `delete(id)` | `delete({ where: { id } })` | タスクを削除（担当者はCascadeで自動削除） |

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
