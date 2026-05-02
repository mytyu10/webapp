# アプリ概要

## アプリケーション概要

アカウント登録・ログイン機能を持つフルスタックWebアプリケーション。
React フロントエンドと NestJS バックエンドで構成される。

## 技術スタック

| 領域 | 技術 | バージョン |
|------|------|-----------|
| Frontend | React | ^19.2.4 |
| Frontend | TypeScript | ^4.9.5 |
| Frontend | React Router | ^7.14.2 |
| Frontend | Tailwind CSS | ^3.4.19 |
| Backend | NestJS | ^11.0.1 |
| Backend | TypeScript | ^5.7.3 |
| Backend | Express | (NestJS経由) |
| ORM | Prisma | ^7.8.0 |
| DB | SQLite (better-sqlite3) | ^12.9.0 |
| 認証 | JWT (jsonwebtoken) | ^9.0.3 |
| ハッシュ | SHA-256 (Node.js crypto) | - |

## 起動ポート

| サービス | ポート |
|---------|-------|
| Frontend | 3000 |
| Backend | 8000 (環境変数 PORT で変更可) |

## 環境変数

### Backend（`backend/.env`）

| 変数名 | 説明 | 必須 |
|--------|------|------|
| `JWT_SECRET` | JWT署名シークレット | ✅ |
| `DATABASE_URL` | SQLiteファイルパス（例: `file:./dev.db`）| ✅ |
| `PORT` | リッスンポート | ❌（デフォルト: 8000） |

### Frontend（`frontend/.env`）

| 変数名 | 説明 | デフォルト想定 |
|--------|------|--------------|
| `REACT_APP_API_SCHEME` | APIのスキーム | `http` |
| `REACT_APP_API_HOST` | APIのホスト | `localhost` |
| `REACT_APP_API_PORT` | APIのポート | `8000` |

## 実装済み機能

| 機能 | 状態 |
|------|------|
| アカウント登録 | ✅ 実装済み |
| ログイン | ✅ 実装済み |
| ログアウト | ❌ 未実装（APIエンドポイントは存在するが空実装） |
| ホーム画面 | ❌ スタブ（`<div>Home</div>` のみ） |
