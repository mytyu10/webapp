import { useState, useEffect, useCallback } from 'react';
import { fetchTask, toggleTaskCompletion, Task } from '../api/taskApi';
import { logger } from '../logger';

const CONTEXT = 'useTaskDetail';

/** useTaskDetailフックの戻り値型 */
interface UseTaskDetailReturn {
  task: Task | null;
  loading: boolean;
  error: string;
  toggleCompleteError: string;
  handleToggleComplete: () => Promise<void>;
}

/**
 * タスク詳細取得・完了状態トグルのカスタムフック
 * 指定IDのタスクを取得し、完了状態の切り替えを管理する
 */
export function useTaskDetail(id: string | undefined): UseTaskDetailReturn {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toggleCompleteError, setToggleCompleteError] = useState('');

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    /**
     * タスクを取得してstateにセットする
     */
    async function loadTask(): Promise<void> {
      setLoading(true);
      setError('');
      try {
        logger.info(CONTEXT, `タスク詳細読み込み: id=${id}`);
        const data = await fetchTask(Number(id));
        if (!cancelled) {
          setTask(data);
          logger.info(CONTEXT, `タスク詳細読み込み完了: id=${id}`);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'タスクの取得に失敗しました。';
          logger.warn(CONTEXT, `タスク詳細読み込み失敗: id=${id} - ${message}`);
          setError(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadTask();

    return () => {
      cancelled = true;
    };
  }, [id]);

  /**
   * タスクの完了状態をトグルする
   * 現在の is_completed を反転して PATCH リクエストを送信し、state を更新する
   */
  const handleToggleComplete = useCallback(async (): Promise<void> => {
    if (!task) return;
    setToggleCompleteError('');
    try {
      const newCompleted = !task.is_completed;
      logger.info(CONTEXT, `タスク完了状態切り替え: id=${task.id}, is_completed=${String(newCompleted)}`);
      const updated = await toggleTaskCompletion(task.id, newCompleted);
      setTask(updated);
      logger.info(CONTEXT, `タスク完了状態切り替え完了: id=${task.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'タスクの更新に失敗しました。';
      logger.warn(CONTEXT, `タスク完了状態切り替え失敗: ${message}`);
      setToggleCompleteError(message);
    }
  }, [task]);

  return { task, loading, error, toggleCompleteError, handleToggleComplete };
}
