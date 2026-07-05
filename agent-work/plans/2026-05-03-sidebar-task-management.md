# サイドバーレイアウト + タスク管理 実装計画

- 日付: 2026-05-03
- ステータス: 承認済み

## 依頼内容

ログイン完了後の画面を実装する。

1. サイドバーレイアウト（ログイン後の全画面共通）
   - ログイン後のすべての画面に共通するサイドバーを作成する
   - サイドバーに各画面へのリンクを配置し、クリックで画面遷移できるようにする

2. タスク管理画面
   - タスクの登録・削除・編集・詳細表示ができる
   - タスクには以下のフィールドを持たせる:
     - 期限（日時）
     - 説明文
     - 割り当て（複数ユーザーを割り当て可能）

## 実装計画

### DBスキーマ変更: あり

`backend/prisma/schema.prisma` に `Task`・`TaskAssignee` モデルを追加し、`Account` にリレーションを追加する。

### バックエンド実装ステップ

1. `backend/prisma/schema.prisma` 更新 — `Task`・`TaskAssignee` モデル追加、`Account` にリレーション追加
2. `backend/src/common/type/message.ts` 更新 — タスク操作のメッセージ定数追加
3. `backend/src/tasks/dto/task.dto.ts` 作成 — CreateTaskDto・UpdateTaskDto・TaskResponseDto
4. `backend/src/tasks/repository/task.repository.ts` 作成 — Prisma CRUD操作
5. `backend/src/tasks/service/task.service.ts` 作成 — ビジネスロジック
6. `backend/src/tasks/controller/task.controller.ts` 作成 — REST エンドポイント（GET/POST/PATCH/DELETE）、JwtAuthGuard適用
7. `backend/src/tasks/module/task.module.ts` 作成 — モジュール定義
8. `backend/src/jwt/jwt-auth.guard.ts` 作成 — JWT検証Guard（jsonwebtokenのverifyを使用）
9. `backend/src/app.module.ts` 更新 — TasksModule をimportに追加

### フロントエンド実装ステップ

1. `frontend/.env` 更新 — 環境変数が未定義の場合は追記
2. `frontend/src/components/Sidebar.tsx` 作成 — サイドバーコンポーネント（タスク管理リンク・ログアウト）
3. `frontend/src/components/SidebarLayout.tsx` 作成 — サイドバー付きレイアウト（Outlet使用）
4. `frontend/src/components/PrivateRoute.tsx` 作成 — JWT存在チェック + expデコードによる有効期限検証、無効時は/loginへリダイレクト
5. `frontend/src/api/taskApi.ts` 作成 — タスクAPI通信（Authorizationヘッダー付き）
6. `frontend/src/validation/taskValidation.ts` 作成 — タスクフォームバリデーション
7. `frontend/src/hooks/useTaskList.ts` 作成 — タスク一覧・削除フック
8. `frontend/src/hooks/useTaskForm.ts` 作成 — タスクフォームフック
9. `frontend/src/pages/TaskListPage.tsx` 作成 — タスク一覧画面
10. `frontend/src/pages/TaskFormPage.tsx` 作成 — タスク作成・編集画面
11. `frontend/src/pages/TaskDetailPage.tsx` 作成 — タスク詳細画面
12. `frontend/src/pages/HomePage.tsx` 更新 — タスク一覧へリダイレクト
13. `frontend/src/App.tsx` 更新 — PrivateRoute・SidebarLayout・新規ルート追加

### マイグレーション

`npx prisma migrate dev --name add-task-assignee` を `backend/` で実行

## レビュー結果

### チェックリスト

| # | 確認項目 | 結果 |
|---|---------|------|
| 1 | アーキテクチャ規約（Controller→Service→Repository）に従っているか | OK |
| 2 | DBアクセスがRepositoryレイヤーに集約されているか | OK |
| 3 | JWTGuardの実装方針が既存のjwt.service.tsと整合しているか | OK |
| 4 | フロントエンド規約（pages/hooks/api/validation分離）に従っているか | OK |
| 5 | 共通コンポーネント（FormCard等）を再利用しているか | OK |
| 6 | Tailwind CSSのみを使用しているか | OK |
| 7 | メッセージ定数をmessage.tsに集約しているか | OK |
| 8 | any型を使用していないか | OK |
| 9 | Prismaスキーマの命名規則に従っているか | OK |
| 10 | API接続先を環境変数から構築しているか | OK |
| 11 | PrivateRouteでJWT有効期限(exp)を検証しているか | OK |

### リスク・注意点

1. SQLite制約: DateTime型はSQLiteでは文字列として保存される。now()デフォルト値の動作確認が必要。
2. JWT Guard: CanActivateインターフェースを直接実装し、Bearerトークンを抽出してverifyする。
3. TaskAssignee複合主キー: 担当者の更新時はdelete+insertで対応する。
4. PrivateRoute: JWTをデコードしてexpを検証し、期限切れ・トークン未存在の場合は/loginへリダイレクトする。
