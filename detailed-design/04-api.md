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

### JwtAuthGuard

保護されたルートに適用するJWT検証Guard。

| 項目 | 内容 |
|------|------|
| 実装 | `CanActivate` を直接実装 |
| トークン取得 | `Authorization: Bearer <token>` ヘッダー |
| 検証 | `jsonwebtoken.verify(token, JWT_SECRET)` |
| 検証成功時 | デコードされた `JwtPayload`（`{ username: string }`）を `request.user` にセット |
| エラー | 401 `{ "message": "認証が必要です" }` |

Express の `Request` 型拡張（`src/types/express.d.ts`）により `request.user` は `JwtPayload | undefined` として型安全に参照できる。

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

### GET /tasks ※要認証

タスク一覧を取得する。子タスク（`parent_id` が NULL でないタスク）は一覧に含まれない。

**リクエストヘッダー**

```
Authorization: Bearer <JWT>
```

**レスポンス**

| ステータス | 条件 | レスポンスボディ |
|-----------|------|----------------|
| 200 | 取得成功 | `TaskResponseDto[]`（`parent_id: null` のタスクのみ、`due_date` 昇順） |
| 401 | 認証エラー | `{ "message": "認証が必要です" }` |

各タスクの `children` フィールドに子タスク一覧が含まれる（担当者情報込み）。

---

### GET /tasks/:id ※要認証

指定IDのタスク詳細を取得する。

**リクエストヘッダー**

```
Authorization: Bearer <JWT>
```

**レスポンス**

| ステータス | 条件 | レスポンスボディ |
|-----------|------|----------------|
| 200 | 取得成功 | `TaskResponseDto` |
| 401 | 認証エラー | `{ "message": "認証が必要です" }` |
| 404 | タスク不存在 | `{ "message": "指定されたタスクが見つかりません" }` |

---

### POST /tasks ※要認証

タスクを新規作成する。

**リクエストヘッダー**

```
Authorization: Bearer <JWT>
```

**リクエストボディ**

```json
{
  "title": "string",        // 必須、最大200文字
  "description": "string",  // 必須、最大1000文字
  "due_date": "string",     // 必須、ISO8601形式
  "assignees": ["string"],  // 任意、ユーザー名リスト（最大50人）
  "priority": "string",     // 任意、HIGH/MEDIUM/LOW（デフォルト: MEDIUM）
  "category": "string",     // 任意、最大100文字
  "parent_id": 0,           // 任意、親タスクID（子タスク作成時に指定）
  "created_by": "string"    // 必須、作成者ユーザー名
}
```

**レスポンス**

| ステータス | 条件 | レスポンスボディ |
|-----------|------|----------------|
| 201 | 作成成功 | `{ "message": "タスクを作成しました", "task": TaskResponseDto }` |
| 400 | バリデーションエラー | `{ "message": "入力値が不正です" }` |
| 401 | 認証エラー | `{ "message": "認証が必要です" }` |
| 500 | DBエラー | `{ "message": "タスクの作成に失敗しました" }` |

---

### PATCH /tasks/:id ※要認証

タスクを更新する。`is_completed` の変化に応じて `closed_by` を自動制御する（リクエストボディでの指定不要）。

**リクエストヘッダー**

```
Authorization: Bearer <JWT>
```

**リクエストボディ（全フィールド任意）**

```json
{
  "title": "string",
  "description": "string",
  "due_date": "string",
  "assignees": ["string"],
  "priority": "string",     // HIGH/MEDIUM/LOW
  "category": "string",
  "parent_id": 0,
  "is_completed": false     // 完了状態の切り替えに使用
}
```

**レスポンス**

| ステータス | 条件 | レスポンスボディ |
|-----------|------|----------------|
| 200 | 更新成功 | `{ "message": "タスクを更新しました", "task": TaskResponseDto }` |
| 400 | バリデーションエラー | `{ "message": "入力値が不正です" }` |
| 401 | 認証エラー | `{ "message": "認証が必要です" }` |
| 404 | タスク不存在 | `{ "message": "指定されたタスクが見つかりません" }` |
| 500 | DBエラー | `{ "message": "タスクの更新に失敗しました" }` |

**`closed_by` の自動制御（TaskService）**

`is_completed` の変化に基づき、`TaskService.update()` がリクエストユーザー名（JWTペイロードの `username`）を使って自動で設定する。

| `is_completed` の変化 | `closed_by` の動作 |
|-----------------------|--------------------|
| `false → true` | JWTの `username` をセット |
| `true → false` | `null` にクリア |
| 変化なし（または未指定） | 変更しない |

**処理フロー**

```
1. JwtAuthGuard: JWTを検証し request.user にペイロードをセット
2. TaskController.update(): request.user.username を TaskService.update() に渡す
3. TaskService.update():
   3-1. TaskRepository.findById(id) で既存タスクを取得（なければ 404）
   3-2. is_completed の変化を判定して closed_by 値を決定
   3-3. TaskRepository.update(id, { ...dto, closed_by }) で更新
4. 200 レスポンス
```

---

### DELETE /tasks/:id ※要認証

タスクを削除する。

**リクエストヘッダー**

```
Authorization: Bearer <JWT>
```

**レスポンス**

| ステータス | 条件 | レスポンスボディ |
|-----------|------|----------------|
| 200 | 削除成功 | `{ "message": "タスクを削除しました" }` |
| 401 | 認証エラー | `{ "message": "認証が必要です" }` |
| 404 | タスク不存在 | `{ "message": "指定されたタスクが見つかりません" }` |
| 500 | DBエラー | `{ "message": "タスクの削除に失敗しました" }` |

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

### CreateTaskDto

```typescript
class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  description: string;

  @IsDateString()
  due_date: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(50)
  @IsOptional()
  assignees?: string[];

  @IsIn(['HIGH', 'MEDIUM', 'LOW'])
  @IsOptional()
  priority?: Priority;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  category?: string;

  @IsInt()
  @IsPositive()
  @IsOptional()
  parent_id?: number;

  @IsString()
  @IsNotEmpty()
  created_by: string;
}
```

### UpdateTaskDto

`CreateTaskDto` の全フィールドが `@IsOptional()` になったDTOに、以下を追加:

```typescript
/** 完了状態（true: 完了 / false: 未完了） */
@IsBoolean()
@IsOptional()
is_completed?: boolean;
```

### TaskResponseDto

```typescript
interface TaskResponseDto {
  id: number;
  title: string;
  description: string;
  due_date: string;          // ISO8601形式
  priority: Priority;        // HIGH / MEDIUM / LOW
  category: string | null;
  parent_id: number | null;
  created_by: string;
  created_at: string;        // ISO8601形式
  updated_at: string;        // ISO8601形式
  is_completed: boolean;
  closed_by: string | null;  // タスクをクローズしたユーザー名。未完了の場合は null
  assignees: string[];       // ユーザー名リスト
  children: TaskResponseDto[]; // 子タスク一覧（再帰構造）
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
