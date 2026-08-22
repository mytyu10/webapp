# frontend

React フロントエンド（Create React App）。ポート 3000 で起動する。

## 起動

```bash
npm install
npm start        # 開発サーバー起動（localhost:3000）
```

## コマンド一覧

```bash
npm start            # 開発サーバー起動
npm test             # テスト実行（インタラクティブ）
npm run build        # 本番ビルド
```

## 環境変数

`.env` または `.env.local` に以下を設定する:

| 変数名 | 説明 | デフォルト |
|--------|------|-----------|
| `REACT_APP_API_SCHEME` | バックエンド通信スキーム | `http` |
| `REACT_APP_API_HOST` | バックエンドホスト | `localhost` |
| `REACT_APP_API_PORT` | バックエンドポート | `8000` |

## ディレクトリ構成

```
src/
├── App.tsx                  # ルーター定義
├── api/                     # バックエンド API 通信
│   ├── accountApi.ts
│   ├── taskApi.ts
│   ├── eventApi.ts
│   ├── linkApi.ts
│   ├── permissionApi.ts
│   └── chatApi.ts
├── hooks/                   # カスタムフック
│   ├── useTaskList.ts
│   ├── useTaskForm.ts
│   ├── useTaskDetail.ts
│   ├── useCalendar.ts
│   ├── useLinkList.ts
│   ├── useLinkForm.ts
│   ├── useChat.ts
│   ├── useWebAuthn.ts
│   └── useIsMobile.ts
├── pages/                   # ページコンポーネント
│   ├── LoginPage.tsx
│   ├── TaskListPage.tsx
│   ├── TaskFormPage.tsx
│   ├── TaskDetailPage.tsx
│   ├── CalendarPage.tsx
│   ├── LinkListPage.tsx
│   ├── ChatPage.tsx
│   └── WebAuthnRegisterPage.tsx
├── components/              # 共通コンポーネント
├── validation/              # フォームバリデーション
└── types/                   # 型定義
```

## アーキテクチャ

詳細は **[../detailed-design/05-frontend.md](../detailed-design/05-frontend.md)** を参照。
