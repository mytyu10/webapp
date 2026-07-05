# テスト結果: calendar-event-multi-date-repeat

日付: 2026-07-05

## バックエンド

### 実行コマンド
```
cd backend && npx jest src/events/service/event.service.spec.ts --forceExit
cd backend && npm run test -- --forceExit
```

### 結果
- 合格: 35件（event.service.spec.ts 単体）
- 全体: 122件合格 / 0件失敗

### 新規追加テスト（event.service.spec.ts）
- createMultiple: 5件（正常作成・duration計算・空配列エラー・100件超エラー・DBエラー）
- createRepeat daily: 3件（count指定・interval=2・end_date指定）
- createRepeat weekly: 2件（曜日未指定・days_of_week=[1,3]）
- createRepeat monthly: 2件（毎月同日・月末補正）
- createRepeat バリデーション: 2件（0件エラー・100件超エラー）

## フロントエンド

### 実行コマンド
```
cd frontend && npx react-scripts test --watchAll=false --forceExit
```

### 結果
- 合格: 138件 / 失敗: 1件（既存の taskValidation.spec.ts の失敗、今回の変更と無関係）

### 新規追加テスト
- eventValidation.spec.ts（新規作成）: 22件（validateEventForm・validateMultipleEventForm・validateRepeatEventForm）
- useCalendar.spec.ts 追記: 4件（handleCreateMultipleEvents 正常/エラー・handleCreateRepeatEvent 正常/エラー）
- CalendarPage.spec.tsx 更新: モックファクトリーに新ハンドラ追加（既存テスト維持）

### 既存失敗について
- `taskValidation.spec.ts`: 「担当者が空の場合はエラーなし」→ 今回の変更前から存在する失敗。今回の実装とは無関係
