# task-queue バッチ処理方式 テスト結果

- 日付: 2026-05-03
- 機能名: タスク更新処理のキュー→バッチ形式変更
- ステータス: 全テスト通過

## 実行コマンド

```bash
# 個別テスト
npx jest src/tasks/service/task.service.spec.ts --no-coverage
npx jest src/tasks/service/task-queue.service.spec.ts --no-coverage

# 全体テスト
npx jest --no-coverage
```

## テスト結果サマリー

| スイート | 件数 | 結果 |
|---|---|---|
| task.service.spec.ts | 22 | 全通過 |
| task-queue.service.spec.ts | 5 | 全通過 |
| jwt-auth.guard.spec.ts | 10 | 全通過 |
| task.repository.spec.ts | 7 | 全通過 |
| **合計** | **44** | **全通過** |

## 新規追加テスト: task-queue.service.spec.ts

### テストケース一覧

1. `enqueue した関数が BATCH_WINDOW_MS 後に実行される`
   - タイマー前は未実行であることを確認
   - 100ms 後にバッチ処理されることを確認

2. `バッチウィンドウ内の複数 enqueue は 1 回のフラッシュでまとめて処理される`
   - 3件同時エンキューがまとめて処理されることを確認

3. `ジョブが失敗した場合は reject され、他のジョブの処理は続行される`
   - 失敗ジョブの後続ジョブも正常に実行されることを確認
   - Promise.allSettled を先に登録してから advanceTimers を呼ぶことで unhandled rejection を回避

4. `enqueue の戻り値は関数の戻り値と一致する`
   - enqueue が関数の戻り値をそのまま返すことを確認

5. `フラッシュ中に追加されたジョブは次のバッチで処理される`
   - flushing 中のエンキューが次のバッチウィンドウで処理されることを確認

## 変更ファイル

- `backend/src/tasks/service/task-queue.service.spec.ts` — 新規作成（5件）
