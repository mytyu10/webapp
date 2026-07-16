import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  createTask,
  updateTask,
  fetchTask,
  addNotification,
  Priority,
} from '../api/taskApi';
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
  /** 追加済み通知日時リスト（ISO8601文字列） */
  notifications: string[];
  setTitle: (v: string) => void;
  setDescription: (v: string) => void;
  setDueDate: (v: string) => void;
  setAssigneesText: (v: string) => void;
  setPriority: (v: Priority) => void;
  setCategory: (v: string) => void;
  /** 通知日時を追加する（datetime-local形式の文字列） */
  addNotificationDatetime: (datetime: string) => void;
  /** 指定インデックスの通知を削除する */
  removeNotificationDatetime: (index: number) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
}

/**
 * タスクフォームカスタムフック
 * 作成・編集・子タスク作成モードを統一管理する
 * idが渡された場合は編集モード、parentIdが渡された場合は子タスク作成モードになる
 * 通知日時の追加・削除も管理し、タスク作成/更新後に通知APIへ送信する
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
  const [notifications, setNotifications] = useState<string[]>([]);

  /**
   * 子タスク作成モード時は親タスクのカテゴリを初期値として設定する
   */
  useEffect(() => {
    if (parentId === undefined) return;

    async function loadParentCategory(): Promise<void> {
      if (parentId === undefined) return;
      try {
        logger.info(CONTEXT, `親タスクのカテゴリ取得: parentId=${parentId}`);
        const parent = await fetchTask(parentId);
        if (parent.category) {
          setValues((prev) => ({ ...prev, category: parent.category as string }));
          logger.info(CONTEXT, `親タスクのカテゴリ設定完了: category=${parent.category}`);
        }
      } catch (err) {
        logger.warn(CONTEXT, `親タスクのカテゴリ取得失敗: parentId=${parentId} - ${err instanceof Error ? err.message : '不明なエラー'}`);
      }
    }

    void loadParentCategory();
  }, [parentId]);

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

        /** 既存の通知日時を datetime-local 形式で読み込む */
        if (task.notifications && task.notifications.length > 0) {
          const existingNotifications = task.notifications.map((n) => {
            const d = new Date(n.notify_at);
            const pad2 = (v: number): string => String(v).padStart(2, '0');
            return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
          });
          setNotifications(existingNotifications);
        }

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
   * 通知日時を追加する
   */
  function addNotificationDatetime(datetime: string): void {
    if (!datetime) return;
    setNotifications((prev) => [...prev, datetime]);
  }

  /**
   * 指定インデックスの通知日時を削除する
   */
  function removeNotificationDatetime(index: number): void {
    setNotifications((prev) => prev.filter((_, i) => i !== index));
  }

  /**
   * フォーム送信処理
   * バリデーション後、作成または更新APIを呼び出す
   * 完了後に通知日時をAPIへ送信する
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
      let savedTaskId: number;

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
        const updated = await updateTask(id, input);
        savedTaskId = updated.id;
        logger.info(CONTEXT, `タスク更新成功: id=${id}`);
      } else {
        const input = {
          title: values.title,
          description: values.description,
          due_date: new Date(values.due_date).toISOString(),
          assignees: parseAssignees(values.assigneesText),
          priority: values.priority,
          category: values.category || undefined,
          parent_id: parentId,
        };
        logger.info(CONTEXT, `タスク作成送信: ${input.title}`);
        const created = await createTask(input);
        savedTaskId = created.id;
        logger.info(CONTEXT, 'タスク作成成功');
      }

      /** 通知日時をAPIに順次送信する */
      for (const datetime of notifications) {
        try {
          const isoString = new Date(datetime).toISOString();
          await addNotification(savedTaskId, isoString);
          logger.info(CONTEXT, `通知追加成功: taskId=${savedTaskId}, notify_at=${isoString}`);
        } catch (notifErr) {
          logger.warn(CONTEXT, `通知追加失敗: ${notifErr instanceof Error ? notifErr.message : '不明なエラー'}`);
        }
      }

      navigate('/tasks');
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
    notifications,
    setTitle: (v) => setValues((prev) => ({ ...prev, title: v })),
    setDescription: (v) => setValues((prev) => ({ ...prev, description: v })),
    setDueDate: (v) => setValues((prev) => ({ ...prev, due_date: v })),
    setAssigneesText: (v) => setValues((prev) => ({ ...prev, assigneesText: v })),
    setPriority: (v) => setValues((prev) => ({ ...prev, priority: v })),
    setCategory: (v) => setValues((prev) => ({ ...prev, category: v })),
    addNotificationDatetime,
    removeNotificationDatetime,
    handleSubmit,
  };
}
