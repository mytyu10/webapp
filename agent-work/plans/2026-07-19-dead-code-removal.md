# dead-code-removal 実装計画

- 日付: 2026-07-19
- ステータス: 承認済み

## 依頼内容
デッドコードを削除する。未使用定数・ファイル・重複型定義を削除する。

## 実装計画

### DBスキーマ変更: なし
### フロントエンド変更: なし

### バックエンド変更

1. `backend/src/common/type/message.ts` から以下を削除
   - `MESSAGE.AUTH.LOGIN_SUCCESS: 'ログイン成功'`
   - `MESSAGE.TASK.UPDATE_SUCCESS: 'タスクを更新しました'`
   - `MESSAGE.PERMISSION.FETCH_SUCCESS: '権限一覧を取得しました'`

2. `backend/src/common/type/string.constants.ts` をファイルごと削除

3. `backend/src/events/dto/event.dto.ts` の末尾から `ProxyGrantResponseDto` インターフェース定義を削除
   （実際に使われているのは `event-proxy-grant.service.ts` 内の同名インターフェース）

## レビュー結果
- 各定数の参照箇所をプロジェクト全体で grep 確認済み（未参照を確認）
- string.constants.ts は一度もimportされていないことを確認済み
- event.dto.ts の ProxyGrantResponseDto はコントローラーから参照されていないことを確認済み
- リスクなし
