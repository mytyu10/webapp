import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchTasks, fetchCategories, deleteTask, Task } from '../api/taskApi';
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
  handleDelete: (id: number) => Promise<void>;
  setSelectedCategory: (category: string) => void;
  reload: () => void;
}

/**
 * タスク一覧・削除・カテゴリフィルタリングカスタムフック
 * タスクの取得・削除・カテゴリフィルタリング処理を管理する
 */
export function useTaskList(): UseTaskListReturn {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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
   * 選択カテゴリでフィルタリングしたタスク一覧
   * 未選択（空文字）の場合は全件返す
   */
  const filteredTasks = useMemo((): Task[] => {
    if (!selectedCategory) return tasks;
    return tasks.filter((t) => t.category === selectedCategory);
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

  return {
    tasks,
    filteredTasks,
    categories,
    selectedCategory,
    loading,
    error,
    handleDelete,
    setSelectedCategory,
    reload,
  };
}
