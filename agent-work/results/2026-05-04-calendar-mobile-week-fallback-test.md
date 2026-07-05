# カレンダースマホ週→日フォールバック テスト結果

- 日付: 2026-05-04
- 機能名: スマホカレンダー週ビュー文字被り修正

## テスト対象ファイル

- `frontend/src/pages/CalendarPage.tsx`
- `frontend/src/components/CalendarViewToggle.tsx`
- `frontend/src/index.css`

## 生成したテストファイル

- `frontend/src/hooks/useIsMobile.spec.ts` — 新規作成
- `frontend/src/components/CalendarViewToggle.spec.tsx` — 新規作成
- `frontend/src/pages/CalendarPage.spec.tsx` — 新規作成

## 実行コマンド

```bash
cd frontend && CI=true npx react-scripts test --watchAll=false
```

## テスト結果

| スイート | 結果 |
|---|---|
| useIsMobile.spec.ts | PASS |
| CalendarViewToggle.spec.tsx | PASS |
| CalendarPage.spec.tsx | PASS |
| (既存) useCalendar.spec.ts | PASS |
| (既存) useTaskList.spec.ts | PASS |
| (既存) useTaskList.test.ts | PASS |
| (既存) TaskListPage.spec.tsx | PASS |
| (既存) taskValidation.spec.ts | PASS |
| (既存) App.test.tsx | PASS |

合格: 112件 / 失敗: 0件 / スキップ: 0件

## テストカバレッジ内容

### useIsMobile.spec.ts（6件）

- 画面幅 639px のとき true を返す
- 画面幅 640px のとき false を返す
- 画面幅 1024px のとき false を返す
- resize イベントで 1024px → 375px に変わると true になる
- resize イベントで 375px → 768px に変わると false になる
- アンマウント後は resize イベントを受け取らない（リークなし）

### CalendarViewToggle.spec.tsx（10件）

- PC 表示: 月・週・日の3ボタンがすべて表示される
- PC 表示: currentView に応じてアクティブスタイルが付く（月/週/日）
- PC 表示: 各ボタンクリックで onChange が正しい view 名で呼ばれる
- スマホ表示: 「週」ボタンが非表示になる
- スマホ表示: 「月」「日」ボタンは表示される
- スマホ表示: 「月」ボタンクリックで onChange(dayGridMonth) が呼ばれる
- isMobile デフォルト値が false のとき週ボタンが表示される

### CalendarPage.spec.tsx（8件）

- スマホ時（isMobile=true）は「週」ボタンが非表示になる
- PC 時（isMobile=false）は「週」ボタンが表示される
- スマホで currentView=timeGridWeek のとき setCurrentView(timeGridDay) が呼ばれる
- スマホで currentView=dayGridMonth のとき setCurrentView は呼ばれない
- PC で currentView=timeGridWeek のとき setCurrentView は呼ばれない
- isMobile が true→false に変化したとき setCurrentView は呼ばれない
- loading=true のとき「読み込み中...」が表示される
- loading=false のとき FullCalendar が表示される

## 備考

- `act(...)` 警告が既存テスト（useTaskList.spec.ts / useCalendar.spec.ts）で出ているが、これは今回の実装変更とは無関係の既存の警告であり、テストは全件 PASS している。
