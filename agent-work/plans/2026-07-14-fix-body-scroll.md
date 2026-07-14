# ブラウザウィンドウ縦スクロールバー除去 実装計画

- 日付: 2026-07-14
- ステータス: 承認済み

## 依頼内容
画面の一番大外（html / body / ルートレイアウト）に縦スクロールバーが出ないようにしてほしい。各ページ内部のスクロールは残してよいが、ブラウザウィンドウ全体の縦スクロールバーが出る状態を修正すること。フロントエンドのみの修正。

## 原因分析

1. `ChatPage` のルート div が `h-screen` を指定 → `SidebarLayout.main` の padding(p-4/p-8) 内で 100vh が確保されるため body がオーバーフロー
2. `SidebarLayout` 外側 div が `min-h-screen` のみでコンテンツ多数時に body にスクロールバーが出る
3. `html/body/#root` に `overflow: hidden` が設定されていないため、どのコンポーネントのオーバーフローも body に伝播する

## 実装計画（修正ファイル一覧）

1. `frontend/src/index.css`
   - Tailwind @layer base で `html`, `body`, `#root` に `height: 100%; overflow: hidden;` を付与

2. `frontend/src/components/SidebarLayout.tsx`
   - 外側 div: `min-h-screen` → `h-screen overflow-hidden`
   - `main`: 既存の `overflow-y-auto` を維持し `h-full` を追加して縦いっぱいに伸ばす

3. `frontend/src/pages/ChatPage.tsx`
   - ルート div: `h-screen` → `h-full`（SidebarLayout.main が高さを確定させるため）

## レビュー結果

- 判定: 承認
- リスク: LoginPage など SidebarLayout 外ページで body スクロールが必要になった場合は個別対応で対処
