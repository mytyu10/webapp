# カレンダータスク期限終了時刻変更 テスト結果

- 日付: 2026-05-04
- 機能名: カレンダーのタスク表示 start/end 変更（期限が終了時刻）
- テスト対象ファイル: `frontend/src/hooks/useCalendar.ts`
- テストファイル: `frontend/src/hooks/useCalendar.spec.ts`（新規作成）

## 実行コマンド

```bash
cd frontend && CI=true npx react-scripts test --testPathPattern="src/hooks/useCalendar.spec.ts" --no-coverage
```

## テスト結果サマリー

- 合格: 19件
- 失敗: 0件
- スキップ: 0件

## テストケース一覧

### useCalendar（基本動作）
- [x] 初期状態でローディングが true になる
- [x] 予定・タスク取得成功後に state が更新される
- [x] データ取得失敗時に error がセットされる

### calendarEvents（FullCalendar用イベント配列）
- [x] dayGridMonthビューではタスクを含めず予定のみを返す
- [x] timeGridWeekビューでもタスクを含めない
- [x] timeGridDayビューでは予定とタスクの両方を含む

### taskToEventInput — start/end の時刻変換（今回の変更の核心）
- [x] タスクの end が due_date と一致する（期限が終了時刻）
- [x] タスクの start が due_date の1時間前になる
- [x] 未完了タスクは紫系の背景色になる
- [x] 完了済みタスクはグレー系の背景色になる
- [x] タスクイベントの extendedProps に type: task がセットされる
- [x] タスクイベントのタイトルに「[タスク]」プレフィックスが付く

### handleCreateEvent
- [x] 予定を作成してローカルステートに追加する
- [x] 予定作成失敗時に例外をスローする

### handleUpdateEvent
- [x] 予定を更新してローカルステートを置き換える
- [x] 予定更新失敗時に例外をスローする

### handleDeleteEvent
- [x] 予定を削除してローカルステートから除去する
- [x] 予定削除失敗時に例外をスローする

### reload
- [x] reload を呼ぶと fetchEvents・fetchTasks が再実行される

## 備考

- `act()` 警告が出力されるが、これは既存の useTaskList テストでも同様に発生しており、テスト自体には影響しない（PASS）
- `.spec.ts` ファイルは `npx jest` では TypeScript 型注釈を Babel がパースできないため、`react-scripts test` で実行する必要がある
