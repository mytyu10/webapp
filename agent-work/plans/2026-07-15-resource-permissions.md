# リソース権限共有 + 認可フレームワーク化 実装計画

- 日付: 2026-07-15
- ステータス: 承認済み

## 依頼内容

- TaskPermission / LinkPermission テーブルを追加し、作成者以外のユーザーへ READ/WRITE 権限を付与できるようにする
- GET /tasks・GET /links は「作成者 or 担当者 or 権限付与済み」を返すよう修正
- 権限管理 API（POST/DELETE/GET /tasks/:id/permissions、同様に /links/:id/permissions）を追加
- READ権限のみのユーザーが更新・削除すると 403 を返す
- 認可チェックを OwnershipGuard に集約し、サービス層の個別チェックを削除

## 実装計画

### DBスキーマ変更: あり

追加テーブル:
- TaskPermission: (task_id, username, permission) — 複合PK、onDelete Cascade
- LinkPermission: (link_item_id, username, permission) — 複合PK、onDelete Cascade

### バックエンド実装ステップ

1. Prismaスキーマ更新 (schema.prisma)
2. message.ts 更新 (PERMISSION セクション追加、TASK/LINK セクション補完)
3. OwnershipGuard + @CheckOwnership デコレータ作成
   - src/common/guards/ownership.guard.ts
   - src/common/decorators/check-ownership.decorator.ts
   - リソースタイプ別に task/link/event を分岐して所有者 or WRITE権限 or 担当者を確認
4. permission.dto.ts 作成 (CreatePermissionDto / PermissionResponseDto)
5. TaskPermissionRepository 作成
6. TaskPermissionService 作成 (add/remove/findAll)
7. TaskController 更新 (permissions エンドポイント追加、OwnershipGuard を PATCH/DELETE に適用)
8. TaskRepository.findAll 更新 (TaskPermission も OR 条件に含める)
9. LinkPermissionRepository 作成
10. LinkPermissionService 作成 (add/remove/findAll)
11. LinkController 更新 (permissions エンドポイント追加、OwnershipGuard を PATCH/DELETE に適用)
12. LinkRepository.findAll 更新 (LinkPermission も OR 条件に含める)
13. LinkService.update に OwnershipGuard 適用 (サービス層チェックはガードに移管)
14. LinkService.delete のサービス層 ForbiddenException チェック削除 (ガードに移管)
15. EventService の update/remove サービス層 ForbiddenException チェック削除 (ガードに移管)
16. TaskModule/LinkModule 更新 (新サービス・リポジトリ登録)
17. CommonModule 更新 (OwnershipGuard を PrismaService と共に提供)

注: EventService.updateRepeatGroup はグループ全件の created_by チェックで複雑なためサービス層に残す。

### フロントエンド実装ステップ

1. permissionApi.ts 作成 (fetchTaskPermissions/addTaskPermission/deleteTaskPermission/fetchLinkPermissions/addLinkPermission/deleteLinkPermission)
2. PermissionModal.tsx 新規作成 (ユーザー選択 + READ/WRITE 選択 + 権限一覧表示・削除)
3. TaskDetailPanel.tsx 更新 (作成者のみ「共有」ボタン表示 → PermissionModal 開く)
4. LinkListPage.tsx 更新 (作成者のみ「共有」ボタン表示 → PermissionModal 開く)

## レビュー結果

- 承認
- リスク: OwnershipGuard で担当者（assignee）も更新許可するよう実装すること
- リスク: updateRepeatGroup はサービス層チェックを残す（グループ全件の一括チェックが必要なため）
- 注意: LinkService.update に現在 created_by チェックがないため OwnershipGuard 適用は権限範囲拡張になる（意図した変更）
