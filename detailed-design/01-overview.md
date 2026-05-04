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
| Frontend | FullCalendar | ^6.x |
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
| `CORS_ORIGIN` | CORS許可オリジン | ❌（デフォルト: `http://localhost:3000`） |

> **`CORS_ORIGIN` の動作:**
> - 値が `*` の場合: 全オリジンを許可（`origin: true`）
> - カンマ区切りで複数オリジンを指定可能（例: `http://localhost:3000,https://example.com`）
> - `.env.local` に `CORS_ORIGIN="*"` を設定するとトンネル経由テスト（ngrok等）に対応できる
> - `backend/.env.local` は `dotenv.config({ path: '.env.local', override: true })` で `.env` より後に読み込まれ、ローカル上書きに使用する（Git管理外）

### Frontend（`frontend/.env`）

| 変数名 | 説明 | デフォルト想定 |
|--------|------|--------------|
| `REACT_APP_API_SCHEME` | APIのスキーム | `http` |
| `REACT_APP_API_HOST` | APIのホスト | `localhost` |
| `REACT_APP_API_PORT` | APIのポート | `8000` |

> **`REACT_APP_API_HOST` が空の場合**: `API_BASE = ''`（空文字）となり相対URLでリクエストを送信する。CRAの `"proxy": "http://localhost:8000"`（`frontend/package.json`）と組み合わせることで、トンネル1本でAPIへ疎通できる。

## 実装済み機能

| 機能 | 状態 |
|------|------|
| アカウント登録 | ✅ 実装済み |
| ログイン | ✅ 実装済み |
| ログアウト | ✅ 実装済み（localStorageトークン削除 → /login遷移） |
| ホーム画面 | ✅ /tasks へリダイレクト |
| タスク一覧表示（ルートタスクのみ・期限昇順・カテゴリフィルター） | ✅ 実装済み |
| タスク作成（優先度・カテゴリ・親子タスク・作成者） | ✅ 実装済み |
| タスク編集（サイドパネルインライン編集） | ✅ 実装済み |
| タスク削除（確認モーダル付き） | ✅ 実装済み |
| タスク詳細表示（右サイドパネル・子タスク一覧・親タスクリンク） | ✅ 実装済み |
| タスク完了/未完了切り替え | ✅ 実装済み |
| タスク完了時のクローズユーザー記録（`closed_by`）・表示 | ✅ 実装済み |
| 子タスク作成（親カテゴリ引き継ぎ） | ✅ 実装済み |
| 親子タスク間ナビゲーション（サイドパネル内） | ✅ 実装済み |
| カレンダー表示（月/週/日ビュー・FullCalendar） | ✅ 実装済み |
| カレンダー予定 作成・編集・削除（作成者のみ編集・削除） | ✅ 実装済み |
| カレンダー日表示でのタスク表示（due_dateベース・ホバーツールチップ） | ✅ 実装済み |
