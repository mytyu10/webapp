# 自分に関連するデータのみ表示するフィルタリング機能 実装計画

- 日付: 2026-07-12
- ステータス: 承認済み

## 依頼内容
タスクもカレンダーもリンク集も、自身が作成もしくは割り当てられているものだけ表示するようにする。

具体的には:
- タスク: ログインユーザーが `created_by` または `assignees` に含まれるものだけ取得・表示する
- カレンダー予定: ログインユーザーが `created_by` であるものだけ取得・表示する
- リンク集: ログインユーザーが `created_by` であるものだけ取得・表示する

バックエンドのクエリ条件でフィルタリングすること。

## 実装計画

### DBスキーマ変更: なし

### バックエンド変更ステップ

1. TaskRepository.findAll に username フィルタを追加
   - OR条件: created_by === username OR assignees に username が含まれる
2. TaskRepository.findAllCategories に username フィルタを追加
3. TaskService.findAll・findAllCategories に username 引数を追加
4. TaskController.findAll・getCategories で req.user.username を service に渡す
5. EventRepository.findAll に username フィルタを追加（created_by のみ）
6. EventService.findAll に username 引数を追加
7. EventController.findAll で req.user.username を渡す
8. LinkRepository.findAll に username フィルタを追加（created_by のみ）
9. LinkService.findAll に username 引数を追加
10. LinkController.findAll で req.user.username を渡す

### フロントエンド変更: なし

## レビュー結果

- Controller → Service → Repository の流れに沿った正しい変更範囲
- DBスキーマ変更なし（マイグレーション不要）
- 既存テストの findAll / findAllCategories の検証条件を更新が必要
- リスク: TaskRepository テストの where 条件が変わるため更新必要
