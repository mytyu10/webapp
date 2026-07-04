# リンク集（Link Collection）画面 実装計画

- 日付: 2026-07-04
- ステータス: 承認済み

## 依頼内容

リンク集画面を実装してほしい。

### 機能要件
- URL・タイトル・説明などを保存できる
- 画面上にリンク集として一覧表示できる
- エクスプローラーのように階層構造（フォルダ/リンク）を表現できる
- リンクを整理・管理できる（追加・編集・削除・移動）

### 設計方針
- 階層構造はフォルダのみが持つ。リンクは末端要素（葉ノード）であり、children を持たない
- parent_id はフォルダに対してのみ使用（フォルダの親フォルダを指す）
- リンクの parent_id はフォルダIDまたは null（ルート直下）
- リンク自体を親にすることはできない（バックエンドServiceでバリデーション）

## 実装計画

### DBスキーマ変更: あり

### データモデル

```prisma
model LinkItem {
  id          Int        @id @default(autoincrement())
  title       String
  url         String?
  description String     @default("")
  type        String
  parent_id   Int?
  order       Int        @default(0)
  created_by  String
  created_at  DateTime   @default(now())
  updated_at  DateTime   @updatedAt
  creator     Account    @relation("LinkCreator", fields: [created_by], references: [username])
  parent      LinkItem?  @relation("LinkChildren", fields: [parent_id], references: [id], onDelete: Cascade)
  children    LinkItem[] @relation("LinkChildren")
}
```

Account モデルに created_links LinkItem[] @relation("LinkCreator") リレーションを追加。

### バックエンド実装ステップ

1. Prismaスキーマ更新
2. メッセージ定数追加（LINK セクション）
3. DTO定義（CreateLinkItemDto / UpdateLinkItemDto / LinkItemResponseDto）
4. Repository（findAll / findById / create / update / delete）
5. Service（ツリー構築 / LINK を親にできない制約 / 作成者チェック）
6. Controller（GET/POST/PATCH/DELETE /links、JwtAuthGuard適用）
7. Module（LinksModule / AppModule に追加）

### フロントエンド実装ステップ

1. API通信（frontend/src/api/linkApi.ts）
2. バリデーション（frontend/src/validation/linkValidation.ts）
3. カスタムフック useLinkList.ts（ツリー取得・展開/折りたたみ・削除）
4. カスタムフック useLinkForm.ts（作成/編集・バリデーション）
5. ページ LinkListPage.tsx（ツリー表示・モーダル連携）
6. モーダル LinkFormModal.tsx（作成/編集フォーム）
7. ルーター・ナビゲーション更新（App.tsx / Sidebar.tsx）

### Prismaマイグレーション
- npx prisma migrate dev --name add-link-item

### ファイル一覧

新規作成（バックエンド）:
- backend/src/links/dto/link.dto.ts
- backend/src/links/repository/link.repository.ts
- backend/src/links/service/link.service.ts
- backend/src/links/controller/link.controller.ts
- backend/src/links/link.module.ts

変更（バックエンド）:
- backend/prisma/schema.prisma
- backend/src/common/type/message.ts
- backend/src/app.module.ts

新規作成（フロントエンド）:
- frontend/src/api/linkApi.ts
- frontend/src/validation/linkValidation.ts
- frontend/src/hooks/useLinkList.ts
- frontend/src/hooks/useLinkForm.ts
- frontend/src/pages/LinkListPage.tsx
- frontend/src/components/LinkFormModal.tsx

変更（フロントエンド）:
- frontend/src/App.tsx
- frontend/src/components/Sidebar.tsx

## レビュー結果

### チェックリスト: 全項目OK

### リスク・注意点

1. Cascade削除の UX リスク: フォルダ削除時に配下の全子要素が連動削除される。削除確認モーダルに警告文を表示すること。
2. ツリー構築のパフォーマンス: 全件取得してServiceでツリー構築する設計。個人利用想定で許容範囲。
3. order フィールド: 並び替えUIはスコープ外。フロントエンドで order 昇順ソートして表示すること。
4. LinkItem の自己参照 Cascade 設定: parent リレーションに onDelete: Cascade を付与すること。
