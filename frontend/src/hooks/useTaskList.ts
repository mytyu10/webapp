import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { fetchTasks, fetchCategories, deleteTask, toggleTaskCompletion, Task } from '../api/taskApi';
import { logger } from '../logger';

const CONTEXT = 'useTaskList';

/** ツリー構造を持つタスク型（インデントレベルを付与） */
export interface TaskTreeNode extends Task {
  /** 階層の深さ（ルートタスク: 0, 子タスク: 1, ...） */
  depth: number;
  /** 自身が未完了かつ直接の子タスク（孫以下は対象外）に1件以上完了があるかどうか */
  hasPartiallyCompletedChildren: boolean;
}

/**
 * useTaskList フックの戻り値型
 * タスク一覧・削除・完了切り替え・カテゴリフィルタリング・ツリー構築に必要な
 * ステートとハンドラーをまとめて提供する
 */
interface UseTaskListReturn {
  tasks: Task[];
  /** 未完了タスクのツリー展開済みフラット配列（階層順・depth付き） */
  incompleteTrees: TaskTreeNode[];
  /** 完了済みタスクのツリー展開済みフラット配列（階層順・depth付き） */
  completedTrees: TaskTreeNode[];
  categories: string[];
  selectedCategory: string;
  loading: boolean;
  error: string;
  toggleCompleteError: string;
  handleDelete: (id: number) => Promise<void>;
  handleToggleComplete: (id: number, is_completed: boolean) => Promise<void>;
  setSelectedCategory: (category: string) => void;
  reload: () => void;
}

/**
 * ツリー内の指定IDのタスクの is_completed を再帰的に更新する
 */
function updateIsCompletedInTree(tasks: Task[], id: number, is_completed: boolean): Task[] {
  return tasks.map((t) => {
    if (t.id === id) return { ...t, is_completed };
    if (t.children.length > 0) {
      return { ...t, children: updateIsCompletedInTree(t.children, id, is_completed) };
    }
    return t;
  });
}

/**
 * ツリー内の指定IDのタスクをサーバーレスポンスで置き換える（children は既存を維持）
 */
function replaceTaskInTree(tasks: Task[], updated: Task): Task[] {
  return tasks.map((t) => {
    if (t.id === updated.id) return { ...updated, children: t.children };
    if (t.children.length > 0) {
      return { ...t, children: replaceTaskInTree(t.children, updated) };
    }
    return t;
  });
}

/**
 * タスクの有効な期限日を返すヘルパー関数
 * 子タスクを持つ親タスクは子タスクの最短 due_date を基準とする
 */
function getEffectiveDueDate(task: Task): Date {
  if (!task.children || task.children.length === 0) return new Date(task.due_date);
  const childDates = task.children.map((c) => new Date(c.due_date).getTime());
  return new Date(Math.min(...childDates));
}

/**
 * タスク一覧をツリー構造（depth付きフラット配列）に展開する
 * 親タスク → 子タスクの順に DFS で並べる
 * カテゴリフィルターが指定されている場合、タスク自身またはいずれかの子孫がフィルター対象なら含める
 */
function buildTaskTrees(
  tasks: Task[],
  selectedCategory: string,
  completedFilter: boolean,
): TaskTreeNode[] {
  /**
   * タスク（子孫を含む）がカテゴリフィルターに一致するか再帰チェック
   */
  function matchesCategory(task: Task): boolean {
    if (!selectedCategory) return true;
    if (task.category === selectedCategory) return true;
    return task.children.some((child) => matchesCategory(child));
  }

  /**
   * タスクを再帰的にフラット配列へ展開する
   */
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

  // ルートタスク（parent_idなし）のうち完了状態が一致し、フィルターに合致するものを抽出
  const rootTasks = tasks.filter(
    (t) => t.parent_id === null && Boolean(t.is_completed) === completedFilter && matchesCategory(t),
  );

  // due_date でソートしてツリー展開
  const sorted = [...rootTasks].sort(
    (a, b) => getEffectiveDueDate(a).getTime() - getEffectiveDueDate(b).getTime(),
  );

  return sorted.flatMap((task) => flatten(task, 0));
}

/**
 * タスク一覧・削除・カテゴリフィルタリングカスタムフック
 * タスクの取得・削除・完了状態切り替え・カテゴリフィルタリング処理を管理する
 * 完了/未完了セクションをツリー構造（depth付きフラット配列）として返す
 */
export function useTaskList(): UseTaskListReturn {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toggleCompleteError, setToggleCompleteError] = useState('');
  const [reloadTrigger, setReloadTrigger] = useState(0);
  // 並走する複数トグル操作でのロールバック競合を防ぐため ref で最新ステートを保持する
  const tasksRef = useRef<Task[]>(tasks);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  /**
   * タスク一覧を再読み込みするトリガーをインクリメントする
   */
  const reload = useCallback((): void => {
    setReloadTrigger((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadData(): Promise<void> {
      setLoading(true);
      setError('');
      try {
        logger.info(CONTEXT, 'タスク一覧・カテゴリ読み込み開始');
        const [data, cats] = await Promise.all([fetchTasks(), fetchCategories()]);
        if (!cancelled) {
          setTasks(data);
          setCategories(cats);
          logger.info(CONTEXT, `タスク一覧読み込み完了: ${data.length}件, カテゴリ: ${cats.length}件`);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'タスクの取得に失敗しました。';
          logger.warn(CONTEXT, `タスク一覧読み込み失敗: ${message}`);
          setError(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [reloadTrigger]);

  /**
   * 未完了タスクのツリー展開済みフラット配列（カテゴリフィルター・深さ情報付き）
   */
  const incompleteTrees = useMemo(
    (): TaskTreeNode[] => buildTaskTrees(tasks, selectedCategory, false),
    [tasks, selectedCategory],
  );

  /**
   * 完了済みタスクのツリー展開済みフラット配列（カテゴリフィルター・深さ情報付き）
   */
  const completedTrees = useMemo(
    (): TaskTreeNode[] => buildTaskTrees(tasks, selectedCategory, true),
    [tasks, selectedCategory],
  );

  /**
   * タスクを削除する。削除後は一覧から該当タスクを除去する
   */
  const handleDelete = useCallback(async (id: number): Promise<void> => {
    try {
      logger.info(CONTEXT, `タスク削除実行: id=${id}`);
      await deleteTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
      logger.info(CONTEXT, `タスク削除完了: id=${id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'タスクの削除に失敗しました。';
      logger.warn(CONTEXT, `タスク削除失敗: id=${id} - ${message}`);
      throw new Error(message);
    }
  }, []);

  /**
   * タスクの完了状態を切り替える。
   * 楽観的UI更新: ボタン押下直後にローカルステートを更新し、
   * APIコール成功時はサーバーレスポンスで上書き、失敗時はスナップショットにロールバックする
   */
  const handleToggleComplete = useCallback(async (id: number, is_completed: boolean): Promise<void> => {
    const snapshot = tasksRef.current;
    setTasks((prev) => updateIsCompletedInTree(prev, id, is_completed));

    try {
      logger.info(CONTEXT, `タスク完了状態切り替え実行: id=${id}, is_completed=${String(is_completed)}`);
      const updated = await toggleTaskCompletion(id, is_completed);
      // サーバーレスポンスで上書き（整合性担保・children は既存を維持）
      setTasks((prev) => replaceTaskInTree(prev, updated));
      logger.info(CONTEXT, `タスク完了状態切り替え完了: id=${id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'タスクの更新に失敗しました。';
      logger.warn(CONTEXT, `タスク完了状態切り替え失敗: id=${id} - ${message}`);
      setTasks(snapshot);
      setToggleCompleteError(message);
    }
  }, []);

  return {
    tasks,
    incompleteTrees,
    completedTrees,
    categories,
    selectedCategory,
    loading,
    error,
    toggleCompleteError,
    handleDelete,
    handleToggleComplete,
    setSelectedCategory,
    reload,
  };
}
