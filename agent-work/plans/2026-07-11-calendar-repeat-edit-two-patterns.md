# カレンダー予定 - 繰り返し編集2パターン対応 + 開始/終了時刻入力への変更 実装計画

- 日付: 2026-07-11
- ステータス: 承認済み

## 依頼内容

繰り返し予定の編集時に「この予定だけ編集」と「繰り返し全件編集」の2パターンを選択できるようにする。
また、予定の時間入力を「開始時間 + 所要時間（分）」から「開始時間 + 終了時間」への変更も同時に実施する。

## 実装計画

### 背景と設計方針

現状、繰り返し予定は個別の Event レコードとして保存されており、グループ識別子がない。「繰り返し全件編集」を実現するには、同じ繰り返しグループに属する予定を特定する必要がある。

対応策として Event に repeat_group_id: String? を追加し、繰り返し作成時に全件に同じUUIDを付与する。単件作成・複数日付作成は repeat_group_id = null のまま。

### DBスキーマ変更: あり

- backend/prisma/schema.prisma の Event モデルに repeat_group_id String? を追加

### バックエンド実装ステップ

1. event.dto.ts:
   - CreateMultipleEventsDto: duration_minutes を廃止し end_times: string[] を追加
   - CreateRepeatEventDto: duration_minutes を廃止し end_at を追加
   - EventResponseDto: repeat_group_id を追加
   - 新規 UpdateRepeatGroupEventDto

2. event.service.ts:
   - createMultiple: end_times 配列で各 end_at を設定。長さ不一致チェック追加
   - createRepeat: end_at 方式に変更。差分ミリ秒で各 end_at を算出。repeat_group_id に UUID 付与
   - 新規 updateRepeatGroup: 全件の created_by 確認後に一括更新

3. event.repository.ts:
   - 新規 findByRepeatGroupId
   - 新規 updateMany ($transaction + 個別 update)

4. event.controller.ts:
   - 新規 PATCH /events/repeat-group/:groupId

5. message.ts:
   - UPDATE_GROUP_SUCCESS / UPDATE_GROUP_FAILED / REPEAT_GROUP_NOT_FOUND / REPEAT_GROUP_FORBIDDEN / START_END_TIMES_LENGTH_MISMATCH を追加

### フロントエンド実装ステップ

6. eventApi.ts:
   - CalendarEvent に repeat_group_id を追加
   - MultipleEventInput: end_times 追加、duration_minutes 廃止
   - RepeatEventInput: end_at 追加、duration_minutes 廃止
   - 新規 UpdateRepeatGroupInput 型 と updateRepeatGroupEvent 関数

7. eventValidation.ts:
   - MultipleEventFormValues: end_times 追加、duration_minutes 廃止
   - RepeatEventFormValues: end_at 追加、duration_minutes 廃止
   - 各バリデーション関数を対応して更新

8. EventModal.tsx:
   - 複数日付モード: 各行に開始日時と終了日時の2列入力に変更
   - 繰り返しモード: DateTimeField で終了日時を追加
   - 編集モード: repeat_group_id がある場合に「この予定だけ変更」/「全て変更」選択UIを表示
   - onSave シグネチャを (input: EventInput, updateScope: 'single' | 'all') => Promise<void> に変更

9. useCalendar.ts:
   - 各ハンドラの引数型を更新
   - 新規 handleUpdateRepeatGroupEvent

10. CalendarPage.tsx:
    - handleModalSave のシグネチャ更新
    - handleUpdateRepeatGroupEvent を useCalendar から受け取り呼び出す

### 影響ファイル

BE: backend/prisma/schema.prisma, backend/src/events/dto/event.dto.ts,
    backend/src/events/service/event.service.ts, backend/src/events/repository/event.repository.ts,
    backend/src/events/controller/event.controller.ts, backend/src/common/type/message.ts
FE: frontend/src/api/eventApi.ts, frontend/src/validation/eventValidation.ts,
    frontend/src/components/EventModal.tsx, frontend/src/hooks/useCalendar.ts,
    frontend/src/pages/CalendarPage.tsx

## レビュー結果

判定: 承認

実装時の注意事項:
1. end_times 配列と start_times の長さ不一致チェック（DTO + Service 両方）
2. グループ全件更新の権限チェックは全件の created_by で確認すること
3. EventModal.onSave シグネチャを (input, updateScope: 'single' | 'all') に変更
4. 繰り返しモードの終了日時は DateTimeField で入力し展開後の各 end_at は差分ミリ秒で算出
5. eventValidation.spec.ts のテストが duration_minutes 廃止で壊れる可能性あり → test-agent フェーズで対応
