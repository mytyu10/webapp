# ポートフォリオ評価5項目の修正・実装 実装計画

- 日付: 2026-07-15
- ステータス: 承認済み

## 依頼内容
ポートフォリオ評価で指摘された以下5項目を全て実装・修正する:
1. bcrypt への移行（SHA-256 → bcrypt rounds=10、ログイン時移行ロジック付き）
2. DB インデックス追加（Task/TaskAssignee/Event/LinkItem/ChatMessage）
3. Swagger（OpenAPI）導入（@nestjs/swagger、/api/docs）
4. Rate Limiting（@nestjs/throttler、login/regist に厳しめ制限）
5. E2E テスト実装（regist/login/tasks/events フロー）

## 実装計画

### ステップ1: bcrypt 移行
- `hash.service.ts`: bcrypt.hash()/compare() に変更、SHA-256 互換照合メソッドを追加
- `account.service.ts`: login() に二段階照合（bcrypt → SHA-256 フォールバック → 再ハッシュ）を追加
- `@types/bcrypt` を devDependencies にインストール

### ステップ2: DB インデックス追加
- `schema.prisma` に以下を追加:
  - Task: @@index([created_by]), @@index([parent_id]), @@index([due_date])
  - TaskAssignee: @@index([username])
  - Event: @@index([created_by]), @@index([start_at])
  - LinkItem: @@index([created_by]), @@index([parent_id])
  - ChatMessage: @@index([from_user]), @@index([to_user]), @@index([created_at])
- マイグレーション名: add-performance-indexes

### ステップ3: Swagger 導入
- npm install @nestjs/swagger swagger-ui-express
- `main.ts`: DocumentBuilder + SwaggerModule.setup('api/docs', app, document)
- DTO への @ApiProperty 追加（AccountDto, CreateTaskDto, CreateEventDto）

### ステップ4: Rate Limiting
- npm install @nestjs/throttler
- `app.module.ts`: ThrottlerModule.forRoot([{ ttl: 60000, limit: 20 }]) + APP_GUARD
- `account.controller.ts`: login/regist に @Throttle({ default: { ttl: 60000, limit: 5 } })

### ステップ5: E2E テスト
- `backend/test/jest-e2e.json` 新規作成
- `backend/test/app.e2e-spec.ts` 新規作成（regist→login→tasks一覧→tasks作成→events一覧）
- テスト内で ThrottlerGuard をオーバーライドして Rate Limit の影響を排除

## レビュー結果
- 判定: 承認
- リスク: ThrottlerGuard グローバル適用により E2E テストが Rate Limit に引っかかる可能性あり → テスト環境でのガードオーバーライドで対処
- 追加対応: @types/bcrypt を devDependencies にインストール（bcrypt@6.0.0 はバンドル型定義なし）
