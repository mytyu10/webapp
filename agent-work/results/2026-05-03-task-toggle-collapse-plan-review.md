# 計画レビュー結果: 親タスク子タスクトグル表示

- 日付: 2026-05-03
- 判定: 要修正

## レビュー対象の計画

機能名: 親タスク子タスクトグル表示
DBスキーマ変更: なし

影響範囲:
- バックエンド: なし
- フロントエンド: あり

フロントエンド実装ステップ:
1. frontend/src/pages/TaskListPage.tsx — トグル開閉ステートの追加・toggleCollapse 関数の追加・
   renderTaskCard の修正・レンダリングフィルター追加（修正）

詳細:
- ステップ1: collapsedParentIds ステート追加（Set<number>, 初期値 new Set()）
- ステップ2: toggleCollapse 関数の追加（new Set() で新インスタンス生成して返す）
- ステップ3: isNodeHidden ヘルパー関数の追加（コンポーネント外に定義・再帰で祖先チェーン検索）
- ステップ4: renderTaskCard の修正（depth=0: flex ラッパー+トグルボタン/スペーサー, depth>0: 既存維持）
- ステップ5: incompleteTrees / completedTrees の .map() 前に .filter() を追加

## チェックリスト結果

| ID | 観点 | 結果 | 備考 |
|----|------|------|------|
| A1 | 依頼内容の網羅性 | OK | 要件1〜6・制約すべてカバー済み |
| A2 | フロントエンドのステップ | OK | ステップ1〜5が記載済み |
| A3 | バックエンドのステップ | N/A | バックエンド変更なし |
| A4 | DBスキーマ変更の記載 | N/A | 「DBスキーマ変更: なし」と明記済み |
| B1 | バックエンド実装順序 | N/A | バックエンド変更なし |
| B2 | フロント/バックエンドの順序 | N/A | バックエンド変更なし |
| B3 | 循環依存なし | OK | isNodeHidden は純粋関数、toggleCollapse はUIローカル操作、循環なし |
| C1 | 既存機能への影響なし | NG | renderTaskCard の depth > 0 分岐について、変更後の具体的 JSX が計画に記載されていない。実装者が depth=0 のみ flex ラッパーを追加し depth>0 を維持することを正確に実装できるか、計画の記述が不完全 |
| C2 | 不要な新規作成なし | OK | TaskListPage.tsx のみ修正、新規ファイル作成なし |
| D1 | 命名規約 | OK | collapsedParentIds / toggleCollapse / isNodeHidden / TOGGLE_BUTTON_WIDTH_CLASS すべて規約準拠 |
| D2 | バックエンド構成 | N/A | バックエンド変更なし |
| D3 | フロントエンド構成 | OK | 制約「useTaskList.ts は変更しない」前提でページ内に定義する設計は依頼者の意図と一致。isNodeHidden は純粋関数でビジネスロジックではなく表示ロジック |
| E1 | エラーハンドリング | N/A | UIローカルステート操作のみ、APIコールなし |
| E2 | 入力バリデーション | N/A | バリデーション対象なし |
| E3 | JwtAuthGuard | N/A | フロントエンドのみの変更 |

## 判定: 要修正

## 指摘事項

### NG C1: renderTaskCard の depth > 0 ブランチの具体的 JSX が計画に不記載

**問題点:**
計画のステップ4では「depth === 0 の場合: flex ラッパーでトグルボタン/スペーサーとカードを横並びにする」「depth > 0 の場合: 既存のインデント構造を維持する」と方針のみが記載されています。変更後の renderTaskCard 関数全体（特に depth=0 と depth>0 の分岐を含む JSX の差分）が具体的に示されていないため、実装者が誤って depth > 0 のインデント・「└」アイコン表示を壊すリスクがあります。

**修正案:**
ステップ4に以下のような具体的な分岐 JSX を追記する。

```tsx
function renderTaskCard(node: TaskTreeNode): React.ReactElement {
  const isOwner = currentUsername !== null && node.created_by === currentUsername;
  const indentClass = DEPTH_INDENT_CLASSES[node.depth] ?? 'pl-14';
  const hasChildren = node.children.length > 0;
  // ... (cardStateClass 等は変更なし)

  const card = (
    <div className={`bg-slate-700 border rounded-lg p-5 ${cardStateClass} ${node.depth > 0 ? 'border-l-2 border-l-slate-500' : ''}`}>
      {/* 既存の内部 JSX は変更なし */}
    </div>
  );

  if (node.depth === 0) {
    // depth=0 のみ: トグルボタン/スペーサーを横並びで追加
    return (
      <div className={`${indentClass} flex items-start gap-1`}>
        {hasChildren ? (
          <button
            type="button"
            onClick={() => toggleCollapse(node.id)}
            aria-label="子タスクの表示切り替え"
            className={`${TOGGLE_BUTTON_WIDTH_CLASS} h-6 shrink-0 mt-5 flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors`}
          >
            <span className={`inline-block transition-transform duration-200 text-xs ${collapsedParentIds.has(node.id) ? '' : 'rotate-90'}`}>
              ＞
            </span>
          </button>
        ) : (
          <div className={`${TOGGLE_BUTTON_WIDTH_CLASS} shrink-0`} />
        )}
        <div className="flex-1">{card}</div>
      </div>
    );
  }

  // depth > 0: 既存のインデント構造を維持（変更なし）
  return <div className={indentClass}>{card}</div>;
}
```

この差分を計画のステップ4に追加することで、既存の depth > 0 表示（インデント・「└」アイコン）を壊さないことが明確になる。

## リスク・注意点

1. **TOGGLE_BUTTON_WIDTH_CLASS 定数と実際の幅クラスの不整合リスク:**
   計画ではボタンに `w-6 h-6`、スペーサーに `w-6` を使用しているが、定数 `TOGGLE_BUTTON_WIDTH_CLASS = 'w-6'` をボタンとスペーサーの両方に適用しようとしている。ボタンには `w-6` に加え `h-6 shrink-0 mt-5 flex items-center justify-center` 等が必要で、定数が部分的にしか使えない。定数化の効果が限定的な点を実装時に確認すること。

2. **isNodeHidden の allNodes 引数について:**
   計画の注意事項に「同一セクション（未完了/完了）のフラット配列を渡すこと」と記載されているが、これは重要な制約。incompleteTrees にある子タスクの親は必ず incompleteTrees 内に存在する（buildTaskTrees の構造上）ため実装上問題ないが、filter を適用した後のフィルター済み配列を allNodes に渡さないよう注意すること（filter 後は一部ノードが欠落しており親が見つからない場合がある）。

   具体的には:
   ```tsx
   // 正しい（フィルター前の配列を allNodes に渡す）
   incompleteTrees
     .filter((node) => !isNodeHidden(node, incompleteTrees, collapsedParentIds))
     .map(...)

   // 誤り（filter 後の配列を allNodes に渡すと再帰が壊れる）
   const filtered = incompleteTrees.filter(...);
   filtered.map((node) => isNodeHidden(node, filtered, collapsedParentIds))  // NG
   ```
   計画のコードはすでに正しい書き方になっているが、実装時に変更しないよう注意する。

3. **既存コードの `<button>` 直書きについて:**
   conventions.md では「`<button>` 等の HTML 要素をページコンポーネントに直接書かない」という規約があるが、既存の TaskListPage.tsx はすでに多数の `<button>` を直書きしており規約違反の状態が継続している。今回の計画はこの状態を踏まえた上でトグルボタンも同じパターンで追加するものであり、依頼者の制約（TaskListPage.tsx のみ変更）とも一致する。ただし規約との乖離は認識しておくこと。
