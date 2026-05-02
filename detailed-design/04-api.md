# API設計

## 共通仕様

| 項目 | 内容 |
|------|------|
| ベースURL | `http://localhost:8000` |
| Content-Type | `application/json` |
| CORS許可オリジン | `http://localhost:3000`（credentials: true） |
| エラーレスポンス形式 | `{ "message": "エラーメッセージ" }` |

## グローバル設定

### ValidationPipe

リクエストボディはDTOのデコレーターで自動バリデーション。
バリデーションエラー時は以下を返す:

```json
HTTP 400
{ "message": "入力値が不正です" }
```

### AllExceptionsFilter

全例外を統一フォーマットで返す:

| 例外種別 | HTTPステータス | レスポンス |
|---------|--------------|----------|
| `HttpException` | 例外のステータスをそのまま使用 | `{ message: 例外メッセージ }` |
| その他（Prismaエラー等） | 500 | `{ message: "データベースエラーが発生しました" }` |

---

## エンドポイント一覧

### POST /accounts/login

ログイン認証を行い、JWTトークンを返す。

**リクエスト**

```json
{
  "username": "string",  // 1〜10文字
  "password": "string"   // 8〜20文字
}
```

**レスポンス**

| ステータス | 条件 | レスポンスボディ |
|-----------|------|----------------|
| 200 | 認証成功 | `{ "token": "<JWT文字列>" }` |
| 400 | 認証失敗（ユーザー不存在 or パスワード不一致） | `{ "message": "ユーザーネームまたはパスワードが間違っています" }` |
| 400 | バリデーションエラー | `{ "message": "入力値が不正です" }` |

**処理フロー**

```
1. DTOバリデーション（ValidationPipe）
2. AccountService.login(dto)
   2-1. AccountRepository.getAccount(username) でアカウント取得
   2-2. アカウントが存在しない → null 返却
   2-3. HashService.createHash(password) でSHA-256ハッシュ化
   2-4. ハッシュ値を比較 → 不一致なら null 返却
   2-5. JwtService.createToken({ username }) でJWT生成（有効期限: 1h）
   2-6. token 返却
3. null なら 400 エラーレスポンス
4. token があれば 200 + { token } レスポンス
```

---

### POST /accounts/regist

新規アカウントを登録する。

**リクエスト**

```json
{
  "username": "string",  // 1〜10文字
  "password": "string"   // 8〜20文字
}
```

**レスポンス**

| ステータス | 条件 | レスポンスボディ |
|-----------|------|----------------|
| 201 | 登録成功 | `{ "message": "アカウントの登録に成功しました" }` |
| 409 | ユーザー名重複 | `{ "message": "このユーザー名は既に使用されています" }` |
| 400 | その他の登録失敗 | `{ "message": "アカウントの作成に失敗しました" }` |
| 400 | バリデーションエラー | `{ "message": "入力値が不正です" }` |

**処理フロー**

```
1. DTOバリデーション（ValidationPipe）
2. AccountService.regist(dto)
   2-1. AccountRepository.getAccount(username) で重複チェック
   2-2. 存在する → 'duplicate' 返却
   2-3. HashService.createHash(password) でSHA-256ハッシュ化
   2-4. AccountRepository.createUser({ username, hashed_password }) でDB保存
   2-5. DB書き込みエラー → InternalServerErrorException をスロー
   2-6. 'success' 返却
3. 'success' → 201 レスポンス
4. 'duplicate' → 409 レスポンス
5. その他 → 400 レスポンス
```

---

### GET /accounts/logout

ログアウト処理（**未実装**）。

| ステータス | 条件 | レスポンスボディ |
|-----------|------|----------------|
| - | 現状空実装 | - |

---

## DTO定義

### AccountDto

```typescript
class AccountDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(10)
  readonly username: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(20)
  readonly password: string;
}
```

---

## JWT仕様

| 項目 | 内容 |
|------|------|
| ライブラリ | `jsonwebtoken` |
| 署名アルゴリズム | デフォルト（HS256） |
| 有効期限 | 1時間（`expiresIn: '1h'`） |
| シークレット | 環境変数 `JWT_SECRET` |
| ペイロード | `{ username: string }` |
| 保存場所（フロント） | `localStorage` |
