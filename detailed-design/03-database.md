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
  username        String @id
  hashed_password String
}
```

## テーブル定義

### Account テーブル

| カラム名 | 型 | 制約 | 説明 |
|---------|-----|------|------|
| `username` | String | PRIMARY KEY | ユーザー名（1〜10文字） |
| `hashed_password` | String | NOT NULL | SHA-256ハッシュ化されたパスワード（hex文字列） |

## Prisma操作一覧

### AccountRepository

| メソッド | Prisma操作 | 説明 |
|---------|-----------|------|
| `getAccount(username)` | `findUnique({ where: { username } })` | ユーザー名でアカウントを取得 |
| `createUser(data)` | `create({ data })` | アカウントを新規作成 |

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
