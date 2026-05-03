import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createTask, updateTask, fetchTask, getCurrentUsername, Priority } from '../api/taskApi';
import {
  validateTaskForm,
  parseAssignees,
  TaskFormErrors,
  TaskFormValues,
} from '../validation/taskValidation';
import { logger } from '../logger';

const CONTEXT = 'useTaskForm';

/** useTaskFormフックのオプション */
interface UseTaskFormOptions {
  /** 編集対象のタスクID（省略時は作成モード） */
  id?: number;
  /** 子タスク作成時の親タスクID */
  parentId?: number;
}

/** useTaskFormフックの戻り値型 */
interface UseTaskFormReturn {
  values: TaskFormValues;
  errors: TaskFormErrors;
  apiError: string;
  loading: boolean;
  isEditMode: boolean;
  setTitle: (v: string) => void;
  setDescription: (v: string) => void;
  setDueDate: (v: string) => void;
  setAssigneesText: (v: string) => void;
  setPriority: (v: Priority) => void;
  setCategory: (v: string) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
}

/**
 * タスクフォームカスタムフック
 * 作成・編集・子タスク作成モードを統一管理する
 * idが渡された場合は編集モード、parentIdが渡された場合は子タスク作成モードになる
 */
export function useTaskForm({ id, parentId }: UseTaskFormOptions = {}): UseTaskFormReturn {
  const navigate = useNavigate();
  const isEditMode = id !== undefined;

  const [values, setValues] = useState<TaskFormValues>({
    title: '',
    description: '',
    due_date: '',
    assigneesText: '',
    priority: 'MEDIUM',
    category: '',
  });
  const [errors, setErrors] = useState<TaskFormErrors>({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  /**
   * 編集モード時は既存タスクデータを取得してフォームに反映する
   */
  useEffect(() => {
    if (!isEditMode) return;

    async function loadTask(): Promise<void> {
      if (id === undefined) return;
      setLoading(true);
      try {
        logger.info(CONTEXT, `既存タスク読み込み: id=${id}`);
        const task = await fetchTask(id);
        /** due_dateをdatetime-local inputに合わせてYYYY-MM-DDThh:mm形式に変換 */
        const localDate = new Date(task.due_date);
        const pad = (n: number): string => String(n).padStart(2, '0');
        const formattedDate = `${localDate.getFullYear()}-${pad(localDate.getMonth() + 1)}-${pad(localDate.getDate())}T${pad(localDate.getHours())}:${pad(localDate.getMinutes())}`;

        setValues({
          title: task.title,
          description: task.description,
          due_date: formattedDate,
          assigneesText: task.assignees.join(', '),
          priority: task.priority,
          category: task.category ?? '',
        });
        logger.info(CONTEXT, `既存タスク読み込み完了: id=${id}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'タスクの読み込みに失敗しました。';
        logger.warn(CONTEXT, `既存タスク読み込み失敗: id=${id} - ${message}`);
        setApiError(message);
      } finally {
        setLoading(false);
      }
    }

    void loadTask();
  }, [id, isEditMode]);

  /**
   * フォーム送信処理
   * バリデーション後、作成または更新APIを呼び出す
   */
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setApiError('');

    const validationErrors = validateTaskForm(values);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      if (isEditMode && id !== undefined) {
        const input = {
          title: values.title,
          description: values.description,
          due_date: new Date(values.due_date).toISOString(),
          assignees: parseAssignees(values.assigneesText),
          priority: values.priority,
          category: values.category || undefined,
        };
        logger.info(CONTEXT, `タスク更新送信: id=${id}`);
        await updateTask(id, input);
        logger.info(CONTEXT, `タスク更新成功: id=${id}`);
        navigate(`/tasks/${id}`);
      } else {
        const username = getCurrentUsername();
        if (!username) {
          setApiError('ログイン情報が取得できません。再度ログインしてください。');
          setLoading(false);
          return;
        }
        const input = {
          title: values.title,
          description: values.description,
          due_date: new Date(values.due_date).toISOString(),
          assignees: parseAssignees(values.assigneesText),
          priority: values.priority,
          category: values.category || undefined,
          parent_id: parentId,
          created_by: username,
        };
        logger.info(CONTEXT, `タスク作成送信: ${input.title}`);
        await createTask(input);
        logger.info(CONTEXT, 'タスク作成成功');
        if (parentId !== undefined) {
          navigate(`/tasks/${parentId}`);
        } else {
          navigate('/tasks');
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'サーバーへの接続に失敗しました。';
      logger.warn(CONTEXT, `タスクフォーム送信失敗: ${message}`);
      setApiError(message);
    } finally {
      setLoading(false);
    }
  }

  return {
    values,
    errors,
    apiError,
    loading,
    isEditMode,
    setTitle: (v) => setValues((prev) => ({ ...prev, title: v })),
    setDescription: (v) => setValues((prev) => ({ ...prev, description: v })),
    setDueDate: (v) => setValues((prev) => ({ ...prev, due_date: v })),
    setAssigneesText: (v) => setValues((prev) => ({ ...prev, assigneesText: v })),
    setPriority: (v) => setValues((prev) => ({ ...prev, priority: v })),
    setCategory: (v) => setValues((prev) => ({ ...prev, category: v })),
    handleSubmit,
  };
}
