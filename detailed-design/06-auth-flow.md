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
[accountApi] POST /accounts/login
    │         { username, password }
    ▼
[AccountController] @Post('login')
    │ DTOバリデーション（ValidationPipe）
    │ エラーあり → 400 { message: "入力値が不正です" }
    │ エラーなし ↓
    ▼
[AccountService] login(dto)
    │
    ├─ [AccountRepository] getAccount(username)
    │       ↓ findUnique
    │  [SQLite] Account テーブル検索
    │       ↓
    │  アカウントなし → null 返却
    │
    ├─ [HashService] createHash(password) → SHA-256ハッシュ化
    │
    ├─ ハッシュ比較
    │   不一致 → null 返却
    │   一致 ↓
    │
    └─ [JwtService] createToken({ username })
           JWT生成（有効期限1h、JWT_SECRETで署名）
           token 返却
    │
    ▼
[AccountController]
    │ token = null → 400 { message: "ユーザーネームまたはパスワードが間違っています" }
    │ token あり  → 200 { token: "<JWT文字列>" }
    ▼
[useLoginForm]
    │ 失敗 → apiError にメッセージセット → FormErrorBanner に表示
    │ 成功 ↓
    ▼
[localStorage] setItem('token', token)
    │
    ▼
[React Router] navigate('/') → HomePage へ遷移（/tasks にリダイレクト）
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
[accountApi] POST /accounts/regist
    │         { username, password }
    ▼
[AccountController] @Post('regist')
    │ DTOバリデーション（ValidationPipe）
    │ エラーあり → 400 { message: "入力値が不正です" }
    │ エラーなし ↓
    ▼
[AccountService] regist(dto)
    │
    ├─ [AccountRepository] getAccount(username) で重複チェック
    │   既存あり → 'duplicate' 返却
    │   なし ↓
    │
    ├─ [HashService] createHash(password) → SHA-256ハッシュ化
    │
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
    │ 失敗 → apiError にメッセージセット → FormErrorBanner に表示
    │ 成功 ↓
    ▼
[React Router] navigate('/login') → ログイン画面へ遷移
```

---

## ログアウトフロー

| 項目 | 状態 |
|------|------|
| バックエンド `GET /accounts/logout` | 空実装 |
| フロントエンド ログアウトUI | ✅ 実装済み（Sidebar のログアウトボタン） |
| localStorage からのトークン削除 | ✅ 実装済み（`localStorage.removeItem('token')` → `/login` へ遷移） |

**フロントエンドのログアウト処理（Sidebar）:**

```
[ユーザー] "ログアウト" ボタンをクリック
    │
    ▼
[Sidebar] handleLogout()
    │
    ├─ localStorage.removeItem('token')
    └─ navigate('/login')
```

---

## トークン管理

| 項目 | 内容 |
|------|------|
| 保存場所 | `localStorage`（キー: `token`） |
| 有効期限 | 1時間 |
| APIリクエストへの付与 | `taskApi.ts` / `eventApi.ts` の全リクエストに `Authorization: Bearer <token>` ヘッダーを付与 |

## PrivateRoute のJWT検証

```
PrivateRoute
├── localStorage.getItem('token') を取得
├── token が null → <Navigate to="/login" replace />
├── JWTをBase64デコードしてペイロードのexpを取得
│     （atob を使い、Base64URL デコード後 JSON.parse）
├── exp が未存在 → <Navigate to="/login" replace />
├── Date.now() / 1000 >= exp（期限切れ）→ <Navigate to="/login" replace />
└── 有効 → <Outlet />
```

## セキュリティ上の注意点

| 項目 | 現状 | リスク |
|------|------|-------|
| パスワードハッシュ | SHA-256（ソルトなし） | レインボーテーブル攻撃に脆弱。bcrypt推奨 |
| トークン保存場所 | localStorage | XSS攻撃でトークンが窃取される可能性。httpOnly Cookie推奨 |
| バックエンドログアウト | 未実装（空実装） | トークンの無効化ができない |
| 認証済みルートの保護 | PrivateRoute で JWT exp 検証 | ✅ 有効期限チェックあり |
