# テスト結果: 自分に関連するデータのみ表示するフィルタリング機能

- 日付: 2026-07-12

## 実行コマンド
```
cd backend && npm run test -- --no-coverage
cd backend && npm run lint
cd backend && npm run build
```

## テスト結果
- 合格: 131件
- 失敗: 0件
- スキップ: 0件

## Lint
- エラー: 0件

## ビルド
- 成功

## 更新テストファイル
- src/tasks/repository/task.repository.spec.ts — findAll(username) / findAllCategories(username) テスト追加・更新
- src/events/repository/event.repository.spec.ts — findAll(username) テスト追加・更新
- src/events/service/event.service.spec.ts — findAll('testuser') 引数追加・eslint修正
