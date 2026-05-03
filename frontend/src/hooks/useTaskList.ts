import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchTasks, fetchCategories, deleteTask, toggleTaskCompletion, Task } from '../api/taskApi';
import { logger } from '../logger';

const CONTEXT = 'useTaskList';

/** useTaskListフックの戻り値型 */
interface UseTaskListReturn {
  tasks: Task[];
  filteredTasks: Task[];
  categories: string[];
  selectedCategory: string;
  loading: boolean;
  error: string;
  deleteError: string;
  toggleCompleteError: string;
  handleDelete: (id: number) => Promise<void>;
  handleToggleComplete: (id: number, is_completed: boolean) => Promise<void>;
  setSelectedCategory: (category: string) => void;
  reload: () => void;
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
 * タスク一覧・削除・カテゴリフィルタリングカスタムフック
 * タスクの取得・削除・完了状態切り替え・カテゴリフィルタリング処理を管理する
 */
export function useTaskList(): UseTaskListReturn {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [toggleCompleteError, setToggleCompleteError] = useState('');
  const [reloadTrigger, setReloadTrigger] = useState(0);

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
   * 選択カテゴリでフィルタリングし、有効期限（子タスクがある場合は子の最短期限）でソートしたタスク一覧
   * 未選択（空文字）の場合は全件を対象とする
   */
  const filteredTasks = useMemo((): Task[] => {
    const filtered = selectedCategory
      ? tasks.filter((t) => t.category === selectedCategory)
      : tasks;
    return [...filtered].sort(
      (a, b) => getEffectiveDueDate(a).getTime() - getEffectiveDueDate(b).getTime(),
    );
  }, [tasks, selectedCategory]);

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
   * タスクの完了状態を切り替える。成功後は state の該当タスクを更新する
   */
  const handleToggleComplete = useCallback(async (id: number, is_completed: boolean): Promise<void> => {
    try {
      logger.info(CONTEXT, `タスク完了状態切り替え実行: id=${id}, is_completed=${String(is_completed)}`);
      const updated = await toggleTaskCompletion(id, is_completed);
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
      logger.info(CONTEXT, `タスク完了状態切り替え完了: id=${id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'タスクの更新に失敗しました。';
      logger.warn(CONTEXT, `タスク完了状態切り替え失敗: id=${id} - ${message}`);
      setToggleCompleteError(message);
    }
  }, []);

  return {
    tasks,
    filteredTasks,
    categories,
    selectedCategory,
    loading,
    error,
    deleteError,
    toggleCompleteError,
    handleDelete,
    handleToggleComplete,
    setSelectedCategory,
    reload,
  };
}
