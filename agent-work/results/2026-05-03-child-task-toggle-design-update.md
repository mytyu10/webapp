# 設計書更新結果: 子タスクトグル表示機能

- 日付: 2026-05-03

## 更新した設計書

| 設計書 | 更新内容 |
|--------|---------|
| detailed-design/05-frontend.md | `TaskListPage` セクションに子タスクトグル表示機能の仕様を追記・修正。具体的には: (1) 責務説明にトグル機能の概要を追加、(2) コンポーネントツリー図を `isNodeHidden` フィルター適用・`renderTaskCard` の depth 別分岐を反映した形に更新、(3) `DEPTH_INDENT_CLASSES` の説明に `DEPTH_INDENT_FALLBACK_CLASS` の使用条件を追記、(4) 子タスクトグル関連定数テーブル（`TOGGLE_BUTTON_WIDTH_CLASS` / `MAX_TREE_DEPTH` / `DEPTH_INDENT_FALLBACK_CLASS`）を新規追加、(5) `isNodeHidden` 純粋関数のシグネチャと判定ロジックを新規追加、(6) `collapsedParentIds` ローカルステートテーブルを新規追加、(7) `toggleCollapse` ローカル関数テーブルを新規追加 |

## 更新しなかった設計書

| 設計書 | 理由 |
|--------|------|
| detailed-design/01-overview.md | 今回の変更は既存機能（タスク一覧）の UI 改善であり、新機能追加・技術スタック変更・環境変数追加はない |
| detailed-design/02-architecture.md | 新モジュール・サービス・ディレクトリの追加やレイヤー構成の変更はない |
| detailed-design/03-database.md | Prisma モデルの追加・変更はない |
| detailed-design/04-api.md | エンドポイント・DTO・レスポンス仕様の変更はない |
| detailed-design/06-auth-flow.md | 認証・認可フローの変更はない |
