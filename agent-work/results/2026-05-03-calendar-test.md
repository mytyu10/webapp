# カレンダー機能 テスト結果

- 日付: 2026-05-03
- ステータス: 全件合格

## 実行コマンド

```bash
cd backend && npx jest --forceExit
```

## テスト結果サマリー

| スイート | 合格 | 失敗 | スキップ |
|---|---|---|---|
| event.service.spec.ts | 17 | 0 | 0 |
| event.repository.spec.ts | 21 | 0 | 0 |
| task.service.spec.ts（既存） | - | 0 | 0 |
| task.repository.spec.ts（既存） | - | 0 | 0 |
| batch-queue.service.spec.ts（既存） | - | 0 | 0 |
| jwt-auth.guard.spec.ts（既存） | - | 0 | 0 |
| **合計** | **82** | **0** | **0** |

Test Suites: 6 passed, 6 total
Tests: 82 passed, 82 total

## 新規テストファイル

### backend/src/events/service/event.service.spec.ts

- findAll: 3件
  - 予定一覧を EventResponseDto の配列で返す
  - 予定が存在しない場合は空配列を返す
  - start_at / end_at が ISO 文字列に変換される
- findById: 3件
  - 指定 ID の予定を EventResponseDto で返す
  - 存在しない ID の場合は NotFoundException をスローする
  - created_at / updated_at が ISO 文字列に変換される
- create: 4件
  - 予定を作成して EventResponseDto を返す
  - repository.create が Date オブジェクトを受け取る
  - description が未指定の場合、空文字列が渡される
  - DB エラー時は InternalServerErrorException をスローする
- update: 7件
  - 作成者が更新すると更新済み EventResponseDto を返す
  - 存在しない ID の場合は NotFoundException をスローする
  - 作成者以外が更新しようとすると ForbiddenException をスローする
  - start_at が指定された場合 Date オブジェクトに変換して repository に渡す
  - end_at が指定された場合 Date オブジェクトに変換して repository に渡す
  - start_at / end_at が未指定の場合 undefined として repository に渡す
  - DB エラー時は InternalServerErrorException をスローする
- remove: 4件
  - 作成者が削除すると正常に完了する
  - 存在しない ID の場合は NotFoundException をスローする
  - 作成者以外が削除しようとすると ForbiddenException をスローする
  - DB エラー時は InternalServerErrorException をスローする

### backend/src/events/repository/event.repository.spec.ts

- findAll: 3件
  - prisma.event.findMany が orderBy: { start_at: "asc" } で呼ばれる
  - 予定一覧を返す
  - 予定が存在しない場合は空配列を返す
- findById: 3件
  - 指定 ID の予定を返す
  - 存在しない ID の場合は null を返す
  - prisma.event.findUnique が where: { id } で呼ばれる
- create: 2件
  - 予定を作成して返す
  - prisma.event.create が正しいデータで呼ばれる
- update: 7件
  - title が指定された場合、prisma.event.update の data に title が含まれる
  - description が指定された場合、prisma.event.update の data に description が含まれる
  - start_at が指定された場合、prisma.event.update の data に start_at が含まれる
  - end_at が指定された場合、prisma.event.update の data に end_at が含まれる
  - undefined のフィールドは prisma.event.update の data に含まれない
  - prisma.event.update が where: { id } で呼ばれる
  - 更新後の予定を返す
- delete: 2件
  - prisma.event.delete が where: { id } で呼ばれる
  - 正常に完了する（戻り値なし）

## 既存テストへの影響

影響なし。全6スイートが引き続き合格。
