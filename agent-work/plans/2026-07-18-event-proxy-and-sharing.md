# event-proxy-and-sharing 実装計画

- 日付: 2026-07-18
- ステータス: 承認済み

## 依頼内容

カレンダーの予定を作成するときに「誰に登録するか」を選択できるようにする。

- 「代理登録」: 自分以外のユーザーの予定として作成する（created_by を指定ユーザーにする）。代理登録を許可するユーザーは権限付与ベースで制御（全ユーザーが誰でも代理登録できるわけではない）。編集・削除は created_by ユーザーと代理登録者の両方が可能
- 「共有登録」: 自分の予定として作成し、他ユーザーにも同じ予定を共有する（複数ユーザーのカレンダーに表示される）。共有先ユーザーは閲覧のみ（WRITE権限での編集・削除は不要）
- 権限モデル: タスクと同様の READ/WRITE 権限管理を Event にも導入
- 予定作成後の権限管理エンドポイントも追加（/events/:id/permissions 相当）
- EventModal 内で現在のタブとは別のオプションとして「代理登録」「共有登録」を配置

## 実装計画

### DBスキーマ変更: あり

追加テーブル:
1. `EventPermission` テーブル（共有登録の権限管理）
   - event_id Int / username String / permission String ("READ" | "WRITE")
   - @@id([event_id, username])、Event と Account に Cascade 外部キー
2. `EventProxyGrant` テーブル（代理登録権限管理）
   - granter_username String / grantee_username String
   - @@id([granter_username, grantee_username])、Account に Cascade 外部キー

既存モデル変更:
- Account に event_permissions / proxy_grants_given / proxy_grants_received リレーション追加
- Event に permissions リレーション追加

### バックエンド実装ステップ

B1: Prismaスキーマ変更（EventPermission / EventProxyGrant モデル追加、Account/Event リレーション追加）

B2: リポジトリ新規追加
- event-permission.repository.ts: findAll / findOne / upsert / delete
- event-proxy-grant.repository.ts: findAllGrantees / findAllGranters / upsert / delete

B3: サービス新規追加
- event-permission.service.ts: findAll(作成者のみ) / add(作成者のみ) / remove(作成者のみ) / ensureOwner
- event-proxy-grant.service.ts: findGrantees / findGranters / add(自分自身への付与は不可) / remove

B4: DTO追加
- CreateProxyGrantDto / EventPermissionResponseDto / ProxyGrantResponseDto
- CreateEventDto / CreateMultipleEventsDto / CreateRepeatEventDto に created_by?: string を追加
- EventResponseDto に permissions?: EventPermissionResponseDto[] を追加（権限取得時のみ付与）

B5: event.service.ts 修正
- create / createMultiple / createRepeat: dto に created_by が含まれる場合に EventProxyGrant チェックを実施
- findAll: EventPermission の OR 条件を追加（created_by = username OR permissions に username が含まれる）

B6: event.repository.ts 修正
- findAll(username): permissions OR 条件追加
- findById(id): permissions の include 追加

B7: OwnershipGuard 拡張（ownership.guard.ts）
- checkEventOwnership: 作成者 OR EventPermission の WRITE 権限保持者を許可
- GET リクエストは READ/WRITE どちらでも許可、PATCH/DELETE は WRITE のみ許可（メソッド判定追加）
- タスク・リンクの既存挙動に影響しないようにイベント専用の判定として実装

B8: event.controller.ts 追加エンドポイント（固定パスは :id より前に定義）
- GET /events/proxy-grants/grantees — 自分が許可した代理登録者一覧
- GET /events/proxy-grants/granters — 自分が代理登録できるユーザー一覧
- POST /events/proxy-grants — 代理登録権限付与
- DELETE /events/proxy-grants/:granteeUsername — 代理登録権限削除
- GET /events/:id/permissions — 権限一覧（作成者のみ）
- POST /events/:id/permissions — 権限付与（作成者のみ）
- DELETE /events/:id/permissions/:username — 権限削除（作成者のみ）

B9: message.ts に EVENT セクション追加
- PERMISSION_FETCH_FAILED / PERMISSION_ADD_FAILED / PERMISSION_REMOVE_FAILED
- PROXY_GRANT_ADD_SUCCESS / PROXY_GRANT_REMOVE_SUCCESS / PROXY_GRANT_SELF_FORBIDDEN
- PROXY_GRANT_ADD_FAILED / PROXY_GRANT_REMOVE_FAILED / PROXY_GRANT_FORBIDDEN
- PROXY_GRANT_NOT_FOUND

B10: events.module.ts 更新（新規サービス・リポジトリを providers に追加）

### フロントエンド実装ステップ

F1: eventApi.ts 拡張
- CalendarEvent に permissions? フィールド追加
- EventInput に created_by?: string 追加
- 権限API関数: fetchEventPermissions / addEventPermission / deleteEventPermission
- 代理登録API関数: fetchProxyGrantees / fetchProxyGranters / addProxyGrant / deleteProxyGrant

F2: EventModal.tsx 修正
- 新規作成時: タブの下に「代理登録オプション」「共有登録オプション」セクションを追加
- 代理登録: fetchProxyGranters() でユーザー一覧取得→セレクトで選択→created_by として送信
- 共有登録: 予定作成後に選択ユーザーへ addEventPermission を呼び出す
- 自分自身は共有対象から除外する

F3: CalendarPage.tsx 修正
- 予定編集モーダル（EditMode）で作成者のみ「共有」ボタンを表示し PermissionModal を開く

F4: permissionApi.ts 拡張
- fetchEventPermissions / addEventPermission / deleteEventPermission 追加

F5: useCalendar.ts 拡張
- handleCreateEventWithOptions(input, options: { proxyUsername?: string; shareUsernames?: string[] }) 追加
- 代理登録・共有登録の複合操作をまとめる

F6: ProxyGrantModal.tsx 新規追加
- 自分が許可した代理登録者の一覧・追加・削除
- CalendarPage に「代理登録設定」ボタンを追加して開く

### 変更ファイル一覧

バックエンド（新規）:
- backend/prisma/schema.prisma
- backend/src/events/repository/event-permission.repository.ts
- backend/src/events/repository/event-proxy-grant.repository.ts
- backend/src/events/service/event-permission.service.ts
- backend/src/events/service/event-proxy-grant.service.ts

バックエンド（既存修正）:
- backend/src/events/dto/event.dto.ts
- backend/src/events/service/event.service.ts
- backend/src/events/repository/event.repository.ts
- backend/src/events/controller/event.controller.ts
- backend/src/events/events.module.ts
- backend/src/common/guards/ownership.guard.ts
- backend/src/common/type/message.ts

フロントエンド（新規）:
- frontend/src/components/ProxyGrantModal.tsx

フロントエンド（既存修正）:
- frontend/src/api/eventApi.ts
- frontend/src/api/permissionApi.ts
- frontend/src/hooks/useCalendar.ts
- frontend/src/components/EventModal.tsx
- frontend/src/pages/CalendarPage.tsx

## レビュー結果

### チェックリスト結果
- [x] DBスキーマ設計（EventPermission / EventProxyGrant）整合性OK
- [x] Controller → Service → Repository 層構造準拠
- [x] OwnershipGuard 拡張は既存ファイルへの追記（新ガードファイルを作らない）
- [x] 固定パスルートの順序設定OK
- [x] 代理登録権限検証はサービス層で実施

### リスク・注意点
1. CreateMultipleEventsDto / CreateRepeatEventDto にも created_by?: string を追加すること
2. OwnershipGuard の checkEventOwnership に HTTP メソッド判定を追加すること（GET: READ/WRITE どちらでも許可、PATCH/DELETE: WRITE のみ許可）
3. 代理登録: サービス層で必ず EventProxyGrant チェックを通してから created_by を採用すること
4. 共有登録UIのユーザー除外: 作成者本人は共有対象から除外すること
