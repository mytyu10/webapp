# 設計書更新結果: CORS設定・レスポンシブ対応・APIベースURL変更

- 日付: 2026-05-04

## 更新した設計書

| 設計書 | 更新内容 |
|--------|---------|
| `detailed-design/01-overview.md` | バックエンド環境変数テーブルに `CORS_ORIGIN` を追加（デフォルト値・動作説明・`.env.local` の読み込み順を注釈で追記）。フロントエンド環境変数の説明に `REACT_APP_API_HOST` が空の場合の相対URLフォールバックと CRA プロキシの説明を追記 |
| `detailed-design/04-api.md` | 共通仕様のCORS許可オリジン行を「環境変数 `CORS_ORIGIN` で制御」に変更し、`*` / カンマ区切り / 単一オリジンの動作詳細テーブルを追記。`AllExceptionsFilter` の説明に `console.error` によるエラーログ出力（デバッグ用）を追記 |
| `detailed-design/05-frontend.md` | `SidebarLayout` のレイアウト説明をレスポンシブ対応版に更新（スマホ: `flex-col` / PC: `flex-row`、パディング差分）。`Sidebar` の説明をレスポンシブ対応版に更新（スマホ: 上部ナビバー / PC: 左サイドバー `w-60`）。共通コンポーネントセクションの `SidebarLayout` / `Sidebar` も同様に更新。`accountApi.ts` のAPIベースURL構築ロジックを `REACT_APP_API_HOST` が空の場合に `''`（空文字）へフォールバックするコードに変更し、`taskApi.ts` / `eventApi.ts` も同じロジックを使用する旨を追記 |

## 更新しなかった設計書

| 設計書 | 理由 |
|--------|------|
| `detailed-design/02-architecture.md` | 今回の変更はモジュール・ディレクトリ構成・レイヤー構成に影響しない |
| `detailed-design/03-database.md` | Prismaスキーマ・テーブル定義に変更なし |
| `detailed-design/06-auth-flow.md` | 認証・認可フローに変更なし |
