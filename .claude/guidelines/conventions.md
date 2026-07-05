# 開発規約

## 技術スタック

| 領域 | 技術 |
|------|------|
| Frontend | React (TypeScript) |
| Backend | NestJS (TypeScript) |
| ORM | Prisma |
| 認証 | JWT |
| スタイリング | Tailwind CSS |
| DB | SQLite（開発）/ PostgreSQL（本番: db.prisma.io） |

---

## 共通規約

- TypeScriptの`any`型は使用禁止
- TypeScriptでは全てに型宣言を行うこと（設定できない場合の例外を除く）
- `noImplicitAny: false`はESLint設定の都合によるものだが、新規コードでは`any`を書かない
- Prettier設定: シングルクォート、末尾カンマあり
- UI・バックエンドのメッセージは日本語で記述する
- マジックナンバーを使用せず、意味がわかるように定数化（enum も可）を行うこと
- 各処理にはJsDocを付与し、なんの処理をしているかわかるように記載すること

---

## バックエンド規約（NestJS）

### モジュール構成

機能ごとに以下のファイルを作成する:

```
src/<feature>/
  <feature>.module.ts
  controller/
    <feature>.controller.ts
  service/
    <feature>.service.ts
  repository/
    <feature>.repository.ts
  dto/
    <feature>.dto.ts
```

### レイヤー責務

- **Controller**: HTTPエンドポイントの定義のみ。ビジネスロジックを書かない
- **Service**: ビジネスロジック
- **Repository**: Prismaを使ったDBアクセスのみ。ServiceからPrismaClientを直接呼ばない
- **DTO**: `class-validator`でバリデーション。リクエスト/レスポンスの型定義

### Prisma

- DBアクセスは必ずRepositoryレイヤーで行う
- モデルは`backend/prisma/schema.prisma`に定義する
- マイグレーションは`npx prisma migrate dev`で実施
- **スキーマ変更後は必ず`npx prisma migrate dev --name <migration_name>`を実行してマイグレーションファイルを作成・適用すること**。`prisma generate`だけでは不十分でDBに反映されない
- `PrismaService`のシャットダウン処理は`OnModuleDestroy`を実装し`onModuleDestroy()`で`$disconnect()`を呼ぶ（Prisma 7で廃止された`$on('beforeExit')`は使用しない）
- [2026-05-03] Prisma 7では`schema.prisma`の`datasource`ブロックに`url`を書かない。接続URLは`prisma.config.ts`の`datasource.url`で管理する

### 認証（JWT）

- JWTの生成は`src/jwt/jwt.service.ts`で行う（有効期限1h、`JWT_SECRET`環境変数使用）
- JWTのペイロード型は`src/jwt/jwt.payload.ts`に`JwtPayload`インターフェースとして定義する（`AccountDto`を渡さない）
- トークン生成はServiceレイヤーで行う（Controllerでは行わない）
- 保護されたルートには`JwtAuthGuard`を適用する（`src/jwt/jwt-auth.guard.ts`）

### パスワード

- ハッシュ化は`src/common/service/hash.service.ts`のSHA256を使用する（bcryptは使用しない）

### メッセージ定数

- レスポンスメッセージは`src/common/type/message.ts`に日本語で定義して使用する
- 文字列リテラルを直接コードに書かない

### HTTPステータス

- `src/common/type/status.enum.ts`のenumを使用する

---

## フロントエンド規約（React）

### コンポーネント

- 関数コンポーネント＋Hooksのみ使用（クラスコンポーネント禁止）
- 1ファイル1コンポーネントを原則とする
- [2026-05-03] 関数コンポーネントの戻り値型に`JSX.Element`を使用しない（`tsconfig.json`の`jsx: "react-jsx"`設定では`JSX`名前空間が存在しないため）。戻り値型は省略するか`React.ReactElement`を使用すること

### 共通UIコンポーネント

- フォーム要素は`src/components/`に定義したPJ固有の共通コンポーネントを使用する
- `<input>`・`<button>`・`<form>`などのHTML要素をページコンポーネントに直接書かない
- 共通コンポーネントの例: `FormCard`（フォーム外枠）、`FormField`（ラベル＋入力欄＋エラー表示）、`FormErrorBanner`（APIエラー表示）、`SubmitButton`（送信ボタン）、`TextAreaField`（テキストエリア）、`DateTimeField`（日時入力）、`SelectField`（セレクトボックス）、`CancelButton`（キャンセルボタン）、`ConfirmModal`（削除確認モーダル）
- 新しい画面を追加する際も同様に共通コンポーネントを呼び出す形で実装する

### スタイリング

- Tailwind CSSのユーティリティクラスのみ使用する
- CSSモジュール・インラインスタイル・外部CSSファイルは禁止
- レスポンシブ対応はTailwindのブレークポイント（sm, md, lg）を使用する
- [2026-05-03] カレンダー画面の文字色は白基調（`text-slate-100` / `text-slate-200` 相当）にすること
- [2026-05-03] FullCalendarのテーマ上書きは`src/index.css`の`.calendar-wrapper`スコープ内でCSS変数を使って行う（`--fc-today-bg-color`等）。今日の日付ハイライトは紺ベースのUIで視認しやすい色（sky系の薄いオーバーレイ等）にし、黄色デフォルトを使わないこと

### レスポンシブ・スマホ対応

- [2026-05-04] スマホ判定のブレークポイントは640px未満とし、`src/hooks/useIsMobile.ts`（`useIsMobile`フック）で一元管理する。`window.resize` イベントでリアクティブに追従する
- [2026-05-04] タスク詳細サイドパネルはスマホ時（`isMobile=true`）に全画面表示とし、一覧エリアを `hidden` で非表示にする（PC時は flex 横並び）
- [2026-05-04] サイドパネルのドラッグリサイザーはスマホでは非表示にする
- [2026-05-04] パネルの閉じるボタン（×）はPC専用とし、スマホでは「← 一覧へ戻る」ボタンに置き換える。両方同時に表示しない
- [2026-05-04] `isMobile` フラグはページから props 経由でコンポーネントに渡す（コンポーネント内で `useIsMobile` を直接呼ばない）

### ディレクトリ構成

単一責務の原則に従い、役割ごとにファイルを分割する:

```
src/
  api/           バックエンドとのHTTP通信のみ（fetch呼び出し）
  hooks/         カスタムフック（状態管理・オーケストレーション）
  validation/    バリデーションロジックのみ（純粋関数）
  pages/         ページコンポーネント（描画のみ・ロジックを持たない）
```

### 単一責務

- ページコンポーネントにビジネスロジック・API呼び出し・バリデーションを書かない
- ロジックはカスタムフック（`src/hooks/`）に切り出す
- API通信は`src/api/`に集約し、fetch を直接ページ・フックに書かない
- バリデーションは`src/validation/`に純粋関数として定義する

### API通信

- バックエンドへの接続先は環境変数から構築する（ハードコード禁止）
- 変数名: `REACT_APP_API_SCHEME` / `REACT_APP_API_HOST` / `REACT_APP_API_PORT`
- 開発デフォルト値は`.env`に定義し、ローカル上書きは`.env.local`を使用する（`.env.local`はgit管理外）
- JWTは現状`localStorage`に保存（セキュリティ改善は別途対応）

### 認証済みルート（PrivateRoute）

- [2026-05-03] PrivateRouteではトークンの存在チェックのみでなく、JWTをデコードして`exp`（有効期限）も検証すること。トークンが存在しない・期限切れの場合はログイン画面（`/login`）へリダイレクトする（トークン存在チェックのみの実装は却下）

### ルーティング

- `src/App.tsx`でルート定義を管理する
- ページコンポーネントは`src/pages/`に1ファイル1コンポーネントで配置する

### アクセス制御

- タスクの削除ボタンは作成者（`created_by`）とログイン中ユーザー（`getCurrentUsername()`）が一致する場合のみ表示する
- タスクの編集ボタンはログインユーザーに関わらず全ユーザーに表示する（作成者限定にしない）

---

## データベース規約

### Accountモデル（現行スキーマ）

```prisma
model Account {
  username        String         @id
  hashed_password String
  task_assignees  TaskAssignee[]
  created_tasks   Task[]         @relation("TaskCreator")
}
```

- [2026-05-03] `username`を主キーとして使用する（`id: Int @id @default(autoincrement())`は使用しない）。実装を正として採用済み

### Taskモデル（現行スキーマ）

```prisma
model Task {
  id           Int            @id @default(autoincrement())
  title        String
  description  String
  due_date     DateTime
  priority     String         @default("MEDIUM")  // HIGH / MEDIUM / LOW
  category     String?
  parent_id    Int?
  created_by   String
  created_at   DateTime       @default(now())
  updated_at   DateTime       @updatedAt
  is_completed Boolean        @default(false)
  closed_by    String?
  assignees    TaskAssignee[]
  creator      Account        @relation("TaskCreator", fields: [created_by], references: [username])
  parent       Task?          @relation("TaskChildren", fields: [parent_id], references: [id])
  children     Task[]         @relation("TaskChildren")
}

model TaskAssignee {
  task_id  Int
  username String
  task     Task    @relation(fields: [task_id], references: [id], onDelete: Cascade)
  account  Account @relation(fields: [username], references: [username], onDelete: Cascade)

  @@id([task_id, username])
}
```

- priorityフィールドは`HIGH` / `MEDIUM` / `LOW`の文字列で管理する（デフォルト: `MEDIUM`）
- categoryはオプショナル（`String?`）。カテゴリ一覧は`GET /tasks/categories`で取得する
- parent_idによる親子タスク構造をサポートする。子タスクは`children`リレーションで取得
- is_completedフィールドはタスクの完了状態を管理する（デフォルト: `false`）。`PATCH /tasks/:id` の `is_completed` フィールドで切り替える
- closed_byフィールドはタスクをクローズ（完了）したユーザー名を記録する（デフォルト: `null`）。`is_completed` が `false→true` に変化したとき Service レイヤーでリクエストユーザー名を自動セットし、`true→false` に戻したとき `null` にクリアする。フロントエンドから直接 `closed_by` を送信する必要はない
- SQLiteはBooleanをinteger（0/1）で保存するため、Prismaから返る値をフロントエンドで比較する際は `=== true/false` の厳密比較ではなく `Boolean(value)` に変換してから比較すること（例: `Boolean(t.is_completed) === completedFilter`）
- TaskAssigneeの担当者更新はdelete+insertトランザクションで対応する
- Taskの削除はCascade設定によりTaskAssigneeも連動削除される

### 命名規則

- テーブル名: PascalCase（Prismaモデル名に準拠）
- カラム名: snake_case

---

## LINE連携・通知機能規約

### LINE OAuth フロー

- LINE Login の認可エンドポイントへのリダイレクトは `GET /accounts/line/login` で行う（JwtAuthGuard適用）
- コールバックエンドポイント `GET /accounts/line/callback` は JwtAuthGuard 適用済み。LINE から届くリクエストに Bearer トークンが必要
- LINE OAuth のコールバック URL（`LINE_CALLBACK_URL`）はバックエンド側に固定（`http://localhost:8000/accounts/line/callback`）。本番環境では適切な URL に変更すること
- フロントエンドのリダイレクト先は `FRONTEND_URL` 環境変数から構築する（ハードコード禁止）
- LINE コールバックページ（`/line-callback`）は PrivateRoute 外に配置する（LINE OAuth からの直接リダイレクトのため JWT が localStorage にない状態でアクセスされる）

### TaskNotification（通知モデル）

- [2026-05-04] `TaskNotification` の `notify_at` は ISO8601 文字列として受け取り、Service レイヤーで `new Date()` に変換してから Repository に渡す
- 通知の送信済みフラグ（`is_sent`）は LINE Messaging API への送信成功後にのみ `true` に更新する。送信失敗時は `false` のままにして次回 Cron で再試行できるようにする
- LINE 未連携の担当者（`line_user_id` が null）はスキップしてログを出力する（エラーとして扱わない）

### AppModule のモジュール設計

- [2026-05-04] `AppModule` の providers に `TaskNotificationRepository`・`PrismaService`・`LoggerService` を直接登録しない。`TaskModule`（`TaskNotificationRepository` をエクスポート）と `CommonModule`（`LoggerService` をエクスポート）を imports に追加して DI で受け取ること（重複登録禁止）

### TaskDetailPanel の設計方針

- [2026-05-04] `TaskDetailPanel` は独自 API 呼び出しを行わない。通知削除も `onDeleteNotification: (taskId: number, notificationId: number) => Promise<void>` コールバック prop を通じて親（TaskListPage）に委譲する。`deleteNotification` を TaskDetailPanel 内で直接 import・呼び出しをしない

---

## リンク集機能規約

### LinkItem モデル設計方針

- [2026-07-04] 階層構造はフォルダ（FOLDER タイプ）のみが持つ。リンク（LINK タイプ）は末端要素（葉ノード）であり、children を持てない
- [2026-07-04] `parent_id` はフォルダの親フォルダを指す用途にのみ使用する。リンクの `parent_id` は所属フォルダID（またはルート直下の null）
- [2026-07-04] LINK タイプを親（parent_id の参照先）にすることはできない。バックエンド Service の `validateParentIsFolder` で強制する
- [2026-07-04] LINK タイプには `url` が必須。FOLDER タイプの `url` は null。この制約はバックエンド Service とフロントエンド validation の両方で保証する
- [2026-07-04] FOLDER 削除時は Prisma の `onDelete: Cascade` により配下の全子孫（サブフォルダ・リンク）が連動削除される。フロントエンドの削除確認モーダルにはその旨の警告文を表示すること
- [2026-07-04] `order` フィールドはDB登録のみ。並び替えUIはスコープ外。フロントエンドでは `order` 昇順でソートして表示する（Repository で `orderBy: [{ order: 'asc' }, { created_at: 'asc' }]`）

### LinkItem API 設計方針

- [2026-07-04] `GET /links` はフラット配列をServiceでツリー構造に変換して返す（Map を使った O(n) 変換）。LINK の children は常に空配列
- [2026-07-04] 削除は作成者（`created_by`）のみ可能。編集（PATCH）は全ユーザーに許可する

### フロントエンド リンク集の設計方針

- [2026-07-04] リンク集のフォルダ展開/折りたたみ状態は `useLinkList` フックの `expandedIds: Set<number>` で一元管理する
- [2026-07-04] `LinkFormModal` の親フォルダ選択肢には FOLDER タイプのみ表示する。編集時は自分自身と子孫を候補から除外する（循環参照防止）
- [2026-07-04] `LinkFormModal` の type 選択は編集時に変更不可とする（type 変更は別途削除・再作成で対応）

---

## カレンダー予定 複数日付・繰り返し機能規約

### Event モデルと一括作成の設計方針

- [2026-07-05] 複数日付・繰り返し予定は独立した `Event` レコードとして一括作成する。DB スキーマに繰り返しルールを保持するカラムは追加しない（シンプルさを優先）
- [2026-07-05] 一括作成後の個別イベントは互いに独立しており、一括削除・一括編集の連鎖は対応しない
- [2026-07-05] 一括作成の最大件数は100件とし、バックエンド Service と フロントエンド validation の両方で強制する

### バックエンド Event 一括作成の実装方針

- [2026-07-05] SQLite は `prisma.event.createMany` の戻り値が `{ count: N }` のみで個別 ID が返らないため、`$transaction` + 個別 `create` 配列実行で実装する（`EventRepository.createMany`）
- [2026-07-05] 固定パスルート (`POST /events/multiple`・`POST /events/repeat`) は可変パスルート (`PATCH /events/:id` 等) より前に Controller に定義すること
- [2026-07-05] 繰り返しの `days_of_week` は `weekly` タイプ時のみ有効とし、`daily`・`monthly` では無視する
- [2026-07-05] 毎月繰り返しで指定日が存在しない月は `Math.min(baseDay, lastDayOfMonth)` でその月の末日に補正する
- [2026-07-05] `duration_minutes` は予定の長さ（分単位）として受け取り、Service 内で算出する

### フロントエンド EventModal の設計方針

- [2026-07-05] `EventModal` の作成モードは「通常」「複数日付」「繰り返し」の3種類をタブで切り替える。編集時はタブを表示せず通常フォームのみ表示する
- [2026-07-05] 複数日付モードの開始日時リストは `DateTimeField` を追加・削除できる形式で実装する
- [2026-07-05] 繰り返しモードの曜日選択は `repeat_type === 'weekly'` のときのみ表示する
- [2026-07-05] `EventModal` に `onSaveMultiple` / `onSaveRepeat` の2つの新規 props を追加する
