# WebAuthn（FIDO2）顔認証ログイン 実装計画

- 日付: 2026-08-22
- ステータス: 承認済み

## 依頼内容

WebアプリのログインをWebAuthn（FIDO2）顔認証で行えるようにする。
- 技術方針: WebAuthn（FIDO2）
- 認証方式: パスワードの代替（顔認証のみでログイン可能）
- 対象デバイス: PCとスマホ両方

## 実装計画

### DBスキーマ変更: あり

#### 追加テーブル

**WebAuthnCredential**（認証器の公開鍵情報を保存）
- id: String @id（credential ID, base64url）
- username: String
- public_key: Bytes（COSE形式公開鍵）
- counter: Int @default(0)（リプレイアタック防止）
- device_type: String @default("singleDevice")
- backed_up: Boolean @default(false)
- transports: String?（JSON配列シリアライズ）
- created_at: DateTime

**WebAuthnChallenge**（一時チャレンジ保存）
- id: String @id @default(cuid())
- username: String
- challenge: String（base64url）
- type: String（"registration" | "authentication"）
- expires_at: DateTime（5分TTL）
- created_at: DateTime

Account モデルに `webauthn_credentials WebAuthnCredential[]` を追加。

### バックエンド実装ステップ

- B-1: `@simplewebauthn/server` インストール（v9.x を使用してCJSと互換性を保つ）
- B-2: Prismaスキーマ追加（WebAuthnCredential・WebAuthnChallenge）
- B-3: `src/accounts/repository/webauthn.repository.ts` 新規作成
  - saveChallenge / findChallenge / deleteChallenge / saveCredential / findCredentialsByUsername / findCredentialById / updateCredentialCounter
- B-4: `src/accounts/dto/webauthn.dto.ts` 新規作成
  - WebAuthnRegistrationStartDto / WebAuthnRegistrationFinishDto / WebAuthnAuthenticationStartDto / WebAuthnAuthenticationFinishDto
- B-5: `src/accounts/service/webauthn.service.ts` 新規作成
  - startRegistration / finishRegistration / startAuthentication / finishAuthentication
  - 環境変数: WEBAUTHN_RP_ID・WEBAUTHN_RP_NAME・WEBAUTHN_ORIGIN
  - チャレンジTTL: 5分。期限切れはUnauthorizedException
- B-6: `src/common/type/message.ts` にWEBATHNセクション追加
- B-7: `src/accounts/controller/account.controller.ts` にエンドポイント追加
  - POST /accounts/webauthn/registration/start
  - POST /accounts/webauthn/registration/finish
  - POST /accounts/webauthn/authentication/start
  - POST /accounts/webauthn/authentication/finish
  - @Throttle({ default: { ttl: 60000, limit: 5 } }) 適用
- B-8: AccountsModule 更新（WebAuthnRepository・WebAuthnService をproviders追加）

### フロントエンド実装ステップ

- F-1: `@simplewebauthn/browser` インストール
- F-2: `src/api/accountApi.ts` にWebAuthn API関数追加
  - startWebAuthnRegistration / finishWebAuthnRegistration / startWebAuthnAuthentication / finishWebAuthnAuthentication
- F-3: `src/hooks/useWebAuthn.ts` 新規作成
  - registerWebAuthn(username): 登録フロー（start → ブラウザAPI → finish）
  - authenticateWithWebAuthn(username): 認証フロー（start → ブラウザAPI → finish → JWT保存）
  - loading: boolean / error: string
- F-4: `src/pages/LoginPage.tsx` 更新
  - ユーザー名入力後に「顔認証でログイン」ボタンを追加
  - ユーザー名が空の場合はボタン非活性
  - 成功時は / へ遷移
- F-5: `src/pages/WebAuthnRegisterPage.tsx` 新規作成
  - /webauthn/register でアクセス可能
  - ログイン済みユーザーの顔認証登録画面
  - 「顔認証を登録する」ボタンで registerWebAuthn(username) を呼び出す
- F-6: `src/App.tsx` にルーティング追加（/webauthn/register → PrivateRoute内）
- F-7: `src/components/Sidebar.tsx` に「顔認証設定」リンクを追加

## レビュー結果

### チェックリスト結果
- 依頼内容との整合性: OK
- 既存機能への影響: OK（パスワードログインは並存）
- DBスキーマ設計: OK（TTL管理・カウンター管理あり）
- 認可フロー: OK（JWTは変更なし）
- 規約準拠: OK

### リスク・注意点
1. チャレンジTTLを5分に明示設定し、expires_atチェックをサービス層で実施する
2. RP Origin・RP ID・RP Nameは環境変数（WEBAUTHN_RP_ID・WEBAUTHN_RP_NAME・WEBAUTHN_ORIGIN）で管理しハードコードしない
3. @simplewebauthn/server v10+ はESM専用のためNestJS（CJS）との互換性に注意。v9.x を使用する
4. Sidebar の NAV_LINKS に「顔認証設定」（/webauthn/register）を追加する
