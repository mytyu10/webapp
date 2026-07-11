# カレンダー予定カラー選択 実装計画

- 日付: 2026-07-12
- ステータス: 承認済み

## 依頼内容
カレンダー機能の予定作成時に色をつけることができるようにしたい。現在のアプリのテーマに合う色で、視認性が高い色を6種類選定して実装する。

## 実装計画

### 選定する6色
1. シアン（デフォルト）: bg=#0e7490 / text=#cffafe
2. インディゴ: bg=#4338ca / text=#e0e7ff
3. エメラルド: bg=#047857 / text=#d1fae5
4. バイオレット: bg=#6d28d9 / text=#ede9fe
5. ローズ: bg=#be123c / text=#ffe4e6
6. アンバー: bg=#b45309 / text=#fef3c7

### DBスキーマ変更: あり
- Event モデルに `color String @default("cyan")` を追加
- マイグレーション名: add-event-color

### バックエンド実装ステップ
1. schema.prisma — Event モデルに color フィールド追加
2. event.dto.ts — 各 DTO に color?: string 追加。EventResponseDto に color: string 追加
3. event.repository.ts — create/createMany/update/updateMany で color をサポート
4. event.service.ts — create/createMultiple/createRepeat/update/updateRepeatGroup で color を処理。toResponseDto に color を含める

### フロントエンド実装ステップ
1. eventApi.ts — CalendarEvent に color 追加。EventInput/MultipleEventInput/RepeatEventInput に color? 追加
2. EventModal.tsx — 色選択 UI を追加（6色のカラーパレット。全モードで共通）
3. useCalendar.ts — calendarEventToEventInput で event.color をもとに背景色・テキスト色を決定
4. eventValidation.ts — バリデーション型に color? 追加

## レビュー結果
- 既存予定との後方互換性: `color @default("cyan")` により既存データは自動的に cyan になる
- color はオプションで受け取りサービス側でデフォルト（"cyan"）を適用する
- 色の値はフロントエンドで EVENT_COLORS 定数として管理し、不正値が入らないよう制御する
