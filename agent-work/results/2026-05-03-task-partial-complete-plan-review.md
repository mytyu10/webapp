# 計画レビュー結果: タスク一覧完了状態表示改善（一部完了表示・楽観的UI更新）

- 日付: 2026-05-03
- 判定: 要修正

## レビュー対象の計画

【実装計画】
機能名: タスク一覧完了状態表示改善（一部完了表示・楽観的UI更新）
DBスキーマ変更: なし

影響範囲:
- バックエンド: なし
- フロントエンド: あり

フロントエンド実装ステップ:

1. frontend/src/hooks/useTaskList.ts — handleToggleComplete を楽観的UI更新に修正（修正）
   - 現状: APIコール後に setTasks でステートを更新している
   - 変更:
     a. APIコール前にローカルステートを即座に更新する（楽観的更新）
        - `setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, is_completed: is_completed } : t)))` を先に実行
     b. APIコール失敗時は元のステートに戻す（ロールバック）
        - catch ブロックでロールバック用の prevTasks を setTasks に渡す
     c. APIコール成功時はサーバーから返ってきた最新データで上書きする（整合性担保）
        - 成功時の setTasks 呼び出しは維持する
   - 注意: 楽観的更新の対象は tasks 配列のトップレベル要素だが、Task 型の children は再帰構造であるため
     トップレベルの is_completed フィールドの更新のみで良い（children の更新は不要）

2. frontend/src/hooks/useTaskList.ts — TaskTreeNode に hasPartiallyCompletedChildren フラグを追加（修正）
   - TaskTreeNode インターフェースに `hasPartiallyCompletedChildren: boolean` フィールドを追加する
   - buildTaskTrees の flatten 関数内で、タスク自身が未完了（is_completed === false）かつ
     直接の子タスクのうち1件以上が完了している場合に hasPartiallyCompletedChildren: true をセットする
   - 判定ロジック:
     ```
     const hasPartiallyCompletedChildren =
       !Boolean(task.is_completed) &&
       task.children.some((child) => Boolean(child.is_completed));
     ```

3. frontend/src/pages/TaskListPage.tsx — 「一部完了」スタイルの適用（修正）
   - renderTaskCard 関数内のカードの className を修正する
   - 現状:
     ```
     bg-slate-700 border rounded-lg p-5
     ${node.is_completed ? 'border-green-800 opacity-75' : 'border-slate-600'}
     ```
   - 変更後（優先順位: 完了 > 一部完了 > 通常）:
     ```
     bg-slate-700 border rounded-lg p-5
     ${node.is_completed
       ? 'border-green-800 opacity-75'
       : node.hasPartiallyCompletedChildren
         ? 'border-yellow-700 bg-yellow-950'
         : 'border-slate-600'}
     ```
   - 加えて、一部完了の場合はカード内に小さなバッジ（例: 「一部完了」テキストバッジ）を表示する
     - 表示位置: タイトル行（h2 の隣）または下部情報行
     - スタイル例: `px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-800 text-yellow-200`
     - 表示条件: `node.hasPartiallyCompletedChildren` が true のとき

注意事項:
- TaskTreeNode への新フィールド追加は既存の利用箇所（TaskListPage の renderTaskCard）に影響しないよう
  省略可能フィールドにはせず、必ず値をセットすること（型安全を維持）
- 楽観的更新のロールバック時は setToggleCompleteError でエラーメッセージも表示する（既存の挙動を維持）
- tasks 配列は children を含む再帰構造であるが、楽観的更新は tasks のトップレベル要素の is_completed を
  更新するのみでよい。incompleteTrees / completedTrees は useMemo で再計算されるため、
  トップレベルの is_completed 変更だけで表示が切り替わる
  （ただし toggleTaskCompletion で子タスクを操作している場合は children 配列内の更新が必要になるが、
  現行の UI は子タスクの完了ボタンも同じ handleToggleComplete を呼び出しているため、
  tasks 配列内の該当 id のタスクのみ更新すれば足りる）
- 楽観的更新の実装パターン:
  1. rollbackTasks = [...tasks のスナップショット] を保持（クロージャで prev を使う）
  2. setTasks で楽観的に更新
  3. APIコール
  4. 成功 → APIレスポンスで再度 setTasks（サーバー値で上書き）
  5. 失敗 → rollbackTasks で setTasks（ロールバック）+ setToggleCompleteError
- Tailwind CSS でのみスタイリングすること（インラインスタイル・CSS モジュール禁止）
- コンポーネントの戻り値型に JSX.Element を使用しない（React.ReactElement または型省略）
- マジックナンバーを使わず、色・クラス名は定数化すること（例: PARTIAL_COMPLETE_CARD_CLASSES）

## チェックリスト結果

| ID | 観点 | 結果 | 備考 |
|----|------|------|------|
| A1 | 依頼内容の網羅性 | OK | 要件1（現行維持）・2（背景色変更）・3（楽観的更新）すべてカバー |
| A2 | フロントエンドのステップ | OK | ステップ1〜3がフロントエンドのみ |
| A3 | バックエンドのステップ | N/A | バックエンド変更なし |
| A4 | DBスキーマ変更の記載 | N/A | 「DBスキーマ変更: なし」と明記 |
| B1 | バックエンド実装順序 | N/A | バックエンド変更なし |
| B2 | フロント/バックエンドの順序 | N/A | バックエンド変更なし |
| B3 | 循環依存なし | OK | useTaskList → TaskListPage の単方向依存 |
| C1 | 既存機能への影響なし | NG | flatten関数のスプレッド展開に hasPartiallyCompletedChildren の代入が欠落（コンパイルエラー） |
| C2 | 不要な新規作成なし | OK | 既存の toggleTaskCompletion・setTasks・setToggleCompleteError を流用 |
| D1 | 命名規約 | OK | camelCase・UPPER_SNAKE_CASE ともに規約準拠 |
| D2 | バックエンド構成 | N/A | バックエンド変更なし |
| D3 | フロントエンド構成 | OK | hooks と pages の分離を維持 |
| E1 | エラーハンドリング | OK | ロールバック + setToggleCompleteError が明記 |
| E2 | 入力バリデーション | N/A | 入力値なし（UIトリガーのみ） |
| E3 | JwtAuthGuard | N/A | バックエンド変更なし |

## 判定: 要修正

## 指摘事項

### NG C1: flatten 関数のスプレッド展開に hasPartiallyCompletedChildren の代入が欠落

**問題点:**
現在の `flatten` 関数は `const node: TaskTreeNode = { ...task, depth }` でノードを生成しています。
計画では `hasPartiallyCompletedChildren` を必須フィールドとして `TaskTreeNode` に追加するよう指示していますが、
`flatten` 関数内でそのフィールドを実際に代入する記述が計画に含まれていません。
判定ロジックは書かれているものの、ノード生成箇所を修正するステップが抜けているため、
このまま実装するとTypeScriptのコンパイルエラーになります。

**修正案:**
ステップ2に以下の実装箇所を追加すること:

```typescript
function flatten(task: Task, depth: number): TaskTreeNode[] {
  const hasPartiallyCompletedChildren =
    !Boolean(task.is_completed) &&
    task.children.some((child) => Boolean(child.is_completed));
  const node: TaskTreeNode = { ...task, depth, hasPartiallyCompletedChildren };
  const childNodes = task.children
    .filter((child) => Boolean(child.is_completed) === completedFilter)
    .flatMap((child) => flatten(child, depth + 1));
  return [node, ...childNodes];
}
```

計画のステップ2の記述を「`flatten` 関数内で判定ロジックを算出し、`{ ...task, depth, hasPartiallyCompletedChildren }` としてノードを生成する」という形に修正・補完する必要があります。

## リスク・注意点

1. **楽観的更新と `children` 配列内のネスト構造の不整合**: `tasks` ステートはトップレベルのフラット配列だが、各 `Task` は `children: Task[]` を持つネスト構造。子タスクの完了状態を楽観的更新した場合、`tasks.map((t) => t.id === id ? {...t, is_completed} : t)` ではトップレベルエントリのみ更新され、親タスクの `children` 配列内にある同一タスクのオブジェクトは更新されない。このため `hasPartiallyCompletedChildren` の再計算（useMemoによるbuildTaskTrees）が一時的に古い値を参照する可能性がある。APIレスポンスで上書きするまでの間、表示がずれることを許容する方針であれば問題ないが、方針を明確にしておく必要がある。

2. **`completedTrees` での `hasPartiallyCompletedChildren` の挙動確認**: 完了済みタスク（`is_completed === true`）に対しては `hasPartiallyCompletedChildren` は常に `false` になる（`!Boolean(task.is_completed)` が `false`）。これは要件通りの動作だが、実装時に意図的な動作であることを把握しておくこと。
