# 設計書更新結果: closed_by・編集ボタン常時表示

- 日付: 2026-05-03

## 更新した設計書

| 設計書 | 更新内容 |
|--------|---------|
| `CLAUDE.md` | Task スキーマに `closed_by String?` を追記。`jwt-auth.guard.ts` の説明に `request.user` セットを追記。`src/types/express.d.ts` を新規ファイルとして追記。`TaskListPage` の説明を「削除は作成者のみ・編集は全ユーザー」に修正。`TaskDetailPage` の説明に `closed_by` 表示・編集ボタン全ユーザー表示を反映。`task.dto.ts` の説明に `closed_by` を追記 |
| `.claude/guidelines/conventions.md` | アクセス制御ルールを「削除は作成者のみ・編集は全ユーザー」に変更。Task スキーマ定義に `closed_by String?` を追記。`closed_by` 自動制御ルール（false→true でセット、true→false でクリア）を追記 |
| `detailed-design/01-overview.md` | 実装済み機能表に「タスク完了時のクローズユーザー記録（`closed_by`）・表示」を追記 |
| `detailed-design/02-architecture.md` | バックエンドディレクトリ構成に `src/types/express.d.ts` を追記。`jwt-auth.guard.ts` の説明に `request.user` セットを追記 |
| `detailed-design/03-database.md` | Task モデルのスキーマ定義に `closed_by String?` を追記。テーブル定義表に `closed_by` カラムを追記 |
| `detailed-design/04-api.md` | `JwtAuthGuard` 仕様表に「検証成功時 `request.user` へペイロードをセット」と型拡張ファイルの説明を追記。`PATCH /tasks/:id` の説明文・処理フロー・`closed_by` 自動制御テーブルを追記。`TaskResponseDto` に `closed_by: string \| null` を追記 |
| `detailed-design/05-frontend.md` | `TaskDetailPage` の編集ボタン表示条件を「全ユーザー」に修正。完了済みバナーに `closed_by` 表示仕様を追記。`TaskCard` のアクションボタン説明を「編集は全ユーザー・削除は `isOwner` のみ」に修正し `closed_by` 表示仕様を追記。`Task` インターフェースに `closed_by: string \| null` を追記 |

## 更新しなかった設計書

| 設計書 | 理由 |
|--------|------|
| `detailed-design/06-auth-flow.md` | ログイン・登録・ログアウトフローに変更なし。JwtAuthGuard の `request.user` セットは既存フローの延長であり、認証フロー自体には影響しない |
