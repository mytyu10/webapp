# フロントエンド設計

## ルーティング

```typescript
// App.tsx
<BrowserRouter>
  <Routes>
    <Route path="/"       element={<HomePage />}   />
    <Route path="/login"  element={<LoginPage />}  />
    <Route path="/regist" element={<RegistPage />} />
  </Routes>
</BrowserRouter>
```

| パス | コンポーネント | 状態 |
|------|-------------|------|
| `/` | `HomePage` | スタブ（未実装） |
| `/login` | `LoginPage` | 実装済み |
| `/regist` | `RegistPage` | 実装済み |

---

## ページコンポーネント

### LoginPage

**責務**: UIの描画のみ。ロジックは `useLoginForm` に委譲。

```
LoginPage
└── FormCard（タイトル: "ログイン"）
    ├── FormField（ユーザー名）
    ├── FormField（パスワード）
    ├── FormErrorBanner（APIエラー表示）
    ├── SubmitButton（"ログイン"）
    └── <Link to="/regist">アカウント登録はこちら</Link>
```

### RegistPage

**責務**: UIの描画のみ。ロジックは `useRegistForm` に委譲。

```
RegistPage
└── FormCard（タイトル: "アカウント登録"）
    ├── FormField（ユーザー名）
    ├── FormField（パスワード）
    ├── FormErrorBanner（APIエラー表示）
    ├── SubmitButton（"登録"）
    └── <Link to="/login">ログインはこちら</Link>
```

---

## カスタムフック

### useLoginForm

| state | 型 | 説明 |
|-------|-----|------|
| `username` | `string` | ユーザー名入力値 |
| `password` | `string` | パスワード入力値 |
| `errors` | `LoginFormErrors` | クライアントバリデーションエラー |
| `apiError` | `string` | APIエラーメッセージ |
| `loading` | `boolean` | 送信中フラグ |

**handleSubmit フロー**

```
1. validateLoginForm(username, password) でクライアントバリデーション
   → エラーあり: errors にセット、処理終了
2. loading = true
3. loginRequest(username, password) を呼び出し
4. 成功: localStorage.setItem('token', token) → navigate('/')
5. 失敗: apiError にエラーメッセージをセット
6. loading = false
```

### useRegistForm

| state | 型 | 説明 |
|-------|-----|------|
| `username` | `string` | ユーザー名入力値 |
| `password` | `string` | パスワード入力値 |
| `errors` | `RegistFormErrors` | クライアントバリデーションエラー |
| `apiError` | `string` | APIエラーメッセージ |
| `loading` | `boolean` | 送信中フラグ |

**handleSubmit フロー**

```
1. validateRegistForm(username, password) でクライアントバリデーション
   → エラーあり: errors にセット、処理終了
2. loading = true
3. registRequest(username, password) を呼び出し
4. 成功: navigate('/login')
5. 失敗: apiError にエラーメッセージをセット
6. loading = false
```

---

## バリデーション

### loginValidation / registValidation（同一ロジック）

| フィールド | 条件 | エラーメッセージ |
|-----------|------|----------------|
| username | 空文字 | 「ユーザー名を入力してください。」 |
| username | 11文字以上 | 「ユーザー名は10文字以内で入力してください。」 |
| password | 空文字 | 「パスワードを入力してください。」 |
| password | 8文字未満 または 21文字以上 | 「パスワードは8〜20文字で入力してください。」 |

---

## API通信

### accountApi.ts

**APIベースURL構築**

```typescript
const BASE_URL = `${process.env.REACT_APP_API_SCHEME}://${process.env.REACT_APP_API_HOST}:${process.env.REACT_APP_API_PORT}`;
```

| 関数 | メソッド | エンドポイント | 戻り値 | エラー |
|------|---------|-------------|-------|-------|
| `loginRequest(username, password)` | POST | `/accounts/login` | `Promise<string>`（JWTトークン） | Error をthrow |
| `registRequest(username, password)` | POST | `/accounts/regist` | `Promise<void>` | Error をthrow |

---

## 共通コンポーネント

### FormCard

フォームページ全体の外枠。ダーク系フルスクリーン中央配置。

| props | 型 | 必須 | 説明 |
|-------|-----|------|------|
| `title` | `string` | ✅ | カードタイトル |
| `onSubmit` | `FormEventHandler` | ✅ | フォーム送信ハンドラー |
| `children` | `ReactNode` | ✅ | カード内コンテンツ |

スタイル: `bg-slate-900`（背景）、`bg-slate-800`（カード）

### FormField

ラベル＋入力欄＋エラーメッセージのセット。

| props | 型 | 必須 | デフォルト | 説明 |
|-------|-----|------|---------|------|
| `id` | `string` | ✅ | - | input の id |
| `label` | `string` | ✅ | - | ラベルテキスト |
| `type` | `'text' \| 'password'` | ❌ | `'text'` | input の type |
| `value` | `string` | ✅ | - | 入力値 |
| `onChange` | `ChangeEventHandler` | ✅ | - | 変更ハンドラー |
| `error` | `string` | ❌ | - | エラーメッセージ |
| `disabled` | `boolean` | ❌ | `false` | 非活性フラグ |
| `maxLength` | `number` | ❌ | - | 最大文字数 |
| `autoComplete` | `string` | ❌ | - | オートコンプリート |

エラー時: `border-red-500` + 赤テキスト表示

### FormErrorBanner

APIエラーメッセージを赤背景バナーで表示。

| props | 型 | 必須 | 説明 |
|-------|-----|------|------|
| `message` | `string` | ✅ | エラーメッセージ（空文字で非表示） |

### SubmitButton

送信ボタン。ローディング中はラベル変更＋非活性。

| props | 型 | 必須 | デフォルト | 説明 |
|-------|-----|------|---------|------|
| `label` | `string` | ✅ | - | ボタンラベル |
| `loadingLabel` | `string` | ❌ | `'処理中...'` | ローディング中ラベル |
| `loading` | `boolean` | ❌ | `false` | ローディングフラグ |
