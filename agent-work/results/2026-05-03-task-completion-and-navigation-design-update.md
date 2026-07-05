# 設計書更新結果: タスク完了切り替え・子タスク非表示・並び順・カテゴリ引き継ぎ・親子ナビゲーション

- 日付: 2026-05-03

## 更新した設計書

| 設計書 | 更新内容 |
|--------|---------|
| detailed-design/01-overview.md | 実装済み機能テーブルにタスク管理機能（一覧・作成・編集・削除・詳細・完了切り替え・子タスク・ナビゲーション）を追記 |
| detailed-design/03-database.md | Prismaスキーマを現行実装に全面更新（Account に created_tasks リレーション追加、Task に priority / category / parent_id / created_by / is_completed フィールド追加、自己参照リレーション追加）。Task テーブル定義に全フィールドを追記。TaskRepository の findAll を `parent_id: null` フィルタ・due_date 昇順・children include に更新、findAllCategories メソッドを追加 |
| detailed-design/04-api.md | GET /tasks に子タスク非表示・due_date 昇順の仕様を追記。POST /tasks リクエストボディに priority / category / parent_id / created_by を追記。PATCH /tasks/:id リクエストボディに priority / category / parent_id / is_completed を追記。CreateTaskDto / UpdateTaskDto / TaskResponseDto を現行実装に合わせて全面更新（is_completed / children / priority / category 等を追加） |
| detailed-design/05-frontend.md | TaskListPage のコンポーネントツリーにカテゴリフィルター・完了切り替えボタン・toggleCompleteError を追記。TaskDetailPage のコンポーネントツリーに「← 親タスクへ」リンク・子タスククリッカブルリンク・作成者表示・優先度バッジを追記。useTaskList の state に filteredTasks / categories / selectedCategory / deleteError / toggleCompleteError を追加、handleToggleComplete / setSelectedCategory 関数とソートロジック（getEffectiveDueDate）を追記。useTaskForm の動作モード表（新規作成・子タスク作成・編集）と子タスク作成時のカテゴリ引き継ぎ仕様を追記。taskApi.ts の API通信テーブルに fetchCategories / toggleTaskCompletion / getCurrentUsername を追加、Task インターフェースと定数・ユーティリティを追記 |

## 更新しなかった設計書

| 設計書 | 理由 |
|--------|------|
| detailed-design/02-architecture.md | 新モジュール・ディレクトリの追加なし。既存のレイヤー構成・ディレクトリ構成に変更なし |
| detailed-design/06-auth-flow.md | 認証・認可フローに変更なし |
