# 実装計画: カレンダー予定の複数日付・繰り返し設定機能追加

## 機能名
calendar-event-multi-date-repeat

## 依頼内容
カレンダー機能に以下を追加する:
1. 予定を複数の日付に一括追加できる（同様の予定を複数日に登録）
2. 繰り返し設定ができる（毎日・毎週・毎月・指定曜日など）

---

## 設計方針

### 「複数日付追加」と「繰り返し設定」の関係を整理

- **複数日付追加**: ユーザーが任意に複数の日付を選択し、同じ内容の予定をそれぞれ独立したイベントとして登録する（例: 1/5, 1/12, 1/25 に同じ会議を入れる）
- **繰り返し設定**: 繰り返しルール（毎週月曜、毎月1日など）を指定して、指定した終了日・回数まで自動生成する

両機能ともバックエンドで複数の `Event` レコードを一括作成する方式とし、DBスキーマ上に繰り返しルールを保持するカラムは追加しない（シンプルさを優先。個別のイベントとして管理し、一括削除や編集の連鎖は対応しない）。

### DBスキーマ変更: なし
既存の `Event` モデルをそのまま使い、バックエンドで複数レコードを一括 INSERT する API エンドポイントを追加する。

---

## 実装ステップ

### バックエンド

1. **DTOに複数日付・繰り返しリクエスト用DTO追加** (`backend/src/events/dto/event.dto.ts`)
   - `CreateMultipleEventsDto`: `title`, `description`, `duration_minutes`（予定の長さ）, `starts: string[]`（開始日時ISO8601配列）を定義
   - `RepeatRule` 型: `{ type: 'daily' | 'weekly' | 'monthly', interval: number, days_of_week?: number[], end_date: string, count?: number }`
   - `CreateRepeatEventDto`: `title`, `description`, `duration_minutes`, `start_at`（最初の開始時刻）, `repeat: RepeatRule` を定義

2. **ServiceにBulk作成メソッド追加** (`backend/src/events/service/event.service.ts`)
   - `createMultiple(dto: CreateMultipleEventsDto, createdBy: string): Promise<EventResponseDto[]>`
     - `starts` 配列をループして各 `start_at + duration_minutes` から `end_at` を算出、`eventRepository.createMany` で一括 INSERT
   - `createRepeat(dto: CreateRepeatEventDto, createdBy: string): Promise<EventResponseDto[]>`
     - `repeat.type` に応じて `start_at` の日付を展開（最大 `count` 件 or `end_date` まで）
     - 展開した日付リストを `createMultiple` 相当の処理に渡して一括作成
     - 最大生成件数のバリデーション（100件超は拒否）

3. **RepositoryにcreateMany追加** (`backend/src/events/repository/event.repository.ts`)
   - `createMany(data: Array<...>): Promise<Event[]>` を `prisma.$transaction` で実装

4. **Controllerにエンドポイント追加** (`backend/src/events/controller/event.controller.ts`)
   - `POST /events/multiple` — 複数日付一括作成
   - `POST /events/repeat` — 繰り返し一括作成

5. **メッセージ定数追加** (`backend/src/common/type/message.ts`)
   - `EVENT.CREATE_MULTIPLE_FAILED`, `EVENT.REPEAT_LIMIT_EXCEEDED` 等

### フロントエンド

6. **APIに複数・繰り返し作成関数追加** (`frontend/src/api/eventApi.ts`)
   - `createMultipleEvents(input: MultipleEventInput): Promise<CalendarEvent[]>`
   - `createRepeatEvent(input: RepeatEventInput): Promise<CalendarEvent[]>`
   - 対応するインターフェース定義

7. **EventModalを拡張** (`frontend/src/components/EventModal.tsx`)
   - 新規作成時にモード選択タブを追加: 「通常」「複数日付」「繰り返し」
   - **複数日付モード**: 日付を複数選択できる UI（`DateTimeField` を追加・削除できる形式）
   - **繰り返しモード**: `SelectField` で繰り返しタイプ選択（毎日・毎週・毎月）、間隔入力、曜日選択チェックボックス（毎週の場合）、終了条件（終了日 or 回数）

8. **バリデーション追加** (`frontend/src/validation/eventValidation.ts`)
   - `validateMultipleEventForm`: 複数日付モード用バリデーション
   - `validateRepeatEventForm`: 繰り返しモード用バリデーション（最大100件制限の事前チェック）

9. **useCalendarフック拡張** (`frontend/src/hooks/useCalendar.ts`)
   - `handleCreateMultipleEvents(input: MultipleEventInput): Promise<void>`
   - `handleCreateRepeatEvent(input: RepeatEventInput): Promise<void>`

10. **CalendarPageへの接続** (`frontend/src/pages/CalendarPage.tsx`)
    - `handleCreateMultipleEvents`, `handleCreateRepeatEvent` を `EventModal` に渡す

---

## DBスキーマ変更: なし

## 影響範囲
- バックエンド: `events` モジュール（DTO, Service, Repository, Controller）, `message.ts`
- フロントエンド: `eventApi.ts`, `EventModal.tsx`, `eventValidation.ts`, `useCalendar.ts`, `CalendarPage.tsx`
