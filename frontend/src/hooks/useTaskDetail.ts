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
  isToggling: boolean;
  handleToggleComplete: () => Promise<void>;
}

/**
 * タスク詳細取得・完了状態トグルのカスタムフック
 * 指定IDのタスクを取得し、完了状態の切り替えを管理する
 */
export function useTaskDetail(id: string | undefined): UseTaskDetailReturn {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [toggleCompleteError, setToggleCompleteError] = useState<string>('');
  const [isToggling, setIsToggling] = useState<boolean>(false);

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
   * 楽観的更新: UI を即座に反映してから PATCH リクエストを送信する
   * API 失敗時は更新前の状態にロールバックする
   */
  const handleToggleComplete = useCallback(async (): Promise<void> => {
    if (!task || isToggling) return;

    // ロールバック用に更新前の task を退避
    const previousTask = task;
    const newCompleted = !task.is_completed;

    setIsToggling(true);

    // UI を即座に反映（楽観的更新）
    setTask({ ...task, is_completed: newCompleted });
    setToggleCompleteError('');

    try {
      logger.info(CONTEXT, `タスク完了状態切り替え: id=${task.id}, is_completed=${String(newCompleted)}`);
      // サーバーレスポンスで上書きして closed_by などの確定値を反映
      const updated = await toggleTaskCompletion(task.id, newCompleted);
      setTask(updated);
      logger.info(CONTEXT, `タスク完了状態切り替え完了: id=${task.id}`);
    } catch (err) {
      // API 失敗時は楽観的更新前の状態に戻す
      setTask(previousTask);
      const message = err instanceof Error ? err.message : 'タスクの更新に失敗しました。';
      logger.warn(CONTEXT, `タスク完了状態切り替え失敗: ${message}`);
      setToggleCompleteError(message);
    } finally {
      setIsToggling(false);
    }
  }, [task, isToggling]);

  return { task, loading, error, toggleCompleteError, isToggling, handleToggleComplete };
}
