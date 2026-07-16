# LINE機能削除 実装計画

- 日付: 2026-07-16
- ステータス: 承認済み

## 依頼内容
LINE機能周りを全て削除する。タスク通知機能（notify_at・is_sent等）は残し、LINE送信処理のみ削除する。

## DBスキーマ変更: あり
- `Account.line_user_id` フィールドを削除

## 実装計画

### バックエンド

1. `src/line/` ディレクトリを丸ごと削除
   - `line-notification.service.ts`
   - `line-notification.service.spec.ts`

2. `src/app.module.ts` の修正
   - `ScheduleModule.forRoot()` を削除（Cronジョブ不要になるため）
   - `LineNotificationService` のimportと providers 登録を削除

3. `src/accounts/controller/account.controller.ts` の修正
   - `GET /accounts/line/login` エンドポイントを削除
   - `GET /accounts/line/callback` エンドポイントを削除
   - 関連import（`Redirect`, `Query`, `Res` ※他で使用中のため確認）を整理

4. `src/accounts/service/account.service.ts` の修正
   - `getLineLoginUrl()` メソッドを削除
   - `handleLineCallback()` メソッドを削除
   - `getMe()` メソッドはそのまま残す（username返却のみに変更）
   - LINE関連の型定義（`LineTokenResponse`・`LineProfileResponse`）を削除
   - LINE関連定数（`LINE_TOKEN_URL`・`LINE_PROFILE_URL`・`LINE_CALLBACK_URL`）を削除
   - `axios` のimportを削除（LINE専用のため）

5. `src/accounts/repository/account.repository.ts` の修正
   - `updateLineUserId()` メソッドを削除

6. `src/accounts/dto/account.dto.ts` の修正
   - `LineCallbackQueryDto` クラスを削除
   - `AccountMeResponseDto.line_user_id` フィールドを削除（usernameのみ残す）

7. `src/common/type/message.ts` の修正
   - `AUTH.LINE_LOGIN_URL_FAILED`・`AUTH.LINE_CALLBACK_FAILED`・`AUTH.LINE_CALLBACK_SUCCESS` を削除
   - `NOTIFICATION.LINE_SEND_FAILED` を削除

8. `backend/prisma/schema.prisma` の修正
   - `Account.line_user_id String?` フィールドを削除

9. `@nestjs/schedule` パッケージをアンインストール（LINE専用のため）
10. `axios` パッケージをアンインストール（LINE専用のため）

### マイグレーション
- `npx prisma migrate dev --name remove-line-user-id` を実行

### フロントエンド

1. `src/pages/LineCallbackPage.tsx` を削除

2. `src/App.tsx` の修正
   - `LineCallbackPage` のimportを削除
   - `/line-callback` ルートを削除

3. `src/components/Sidebar.tsx` の修正
   - `fetchMe` のimportを削除
   - `LINE_LOGIN_URL` 定数を削除
   - `isLineLinked` ステートと `loadLineStatus` useEffectを削除
   - `handleLineLogin()` 関数を削除
   - LINE連携状態表示・LINE連携ボタンのJSXを削除

4. `src/api/taskApi.ts` の修正
   - `AccountMe` インターフェースを削除
   - `fetchMe()` 関数を削除（LINE表示専用のため）

## レビュー結果

### チェックリスト
- [x] `axios` は `account.service.ts` と `line-notification.service.ts` のみで使用 → 削除安全
- [x] `@nestjs/schedule` は `app.module.ts` と `line-notification.service.ts` のみで使用 → 削除安全
- [x] `TaskNotification` モデル（notify_at・is_sent）は残す
- [x] `GET /accounts/me` エンドポイントは残す（username返却のみ）
- [x] `AccountMeResponseDto` から `line_user_id` を削除しても他への影響なし
- [x] `Sidebar.tsx` の `fetchMe` 削除後は `useEffect` と関連ステートも全て削除
- [x] コントローラーの `Res`・`Redirect`・`Query` は LINE エンドポイント削除後に未使用になるため削除

### リスク
- なし（削除のみの作業であり、残す機能（タスク通知・チャット・カレンダー等）への影響なし）
