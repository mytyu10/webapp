# リソース権限・認可フレームワーク テスト結果

- 日付: 2026-07-15
- 機能名: resource-permissions（TaskPermission / LinkPermission テーブル + OwnershipGuard）

## 実行コマンド

```bash
cd /Users/yuto/workspace/webapp/backend
npx jest --no-coverage
npm run build
```

## テスト結果

### バックエンド単体テスト

```
Test Suites: 9 passed, 9 total
Tests:       131 passed, 131 total
Snapshots:   0 total
Time:        2.099 s
```

**全131件合格、失敗なし**

### TypeScript ビルド

```
> backend@0.0.1 build
> nest build
```

**エラーなし・警告なし**

## 修正内容（テスト実行中に発生した問題）

### 1. task.repository.spec.ts（事前に修正済み）

- `findAll` / `findAllCategories` の OR 条件に `{ permissions: { some: { username: 'testuser' } } }` が追加されたため、テストの期待値を更新した

### 2. event.service.spec.ts

**問題:** `EventService.update` と `EventService.remove` のシグネチャ変更に伴い、テストがコンパイルエラー・実行失敗していた

| 変更前 | 変更後 |
|---|---|
| `update(id, dto, requestUsername)` | `update(id, dto)` — 認可は OwnershipGuard が担当 |
| `remove(id, requestUsername)` | `remove(id)` — 認可は OwnershipGuard が担当 |

**修正内容:**
1. `update` describe ブロック内の ForbiddenException テスト（「作成者以外が更新しようとすると ForbiddenException をスローする」）を削除
2. `remove` describe ブロック内の ForbiddenException テスト（「作成者以外が削除しようとすると ForbiddenException をスローする」）を削除  
3. 全 `service.update(id, dto, 'testuser')` 呼び出しを `service.update(id, dto)` に変更
4. 全 `service.remove(id, 'testuser')` 呼び出しを `service.remove(id)` に変更

**備考:** `updateRepeatGroup` の ForbiddenException テストは引き続き有効（サービス層でグループ全件チェックのため OwnershipGuard では対処できない）

## カバレッジ

（`--no-coverage` フラグで実行のため省略）

## 合格: 131件 / 失敗: 0件 / スキップ: 0件
