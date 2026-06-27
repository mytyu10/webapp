# webapp

タスク管理・カレンダー・LINE通知機能を持つフルスタックWebアプリケーション。
React フロントエンド + NestJS バックエンド + SQLite で構成される。

## ドキュメント

アーキテクチャ・DB設計・API仕様・認証フロー・Docker構成の詳細は **[detailed-design/](detailed-design/README.md)** を参照。

Claude Code の使い方・エージェントフロー → **[detailed-design/08-claude-code.md](detailed-design/08-claude-code.md)**

## 起動方法

### Docker（推奨）

前提: Docker Desktop がインストール済みであること。

```bash
# 初回・Dockerfile変更後
docker compose up --build

# 2回目以降
docker compose up
```

| サービス | URL |
|---------|-----|
| Frontend | http://localhost:3001 |
| Backend | http://localhost:8001 |

> ポートマッピング詳細 → [detailed-design/07-docker.md](detailed-design/07-docker.md)

停止・データリセット:

```bash
docker compose down        # 停止（データ保持）
docker compose down -v     # 停止＋DBデータ削除
```

---

### ローカル（Docker不使用）

前提: Node.js 18以上、`backend/.env` が設定済みであること。

**バックエンド起動**

```bash
cd backend
npm install
npx prisma migrate dev   # 初回のみ
npm run start:dev
```

**フロントエンド起動**（別ターミナル）

```bash
cd frontend
npm install
npm start
```

| サービス | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend | http://localhost:8000 |

> 環境変数の設定内容 → [detailed-design/01-overview.md](detailed-design/01-overview.md#環境変数)

---

## 開発方法

### ブランチ運用

```
main      本番相当
develop   開発ベースブランチ（PRはここへ）
```

### バックエンド

```bash
cd backend

npm run start:dev    # 開発サーバー起動（ホットリロード）
npm run test         # ユニットテスト実行
npm run test:cov     # カバレッジ付きテスト
npm run lint         # ESLint（自動修正）
npm run format       # Prettier フォーマット
```

特定テストファイルだけ実行:

```bash
npx jest src/tasks/service/task.service.spec.ts
```

### フロントエンド

```bash
cd frontend

npm start            # 開発サーバー起動（localhost:3000）
npm test             # テスト実行
npm run build        # 本番ビルド
```

### データベース

```bash
cd backend

npx prisma migrate dev          # マイグレーション作成・適用（開発）
npx prisma migrate deploy       # マイグレーション適用のみ（本番・Docker）
npx prisma studio               # DB GUI（ブラウザで確認）
npx prisma generate             # Prismaクライアント再生成
```

> スキーマ・モデル定義 → [detailed-design/03-database.md](detailed-design/03-database.md)

---

## ディレクトリ構成

```
webapp/
├── backend/              # NestJS バックエンド（ポート 8000）
│   ├── src/
│   ├── prisma/           # スキーマ・マイグレーション・SQLiteファイル
│   ├── .env              # 環境変数（Git管理外）
│   └── Dockerfile
├── frontend/             # React フロントエンド（ポート 3000）
│   ├── src/
│   └── Dockerfile
├── detailed-design/      # 詳細設計書
├── docker-compose.yml
└── README.md
```
