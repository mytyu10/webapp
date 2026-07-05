# 実装計画: タスク管理機能4件追加

- 日付: 2026-05-03

## ユーザーの依頼

1. タスク完了/未完了の切り替え（is_completed フィールド追加・UI実装）
2. タスク一覧から子タスクを非表示（parent_id: null フィルター）
3. タスク一覧の並び順（due_date 昇順・親タスクは子の最短 due_date 基準）
4. 子タスク作成時に親タスクのカテゴリを引き継ぐ
5. 子タスク詳細から親タスクへの遷移・親タスク詳細から子タスク詳細への遷移

## 実装計画

```
【実装計画】
機能名: タスク管理機能4件追加
DBスキーマ変更: あり（is_completed Boolean @default(false) を Task モデルに追加）

影響範囲:
- バックエンド: あり
- フロントエンド: あり
```

---

## 実装順序と変更内容

### STEP 1: Prisma スキーマ変更 + マイグレーション

**対象ファイル: `backend/prisma/schema.prisma`（修正）**

Task モデルに以下フィールドを追加する:

```prisma
is_completed  Boolean  @default(false)
```

追加位置は `updated_at` の直後。

**マイグレーション手順（スキーマ変更後に必ず実行）:**

```bash
cd backend
npx prisma migrate dev --name add_is_completed_to_task
```

- `prisma generate` だけでは DB に反映されないため、`migrate dev` を必ず実行する

---

### STEP 2: バックエンド DTO 変更

**対象ファイル: `backend/src/tasks/dto/task.dto.ts`（修正）**

**変更箇所1: UpdateTaskDto に is_completed フィールドを追加**

```typescript
/** タスク完了状態 */
@IsBoolean({ message: '完了状態はtrue/falseで指定してください' })
@IsOptional()
is_completed?: boolean;
```

`IsBoolean` を `class-validator` の import に追加する。

**変更箇所2: TaskResponseDto に is_completed フィールドを追加**

```typescript
export interface TaskResponseDto {
  // ... 既存フィールド ...
  is_completed: boolean;  // 追加
}
```

CreateTaskDto への追加は不要（デフォルト false で作成するため）。

---

### STEP 3: バックエンド Repository 変更

**対象ファイル: `backend/src/tasks/repository/task.repository.ts`（修正）**

**変更箇所1: TaskWithRelations 型に is_completed を含める**

Prisma が自動生成する `Task` 型に `is_completed` が追加されるため、型の追加変更は不要。ただし children の型定義が `Task & { assignees: TaskAssignee[] }` なので、Prisma の再生成後は自動的に含まれる。

**変更箇所2: findAll() に `where: { parent_id: null }` を追加**

```typescript
async findAll(): Promise<TaskWithRelations[]> {
  return this.prisma.task.findMany({
    where: { parent_id: null },  // 追加: 親タスクのみ取得
    include: {
      assignees: true,
      children: {
        include: { assignees: true },
      },
    },
    orderBy: { due_date: 'asc' },  // 変更: created_at: 'desc' → due_date: 'asc'
  });
}
```

`orderBy` を `created_at: 'desc'` から `due_date: 'asc'` に変更する（親タスク自体の due_date 昇順。子タスクの最短 due_date 基準のソートはフロントエンドで実施）。

**変更箇所3: update() の data 引数型と Prisma update 呼び出しに is_completed を追加**

```typescript
async update(
  id: number,
  data: {
    // ... 既存フィールド ...
    is_completed?: boolean;  // 追加
  },
): Promise<TaskWithRelations> {
  return this.prisma.$transaction(async (tx) => {
    // ...
    return tx.task.update({
      where: { id },
      data: {
        // ... 既存スプレッド ...
        ...(data.is_completed !== undefined && { is_completed: data.is_completed }),  // 追加
      },
      // ...
    });
  });
}
```

---

### STEP 4: バックエンド Service 変更

**対象ファイル: `backend/src/tasks/service/task.service.ts`（修正）**

**変更箇所1: update() で is_completed を Repository に渡す**

```typescript
const task = await this.taskRepository.update(id, {
  // ... 既存フィールド ...
  is_completed: dto.is_completed,  // 追加
});
```

**変更箇所2: toResponseDto() に is_completed を追加**

```typescript
private toResponseDto(task: TaskWithRelations): TaskResponseDto {
  return {
    // ... 既存フィールド ...
    is_completed: task.is_completed,  // 追加
    children: task.children.map((child) => ({
      // ... 既存フィールド ...
      is_completed: child.is_completed,  // 追加
    })),
  };
}
```

---

### STEP 5: フロントエンド API 型定義変更

**対象ファイル: `frontend/src/api/taskApi.ts`（修正）**

**変更箇所1: Task インターフェースに is_completed を追加**

```typescript
export interface Task {
  // ... 既存フィールド ...
  is_completed: boolean;  // 追加
}
```

**変更箇所2: updateTask で is_completed を送信できるよう TaskInput を拡張**

`updateTask` は `Partial<TaskInput>` を受け取る。`TaskInput` に `is_completed` を追加する:

```typescript
export interface TaskInput {
  // ... 既存フィールド ...
  is_completed?: boolean;  // 追加
}
```

**変更箇所3: toggleTaskCompletion 関数を追加**

タスク完了切り替え専用のヘルパー関数を追加する（省略可能だが、呼び出し元がシンプルになる）:

```typescript
/**
 * タスクの完了/未完了状態を切り替える
 */
export async function toggleTaskCompletion(id: number, is_completed: boolean): Promise<Task> {
  return updateTask(id, { is_completed });
}
```

---

### STEP 6: フロントエンド useTaskList フック変更

**対象ファイル: `frontend/src/hooks/useTaskList.ts`（修正）**

**変更箇所1: UseTaskListReturn に handleToggleComplete を追加**

```typescript
interface UseTaskListReturn {
  // ... 既存フィールド ...
  handleToggleComplete: (id: number, is_completed: boolean) => Promise<void>;
}
```

**変更箇所2: handleToggleComplete 関数を実装**

```typescript
/**
 * タスクの完了/未完了状態を切り替える
 */
const handleToggleComplete = useCallback(async (id: number, is_completed: boolean): Promise<void> => {
  try {
    logger.info(CONTEXT, `タスク完了状態切り替え: id=${id}, is_completed=${String(is_completed)}`);
    const updated = await toggleTaskCompletion(id, is_completed);
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    logger.info(CONTEXT, `タスク完了状態切り替え完了: id=${id}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'タスクの更新に失敗しました。';
    logger.warn(CONTEXT, `タスク完了状態切り替え失敗: id=${id} - ${message}`);
    throw new Error(message);
  }
}, []);
```

**変更箇所3: filteredTasks の useMemo にソートロジックを追加**

子タスクの最短 due_date を使って親タスクを並び替えるソートをフロントエンドで実施する。

```typescript
/**
 * 各タスクの実効的なソートキーを取得する
 * 子タスクが存在する場合は子タスクの最短 due_date を使用する
 */
function getEffectiveDueDate(task: Task): Date {
  if (task.children.length === 0) return new Date(task.due_date);
  const childDates = task.children.map((c) => new Date(c.due_date).getTime());
  return new Date(Math.min(...childDates));
}

const filteredTasks = useMemo((): Task[] => {
  const filtered = selectedCategory
    ? tasks.filter((t) => t.category === selectedCategory)
    : tasks;
  return [...filtered].sort(
    (a, b) => getEffectiveDueDate(a).getTime() - getEffectiveDueDate(b).getTime(),
  );
}, [tasks, selectedCategory]);
```

`getEffectiveDueDate` はフック外のモジュールスコープ（または同ファイル内のトップレベル）に定義する。

**変更箇所4: import に toggleTaskCompletion を追加**

```typescript
import { fetchTasks, fetchCategories, deleteTask, toggleTaskCompletion, Task } from '../api/taskApi';
```

---

### STEP 7: フロントエンド TaskListPage 変更

**対象ファイル: `frontend/src/pages/TaskListPage.tsx`（修正）**

**変更箇所1: useTaskList から handleToggleComplete を受け取る**

```typescript
const {
  filteredTasks,
  categories,
  selectedCategory,
  loading,
  error,
  handleDelete,
  handleToggleComplete,
  setSelectedCategory,
} = useTaskList();
```

**変更箇所2: 完了/未完了切り替えボタンを各タスク行に追加**

タスクカード内のボタン群に完了切り替えボタンを追加する。完了済みタスクはタイトルに取り消し線を付けて視覚的に区別する。

```tsx
{/* 完了切り替えボタン */}
<button
  type="button"
  onClick={() => void handleToggleComplete(task.id, !task.is_completed)}
  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors
    ${task.is_completed
      ? 'text-slate-300 bg-green-700 hover:bg-green-600'
      : 'text-slate-300 bg-slate-600 hover:bg-slate-500'}`}
>
  {task.is_completed ? '完了済み' : '完了にする'}
</button>
```

タイトルの `<h2>` に完了状態に応じた取り消し線スタイルを追加:

```tsx
<h2 className={`text-base font-semibold text-slate-100 truncate ${task.is_completed ? 'line-through opacity-60' : ''}`}>
  {task.title}
</h2>
```

---

### STEP 8: フロントエンド useTaskForm フック変更（子タスク作成時のカテゴリ引き継ぎ）

**対象ファイル: `frontend/src/hooks/useTaskForm.ts`（修正）**

**変更箇所: parentId が存在する場合に親タスクの category を初期値として設定する**

編集モード用の `useEffect` とは別に、子タスク作成モード用の `useEffect` を追加する。

```typescript
/**
 * 子タスク作成モード時に親タスクのカテゴリを取得して初期値に設定する
 */
useEffect(() => {
  if (parentId === undefined) return;

  async function loadParentTask(): Promise<void> {
    if (parentId === undefined) return;
    try {
      logger.info(CONTEXT, `親タスク読み込み: parentId=${parentId}`);
      const parent = await fetchTask(parentId);
      if (parent.category) {
        setValues((prev) => ({ ...prev, category: parent.category ?? '' }));
        logger.info(CONTEXT, `親タスクのカテゴリを設定: ${parent.category ?? ''}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '親タスクの読み込みに失敗しました。';
      logger.warn(CONTEXT, `親タスク読み込み失敗: parentId=${parentId} - ${message}`);
      // カテゴリ取得失敗は致命的エラーではないため setApiError は呼ばない
    }
  }

  void loadParentTask();
}, [parentId]);
```

---

### STEP 9: フロントエンド TaskDetailPage 変更（親子タスク間のナビゲーション）

**対象ファイル: `frontend/src/pages/TaskDetailPage.tsx`（修正）**

**変更箇所1: 子タスク詳細画面に「親タスクへ戻る」リンクを追加**

タスクに `parent_id` が存在する場合、詳細画面の上部（または適切な位置）に親タスクへのリンクを表示する。

```tsx
{task.parent_id && (
  <Link
    to={`/tasks/${task.parent_id}`}
    className="inline-flex items-center text-sm text-blue-400 hover:text-blue-300 mb-4"
  >
    ← 親タスクへ
  </Link>
)}
```

**変更箇所2: 親タスク詳細画面の子タスク一覧で各子タスクをリンク化**

子タスク一覧の各アイテムを `Link` でラップして子タスク詳細画面へ遷移できるようにする。

```tsx
{task.children.map((child) => (
  <Link
    key={child.id}
    to={`/tasks/${child.id}`}
    className="block p-3 bg-slate-700 rounded-md hover:bg-slate-600 transition-colors"
  >
    <span className={`text-sm text-slate-100 ${child.is_completed ? 'line-through opacity-60' : ''}`}>
      {child.title}
    </span>
  </Link>
))}
```

子タスクのタイトルも `is_completed` の状態に応じて取り消し線を適用する（機能1と整合性を保つ）。

---

## 変更ファイル一覧まとめ

| # | ファイルパス | 種別 | 内容 |
|---|------------|------|------|
| 1 | `backend/prisma/schema.prisma` | 修正 | Task モデルに `is_completed Boolean @default(false)` を追加 |
| 2 | `backend/src/tasks/dto/task.dto.ts` | 修正 | UpdateTaskDto に `is_completed?: boolean` 追加、TaskResponseDto に `is_completed: boolean` 追加 |
| 3 | `backend/src/tasks/repository/task.repository.ts` | 修正 | findAll() に `where: { parent_id: null }` と `orderBy: { due_date: 'asc' }` を追加、update() に `is_completed` を追加 |
| 4 | `backend/src/tasks/service/task.service.ts` | 修正 | update() で `is_completed` を Repository に渡す、toResponseDto() に `is_completed` を追加 |
| 5 | `frontend/src/api/taskApi.ts` | 修正 | Task に `is_completed: boolean` 追加、TaskInput に `is_completed?: boolean` 追加、`toggleTaskCompletion` 関数追加 |
| 6 | `frontend/src/hooks/useTaskList.ts` | 修正 | `handleToggleComplete` 追加、filteredTasks の useMemo にソートロジック追加 |
| 7 | `frontend/src/pages/TaskListPage.tsx` | 修正 | `handleToggleComplete` を受け取り完了切り替えボタンを追加、完了済みタイトルに取り消し線を追加 |
| 8 | `frontend/src/hooks/useTaskForm.ts` | 修正 | parentId がある場合に親タスクのカテゴリを取得して初期値に設定する useEffect を追加 |
| 9 | `frontend/src/pages/TaskDetailPage.tsx` | 修正 | 子タスクから親タスクへのリンク追加、親タスクの子タスク一覧をリンク化 |

---

## 注意事項

- **マイグレーション必須**: STEP 1 のスキーマ変更後は必ず `npx prisma migrate dev --name add_is_completed_to_task` を実行すること。`prisma generate` のみでは DB に反映されない
- **子タスク一覧のソート**: `GET /tasks/:id` の children は並び順変更の影響を受けない（TaskDetailPage では children をそのまま表示する）。TaskDetailPage でもソートが必要な場合は別途検討
- **TaskResponseDto の children**: `children` の各要素にも `is_completed` を含める必要がある（`toResponseDto` の children マップ内に追記）
- **ソートのデータ整合性**: フロントエンドのソートは `filteredTasks` の useMemo 内で行うため、カテゴリフィルタ後にソートが適用される順序になる（要件通り）
- **完了切り替えのエラーハンドリング**: `handleToggleComplete` で throw した場合、現在 `TaskListPage` では catch していないため、必要に応じて `deleteError` と同様のエラー表示を追加すること（計画外だが実装時に考慮）
- **子タスクのカテゴリ引き継ぎ**: `useTaskForm` の親タスク取得失敗はサイレントに扱う（カテゴリが空のまま作成できるようにする）
- **TaskDetailPage の children**: GET /tasks/:id では `where: { parent_id: null }` は適用しないため、子タスクの表示には影響しない

## ユーザーへの確認事項

なし（機能3のソート実装場所についてはフロントエンドで実施する方針を採用した。バックエンドの `orderBy` を `due_date: 'asc'` に変更することで親タスク単独の基本ソートは担保し、「子タスクの最短 due_date 基準」の上書きソートのみフロントエンドで実施する二段構え）
