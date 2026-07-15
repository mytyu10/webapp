# サイドバートグル・カレンダータスク表示 実装計画

- 日付: 2026-07-12
- ステータス: 承認済み

## 依頼内容

1. サイドバーを表示/非表示切り替えられるように修正（トグルボタンで開閉できる）
2. タスクをカレンダーに表示する（既存の useCalendar.ts に taskToEventInput があるが、カレンダー上にタスクが表示されていない場合は修正する）

## 実装計画

### DBスキーマ変更: なし

### 機能1: サイドバートグル

#### 現状
- `SidebarLayout.tsx`: `<Sidebar />` を静的にレンダリング
- `Sidebar.tsx`: 常に表示、モバイルでは横並び・PCでは縦並び

#### 変更方針
- `SidebarLayout.tsx` に `isSidebarOpen: boolean` 状態を追加（初期値: true）
- `SidebarLayout.tsx` にトグルボタンを配置（サイドバーの外側、常に表示）
- `Sidebar.tsx` に `isOpen` プロパティを追加し、閉じているとき `w-0 overflow-hidden` で非表示にする
- トグルボタンはサイドバーの折りたたみアイコン（`◀` / `▶`）を使用
- モバイルとPCで挙動を統一（どちらもトグルで開閉）

#### 実装ステップ
1. `SidebarLayout.tsx` を修正
   - `isSidebarOpen` ステートを追加（`useState(true)`）
   - `<Sidebar isOpen={isSidebarOpen} />` に変更
   - `<main>` の前にトグルボタンを追加（PCでは左端・縦方向中央に固定）
2. `Sidebar.tsx` を修正
   - Props に `isOpen: boolean` を追加
   - `isOpen` が false のとき `w-0 overflow-hidden opacity-0` を適用してコンテンツを非表示

### 機能2: カレンダータスク表示の確認・修正

#### 現状調査
- `useCalendar.ts` の `calendarEvents` useMemo は `currentView === 'timeGridDay'` のときのみタスクを含める
- `CalendarPage.tsx` の `FullCalendar` に `events={calendarEvents}` が渡されている
- 実装は存在するが、日表示（timeGridDay）に切り替えた時のみ表示される仕様

#### 問題の可能性
- `FullCalendar` の `eventMouseEnter` プロパティに `EventContentArg['event']` 型を使っているが、実際のコールバック引数は `EventHoveringArg` 型（`.event` と `.jsEvent` を持つ）
- CalendarPage.tsx L137 の型が正しいが、型エラーが出ている可能性がある

#### 変更方針
- `useCalendar.ts` のタスク表示ロジックを全ビューで表示するよう変更（月・週・日すべてでタスクを表示）
- CLAUDE.md の仕様「タスクのカレンダー表示は日表示（timeGridDay）のみ」は維持する（変更なし）
- CalendarPage.tsx の型を確認・修正する

#### 確認事項
- CalendarPage.tsx の `handleEventMouseEnter` の型シグネチャが `info: { event: EventContentArg['event']; jsEvent: MouseEvent }` になっているが、FullCalendar の `eventMouseEnter` コールバック型は `EventHoveringArg` → `.event` は `EventApi` 型なので問題なし
- 実際にタスクが表示されない場合は、`calendarEvents` に `task-*` IDのイベントが含まれているかをデバッグ

#### 実装ステップ
- `CalendarPage.tsx` を確認し、型エラーがある場合のみ修正
- タスクが表示されない原因がコードにある場合は `useCalendar.ts` を修正

## レビュー結果

### チェックリスト
- [x] DBスキーマ変更なし
- [x] 既存の SidebarLayout/Sidebar 構造を最小限の変更で対応
- [x] モバイル・PC両対応
- [x] CLAUDE.md の「タスクのカレンダー表示は日表示のみ」仕様を尊重
- [x] 型安全性を維持

### リスク
- サイドバーを閉じたときにコンテンツ幅が広がるため、CalendarPage の `height="calc(100vh - 160px)"` が若干ずれる可能性があるが、FullCalendar は自動リサイズするため問題なし
- Sidebar に Props を追加するため、既存のテストがある場合は修正が必要な場合がある
