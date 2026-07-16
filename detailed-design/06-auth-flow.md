# 認証フロー

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

## 通知設定フロー（タスク作成・編集時）

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

## 通知削除フロー（詳細パネルから）

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

---

## セキュリティ上の注意点

| 項目 | 現状 | リスク・補足 |
|------|------|-------------|
| パスワードハッシュ | SHA-256（ソルトなし） | レインボーテーブル攻撃に脆弱。bcrypt推奨 |
| トークン保存場所 | localStorage | XSS攻撃でトークンが窃取される可能性。httpOnly Cookie推奨 |
| バックエンドログアウト | 未実装 | トークンの無効化ができない |
| 認証済みルートの保護 | PrivateRoute で JWT exp 検証 | ✅ 有効期限チェックあり |
| 本番マイグレーション | `npx prisma migrate deploy` | 本番環境では `migrate dev` を使用しないこと |
