# API設計

## 共通仕様

| 項目 | 内容 |
|------|------|
| ベースURL | `http://localhost:8000` |
| Content-Type | `application/json` |
| CORS許可オリジン | 環境変数 `CORS_ORIGIN` で制御（デフォルト: `http://localhost:3000`） |
| エラーレスポンス形式 | `{ "message": "エラーメッセージ" }` |

**CORS設定の詳細（`main.ts`）:**

| `CORS_ORIGIN` の値 | 動作 |
|-------------------|------|
| `*` | 全オリジン許可（`origin: true`） |
| カンマ区切り文字列（例: `http://a.com,http://b.com`） | 指定オリジンのみ許可 |
| 単一オリジン（例: `http://localhost:3000`） | そのオリジンのみ許可 |

`credentials: true` は全ケースで有効。`backend/.env.local`（Git管理外）に `CORS_ORIGIN="*"` を設定することでトンネル経由テストに対応できる。

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

---

### GET /accounts/me ※要認証

ログイン中ユーザーの情報を返す。

**リクエストヘッダー**

```
Authorization: Bearer <JWT>
```

**レスポンス**

| ステータス | 条件 | レスポンスボディ |
|-----------|------|----------------|
| 200 | 取得成功 | `{ "username": "string" }` |
| 401 | 認証エラー | `{ "message": "認証が必要です" }` |
| 500 | 取得失敗 | `{ "message": "ユーザー情報の取得に失敗しました" }` |

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

各タスクの `children` フィールドに子タスク一覧、`notifications` フィールドに通知一覧が含まれる。

---

### GET /tasks/categories ※要認証

全タスクから設定されているカテゴリ一覧を重複なしで取得する。`GET /tasks/:id` より前に定義（ルート衝突防止）。

**レスポンス**

| ステータス | 条件 | レスポンスボディ |
|-----------|------|----------------|
| 200 | 取得成功 | `string[]`（昇順） |
| 401 | 認証エラー | `{ "message": "認証が必要です" }` |

---

### GET /tasks/:id ※要認証

指定IDのタスク詳細を取得する。

**レスポンス**

| ステータス | 条件 | レスポンスボディ |
|-----------|------|----------------|
| 200 | 取得成功 | `TaskResponseDto`（`notifications` フィールド含む） |
| 401 | 認証エラー | `{ "message": "認証が必要です" }` |
| 404 | タスク不存在 | `{ "message": "指定されたタスクが見つかりません" }` |

---

### POST /tasks ※要認証

タスクを新規作成する。

**リクエストボディ**

```json
{
  "title": "string",        // 必須、最大200文字
  "description": "string",  // 必須、最大1000文字
  "due_date": "string",     // 必須、ISO8601形式
  "assignees": ["string"],  // 必須、ユーザー名リスト（最大50人・1人以上）
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

タスクを更新する。`is_completed` の変化に応じて `closed_by` を自動制御する。

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
  "is_completed": false
}
```

**レスポンス**

| ステータス | 条件 | レスポンスボディ |
|-----------|------|----------------|
| 200 | 更新成功 | `{ "message": "タスクをキューで処理し更新しました", "task": TaskResponseDto }` |
| 400 | バリデーションエラー | `{ "message": "入力値が不正です" }` |
| 401 | 認証エラー | `{ "message": "認証が必要です" }` |
| 404 | タスク不存在 | `{ "message": "指定されたタスクが見つかりません" }` |
| 500 | DBエラー | `{ "message": "タスクの更新に失敗しました" }` |

**`closed_by` の自動制御（TaskService）**

| `is_completed` の変化 | `closed_by` の動作 |
|-----------------------|--------------------|
| `false → true` | JWTの `username` をセット |
| `true → false` | `null` にクリア |
| 変化なし（または未指定） | 変更しない |

---

### DELETE /tasks/:id ※要認証

タスクを削除する。

**レスポンス**

| ステータス | 条件 | レスポンスボディ |
|-----------|------|----------------|
| 200 | 削除成功 | `{ "message": "タスクを削除しました" }` |
| 401 | 認証エラー | `{ "message": "認証が必要です" }` |
| 404 | タスク不存在 | `{ "message": "指定されたタスクが見つかりません" }` |
| 500 | DBエラー | `{ "message": "タスクの削除に失敗しました" }` |

---

### POST /tasks/:id/notifications ※要認証

タスクに通知を追加する。

**リクエストボディ**

```json
{
  "notify_at": "string"  // 必須、ISO8601形式
}
```

**レスポンス**

| ステータス | 条件 | レスポンスボディ |
|-----------|------|----------------|
| 201 | 追加成功 | `{ "message": "通知を追加しました", "notification": NotificationResponseDto }` |
| 400 | バリデーションエラー | `{ "message": "入力値が不正です" }` |
| 401 | 認証エラー | `{ "message": "認証が必要です" }` |

---

### GET /tasks/:id/notifications ※要認証

タスクの通知一覧を取得する。

**レスポンス**

| ステータス | 条件 | レスポンスボディ |
|-----------|------|----------------|
| 200 | 取得成功 | `NotificationResponseDto[]`（notify_at 昇順） |
| 401 | 認証エラー | `{ "message": "認証が必要です" }` |

---

### DELETE /tasks/:id/notifications/:notificationId ※要認証

タスクの通知を削除する。

**レスポンス**

| ステータス | 条件 | レスポンスボディ |
|-----------|------|----------------|
| 200 | 削除成功 | `{ "message": "通知を削除しました" }` |
| 401 | 認証エラー | `{ "message": "認証が必要です" }` |

---

### GET /events ※要認証

カレンダー予定一覧を取得する。

**レスポンス**

| ステータス | 条件 | レスポンスボディ |
|-----------|------|----------------|
| 200 | 取得成功 | `EventResponseDto[]`（`start_at` 昇順） |
| 401 | 認証エラー | `{ "message": "認証が必要です" }` |

---

### GET /events/:id ※要認証

指定IDのカレンダー予定詳細を取得する。

**レスポンス**

| ステータス | 条件 | レスポンスボディ |
|-----------|------|----------------|
| 200 | 取得成功 | `EventResponseDto` |
| 401 | 認証エラー | `{ "message": "認証が必要です" }` |
| 404 | 予定不存在 | `{ "message": "指定された予定が見つかりません" }` |

---

### POST /events ※要認証

カレンダー予定を新規作成する。`created_by` はJWT認証済みユーザー名をサーバー側で自動セットする。

**リクエストボディ**

```json
{
  "title": "string",        // 必須、最大200文字
  "description": "string",  // 任意、最大1000文字（省略時は空文字）
  "start_at": "string",     // 必須、ISO8601形式
  "end_at": "string"        // 必須、ISO8601形式
}
```

**レスポンス**

| ステータス | 条件 | レスポンスボディ |
|-----------|------|----------------|
| 201 | 作成成功 | `{ "message": "予定を作成しました", "event": EventResponseDto }` |
| 400 | バリデーションエラー | `{ "message": "入力値が不正です" }` |
| 401 | 認証エラー | `{ "message": "認証が必要です" }` |
| 500 | DBエラー | `{ "message": "予定の作成に失敗しました" }` |

---

### PATCH /events/:id ※要認証

カレンダー予定を更新する。**作成者のみ操作可能**。

**リクエストボディ（全フィールド任意）**

```json
{
  "title": "string",
  "description": "string",
  "start_at": "string",
  "end_at": "string"
}
```

**レスポンス**

| ステータス | 条件 | レスポンスボディ |
|-----------|------|----------------|
| 200 | 更新成功 | `{ "message": "予定を更新しました", "event": EventResponseDto }` |
| 400 | バリデーションエラー | `{ "message": "入力値が不正です" }` |
| 401 | 認証エラー | `{ "message": "認証が必要です" }` |
| 403 | 作成者以外が操作 | `{ "message": "この予定を操作する権限がありません" }` |
| 404 | 予定不存在 | `{ "message": "指定された予定が見つかりません" }` |
| 500 | DBエラー | `{ "message": "予定の更新に失敗しました" }` |

---

### DELETE /events/:id ※要認証

カレンダー予定を削除する。**作成者のみ操作可能**。

**レスポンス**

| ステータス | 条件 | レスポンスボディ |
|-----------|------|----------------|
| 200 | 削除成功 | `{ "message": "予定を削除しました" }` |
| 401 | 認証エラー | `{ "message": "認証が必要です" }` |
| 403 | 作成者以外が操作 | `{ "message": "この予定を操作する権限がありません" }` |
| 404 | 予定不存在 | `{ "message": "指定された予定が見つかりません" }` |
| 500 | DBエラー | `{ "message": "予定の削除に失敗しました" }` |

---

## DTO定義

### AccountDto

```typescript
class AccountDto {
  @IsString() @IsNotEmpty() @MinLength(1) @MaxLength(10)
  readonly username: string;

  @IsString() @IsNotEmpty() @MinLength(8) @MaxLength(20)
  readonly password: string;
}
```

### AccountMeResponseDto

```typescript
interface AccountMeResponseDto {
  username: string;
}
```

### CreateTaskDto

```typescript
class CreateTaskDto {
  @IsString() @IsNotEmpty() @MaxLength(200)
  title: string;

  @IsString() @IsNotEmpty() @MaxLength(1000)
  description: string;

  @IsDateString()
  due_date: string;

  @IsArray() @IsString({ each: true }) @ArrayMaxSize(50) @IsOptional()
  assignees?: string[];

  @IsIn(['HIGH', 'MEDIUM', 'LOW']) @IsOptional()
  priority?: Priority;

  @IsString() @MaxLength(100) @IsOptional()
  category?: string;

  @IsInt() @IsPositive() @IsOptional()
  parent_id?: number;

  @IsString() @IsNotEmpty()
  created_by: string;
}
```

### UpdateTaskDto

`CreateTaskDto` の全フィールドが `@IsOptional()` になったDTOに、以下を追加:

```typescript
@IsBoolean() @IsOptional()
is_completed?: boolean;
```

### CreateNotificationDto

```typescript
class CreateNotificationDto {
  @IsDateString()
  notify_at: string;  // ISO8601形式
}
```

### TaskResponseDto

```typescript
interface TaskResponseDto {
  id: number;
  title: string;
  description: string;
  due_date: string;               // ISO8601形式
  priority: Priority;             // HIGH / MEDIUM / LOW
  category: string | null;
  parent_id: number | null;
  created_by: string;
  created_at: string;             // ISO8601形式
  updated_at: string;             // ISO8601形式
  is_completed: boolean;
  closed_by: string | null;       // タスクをクローズしたユーザー名。未完了の場合は null
  assignees: string[];            // ユーザー名リスト
  children: TaskResponseDto[];    // 子タスク一覧（再帰構造）
  notifications: NotificationResponseDto[];  // 通知一覧（notify_at 昇順）
}
```

### NotificationResponseDto

```typescript
interface NotificationResponseDto {
  id: number;
  task_id: number;
  notify_at: string;  // ISO8601形式
  is_sent: boolean;
}
```

### CreateEventDto

```typescript
class CreateEventDto {
  @IsString() @IsNotEmpty({ message: 'タイトルを入力してください' }) @MaxLength(200)
  title: string;

  @IsString() @MaxLength(1000) @IsOptional()
  description?: string;

  @IsDateString({}, { message: '正しい日時形式で入力してください' })
  start_at: string;

  @IsDateString({}, { message: '正しい日時形式で入力してください' })
  end_at: string;
}
```

### EventResponseDto

```typescript
interface EventResponseDto {
  id: number;
  title: string;
  description: string;    // 未指定時は空文字
  start_at: string;       // ISO8601形式
  end_at: string;         // ISO8601形式
  created_by: string;     // 作成者ユーザー名（JWTから自動セット）
  created_at: string;     // ISO8601形式
  updated_at: string;     // ISO8601形式
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

