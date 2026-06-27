# 認証フロー・LINE連携フロー・LINE通知フロー

## ログインフロー

```
[ユーザー] フォームにusername/passwordを入力して送信
    │
    ▼
[LoginPage] onSubmit → useLoginForm.handleSubmit()
    │
    ▼
[useLoginForm] クライアントバリデーション（validateLoginForm）
    │ エラーあり → フォームにエラー表示（API呼び出しなし）
    │ エラーなし ↓
    ▼
[accountApi] POST /accounts/login { username, password }
    │
    ▼
[AccountController] DTOバリデーション（ValidationPipe）
    │ エラーあり → 400 { message: "入力値が不正です" }
    │ エラーなし ↓
    ▼
[AccountService] login(dto)
    ├─ [AccountRepository] getAccount(username)
    │       アカウントなし → null 返却
    ├─ [HashService] createHash(password) → SHA-256ハッシュ化
    ├─ ハッシュ比較: 不一致 → null 返却
    └─ [JwtService] createToken({ username }) → JWT生成（1h・JWT_SECRET）
    │
    ▼
[AccountController]
    │ token = null → 400 { message: "ユーザーネームまたはパスワードが間違っています" }
    │ token あり  → 200 { token: "<JWT文字列>" }
    ▼
[useLoginForm]
    │ 失敗 → apiError セット → FormErrorBanner に表示
    │ 成功 ↓
    ▼
[localStorage] setItem('token', token)
    │
    ▼
[React Router] navigate('/') → /tasks にリダイレクト
```

---

## アカウント登録フロー

```
[ユーザー] フォームにusername/passwordを入力して送信
    │
    ▼
[RegistPage] onSubmit → useRegistForm.handleSubmit()
    │
    ▼
[useRegistForm] クライアントバリデーション（validateRegistForm）
    │ エラーあり → フォームにエラー表示
    │ エラーなし ↓
    ▼
[accountApi] POST /accounts/regist { username, password }
    │
    ▼
[AccountService] regist(dto)
    ├─ [AccountRepository] getAccount(username) で重複チェック
    │   既存あり → 'duplicate' 返却
    ├─ [HashService] createHash(password) → SHA-256ハッシュ化
    └─ [AccountRepository] createUser({ username, hashed_password })
           DB書き込みエラー → InternalServerErrorException
           成功 → 'success' 返却
    │
    ▼
[AccountController]
    │ 'success'   → 201 { message: "アカウントの登録に成功しました" }
    │ 'duplicate' → 409 { message: "このユーザー名は既に使用されています" }
    │ その他      → 400 { message: "アカウントの作成に失敗しました" }
    ▼
[useRegistForm]
    │ 失敗 → apiError セット → FormErrorBanner に表示
    │ 成功 ↓
    ▼
[React Router] navigate('/login') → ログイン画面へ遷移
```

---

## ログアウトフロー

```
[ユーザー] Sidebar の "ログアウト" ボタンをクリック
    │
    ▼
[Sidebar] handleLogout()
    ├─ localStorage.removeItem('token')
    └─ navigate('/login')
```

> バックエンドのログアウトエンドポイント（`GET /accounts/logout`）は空実装。トークンのサーバー側無効化は未実装。

---

## トークン管理

| 項目 | 内容 |
|------|------|
| 保存場所 | `localStorage`（キー: `token`） |
| 有効期限 | 1時間 |
| APIリクエストへの付与 | `taskApi.ts` / `eventApi.ts` の全リクエストに `Authorization: Bearer <token>` |

## PrivateRoute の JWT検証

```
PrivateRoute
├── localStorage.getItem('token') を取得
├── token が null → <Navigate to="/login" replace />
├── JWTをBase64デコードしてペイロードの exp を取得
│     （atob を使い、Base64URL デコード後 JSON.parse）
├── exp が未存在 → <Navigate to="/login" replace />
├── Date.now() / 1000 >= exp（期限切れ）→ <Navigate to="/login" replace />
└── 有効 → <Outlet />
```

---

## LINE OAuth フロー（LINE Login 認可コードフロー）

```
[ユーザー] Sidebar の "LINEと連携する" ボタンをクリック
    │
    ▼
[Sidebar] handleLineLogin()
    │ window.location.href = LINE_LOGIN_URL
    │ （= http://localhost:8000/accounts/line/login, Authorization ヘッダーは自動付与されない）
    │
    ▼
※ 注意: /accounts/line/login は JwtAuthGuard が適用されているため、
   フロントエンドは localStorage の JWT を含む形でリダイレクト先を構築する必要がある。
   現状はブラウザの URL 遷移のため Authorization ヘッダーが付与されず、
   実運用では LINE_LOGIN_URL にトークンを含めるか、Cookie ベースの認証への変更が必要。

    ▼
[AccountController] GET /accounts/line/login （JwtAuthGuard適用）
    │
    ▼
[AccountService] getLineLoginUrl()
    │ LINE_LOGIN_CHANNEL_ID / LINE_CALLBACK_URL / scope / state を組み立て
    │ LINE 認可エンドポイントへのリダイレクト URL を返す
    │
    ▼
[LINE Login API] https://access.line.me/oauth2/v2.1/authorize
    │ ユーザーが LINE でログイン・許可
    │
    ▼
[LINE] GET /accounts/line/callback?code=<AUTHORIZATION_CODE>&state=<STATE>
    │   （Authorization ヘッダーに JWT が必要）
    ▼
[AccountController] GET /accounts/line/callback （JwtAuthGuard適用）
    │ @Query() dto: LineCallbackQueryDto で code を受け取る
    ▼
[AccountService] handleLineCallback(code, username)
    │
    ├─ [LINE Token API] POST https://api.line.me/oauth2/v2.1/token
    │       { code, client_id, client_secret, redirect_uri, grant_type }
    │       → access_token 取得
    │
    ├─ [LINE Profile API] GET https://api.line.me/v2/profile
    │       Authorization: Bearer <access_token>
    │       → userId 取得
    │
    └─ [AccountRepository] updateLineUserId(username, userId)
           Account.line_user_id を更新
    │
    ▼
[AccountController]
    │ 成功 → {FRONTEND_URL}/line-callback?status=success へリダイレクト
    │ 失敗 → {FRONTEND_URL}/line-callback?status=error へリダイレクト
    ▼
[LineCallbackPage]
    │ status=success → 2秒後に /tasks へ自動遷移（カウントダウン表示）
    │ status=error   → エラーメッセージ表示・手動で /tasks へ戻る
```

---

## LINE 通知フロー（タスク期限通知・Cronジョブ）

### 通知設定フロー（タスク作成・編集時）

```
[ユーザー] TaskFormPage で通知日時を追加して "作成する" / "更新する" をクリック
    │
    ▼
[useTaskForm] handleSubmit()
    │
    ├─ タスク作成/更新 API を呼び出し（POST or PATCH /tasks/:id）
    │
    └─ 追加された通知日時を順次 addNotification API へ送信
         POST /tasks/:id/notifications { notify_at: "<ISO8601>" }
         → TaskNotification レコードが DB に作成される（is_sent=false）
```

### 通知削除フロー（詳細パネルから）

```
[ユーザー] TaskDetailPanel の通知 "削除" ボタンをクリック
    │
    ▼
[TaskDetailPanel] handleDeleteNotification(notification)
    │ onDeleteNotification(task.id, notification.id) を呼び出す（親に委譲）
    ▼
[TaskListPage] handleDeleteNotification(taskId, notificationId)
    │
    ├─ [taskApi] deleteNotification(taskId, notificationId)
    │       DELETE /tasks/:id/notifications/:notificationId
    │
    └─ reload() → タスク一覧を再取得してパネルの通知一覧を更新
```

### LINE プッシュ通知フロー（Cronジョブ・毎分実行）

```
[NestJS Scheduler] @Cron(CronExpression.EVERY_MINUTE)
    │
    ▼
[LineNotificationService] sendPendingNotifications()
    │
    ├─ LINE_MESSAGING_CHANNEL_ACCESS_TOKEN が未設定 → ログ出力して終了
    │
    ├─ [TaskNotificationRepository] findPendingNotifications()
    │       WHERE is_sent = false AND notify_at <= NOW()
    │       include: task（title, due_date, assignees（account.line_user_id含む））
    │
    ├─ 送信対象なし → ログ出力して終了
    │
    └─ 各通知に対して:
        ├─ メッセージ本文構築（タスク名・期限）
        ├─ 各担当者に対して:
        │   ├─ line_user_id が null → ログ出力してスキップ（LINE未連携）
        │   └─ [LINE Messaging API] POST https://api.line.me/v2/bot/message/push
        │           { to: line_user_id, messages: [{ type: 'text', text: ... }] }
        │           Authorization: Bearer <LINE_MESSAGING_CHANNEL_ACCESS_TOKEN>
        │           成功 → ログ出力
        │           失敗 → エラーログ出力・is_sent は更新しない（次回再試行）
        └─ 全担当者処理後:
            [TaskNotificationRepository] markAsSent(notificationId)
            → is_sent = true に更新
```

---

## セキュリティ上の注意点

| 項目 | 現状 | リスク・補足 |
|------|------|-------------|
| パスワードハッシュ | SHA-256（ソルトなし） | レインボーテーブル攻撃に脆弱。bcrypt推奨 |
| トークン保存場所 | localStorage | XSS攻撃でトークンが窃取される可能性。httpOnly Cookie推奨 |
| バックエンドログアウト | 未実装 | トークンの無効化ができない |
| 認証済みルートの保護 | PrivateRoute で JWT exp 検証 | ✅ 有効期限チェックあり |
| LINE OAuth コールバック認証 | JwtAuthGuard 適用 | ブラウザリダイレクトでは Authorization ヘッダーが付与されない問題あり（要改善） |
| LINE User ID の保護 | DB に直接保存 | バックエンドの認証済みエンドポイント経由でのみ更新可能 |
| 本番マイグレーション | `npx prisma migrate deploy` | 本番環境では `migrate dev` を使用しないこと |
