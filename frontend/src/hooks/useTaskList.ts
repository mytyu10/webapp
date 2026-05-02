import { useState, useEffect, useCallback } from 'react';
import { fetchTasks, deleteTask, Task } from '../api/taskApi';
import { logger } from '../logger';

const CONTEXT = 'useTaskList';

/** useTaskListフックの戻り値型 */
interface UseTaskListReturn {
  tasks: Task[];
  loading: boolean;
  error: string;
  handleDelete: (id: number) => Promise<void>;
  reload: () => void;
}

/**
 * タスク一覧・削除カスタムフック
 * タスクの取得と削除処理を管理する
 */
export function useTaskList(): UseTaskListReturn {
  const [tasks, setTasks] = useState<Task[]>([]);
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

    async function loadTasks(): Promise<void> {
      setLoading(true);
      setError('');
      try {
        logger.info(CONTEXT, 'タスク一覧読み込み開始');
        const data = await fetchTasks();
        if (!cancelled) {
          setTasks(data);
          logger.info(CONTEXT, `タスク一覧読み込み完了: ${data.length}件`);
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

    void loadTasks();

    return () => {
      cancelled = true;
    };
  }, [reloadTrigger]);

  /**
   * タスクを削除する。削除後は一覧を再読み込みする
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

  return { tasks, loading, error, handleDelete, reload };
}
