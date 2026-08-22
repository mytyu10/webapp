# backend

NestJS バックエンド。ポート 8000 で起動する。

## 起動

```bash
npm install
npx prisma migrate dev   # 初回のみ（DBマイグレーション）
npm run start:dev        # 開発サーバー（ホットリロード）
```

## コマンド一覧

```bash
npm run start:dev    # 開発サーバー起動
npm run build        # TypeScript コンパイル
npm run lint         # ESLint（自動修正）
npm run format       # Prettier フォーマット
npm run test         # ユニットテスト
npm run test:cov     # カバレッジ付きテスト
npm run test:e2e     # E2E テスト（backend/.env が必要）
```

特定テストファイルだけ実行:

```bash
npx jest src/accounts/service/account.service.spec.ts
```

## データベース

```bash
npx prisma migrate dev        # マイグレーション作成・適用（開発）
npx prisma migrate deploy     # マイグレーション適用のみ（本番）
npx prisma studio             # DB GUI（ブラウザで確認）
npx prisma generate           # Prismaクライアント再生成
```

## 環境変数

`backend/.env` に以下を設定する（Git管理外）:

| 変数名 | 説明 | デフォルト |
|--------|------|-----------|
| `DATABASE_URL` | SQLite 接続 URL | `file:./prisma/dev.db` |
| `JWT_SECRET` | JWT 署名シークレット | — |
| `FRONTEND_URL` | フロントエンドのベース URL | `http://localhost:3000` |
| `WEBAUTHN_RP_ID` | WebAuthn Relying Party ID | `localhost` |
| `WEBAUTHN_RP_NAME` | WebAuthn Relying Party Name | `webapp` |
| `WEBAUTHN_ORIGIN` | WebAuthn 検証対象 Origin | `http://localhost:3000` |

## API ドキュメント

開発サーバー起動後、`http://localhost:8000/api/docs` で Swagger UI を確認できる。

## アーキテクチャ

詳細は **[../detailed-design/02-architecture.md](../detailed-design/02-architecture.md)** を参照。
