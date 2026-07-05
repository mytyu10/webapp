# カレンダータスク期限表示修正 実装計画

- 日付: 2026-05-04
- ステータス: 承認済み

## 依頼内容

カレンダーに表示されるタスクは、期限が終了になるように設定して。

## 確認済み仕様

- イベントの終了時刻 = `due_date`（期限）
- start: `due_date - 1時間`
- end: `due_date`

## 実装計画

**変更対象ファイル:** `frontend/src/hooks/useCalendar.ts`

**変更内容:**
- 現在: `start = due_date`、`end = due_date + 1時間`
- 変更後: `start = due_date - 1時間`、`end = due_date`

DBスキーマ変更・バックエンド変更はなし。

## レビュー結果

- 判定: 承認
- 変更スコープ: `taskToEventInput` 関数内の2行のみ（最小限）
- リスク: 低（表示専用の変換関数）
- 注意点: JsDocコメントも合わせて修正すること（「due_dateをstart、due_date+1時間をend」の記述を修正）
