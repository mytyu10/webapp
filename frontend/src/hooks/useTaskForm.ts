import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  createTask,
  updateTask,
  fetchTask,
  getCurrentUsername,
  Priority,
} from '../api/taskApi';
import { fetchAllUsers, ChatContact } from '../api/chatApi';
import {
  validateTaskForm,
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
  /** 選択可能なユーザー一覧（自分自身を含む全ユーザー） */
  availableUsers: ChatContact[];
  /** ユーザー一覧取得中フラグ */
  usersLoading: boolean;
  setTitle: (v: string) => void;
  setDescription: (v: string) => void;
  setDueDate: (v: string) => void;
  setPriority: (v: Priority) => void;
  setCategory: (v: string) => void;
  /** 担当者を追加する */
  addAssignee: (username: string) => void;
  /** 指定インデックスの担当者を削除する */
  removeAssignee: (index: number) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
}

/**
 * タスクフォームカスタムフック
 * 作成・編集・子タスク作成モードを統一管理する
 * idが渡された場合は編集モード、parentIdが渡された場合は子タスク作成モードになる
 * 担当者はユーザー一覧から選択する形式で管理する
 */
export function useTaskForm({ id, parentId }: UseTaskFormOptions = {}): UseTaskFormReturn {
  const navigate = useNavigate();
  const isEditMode = id !== undefined;

  const [values, setValues] = useState<TaskFormValues>({
    title: '',
    description: '',
    due_date: '',
    assignees: [],
    priority: 'MEDIUM',
    category: '',
  });
  const [errors, setErrors] = useState<TaskFormErrors>({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<ChatContact[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  /**
   * 全ユーザー一覧を取得する（マウント時に1回のみ）
   * GET /chat/users は自分を除くため、ログインユーザーも先頭に追加する
   */
  useEffect(() => {
    async function loadUsers(): Promise<void> {
      setUsersLoading(true);
      try {
        logger.info(CONTEXT, 'ユーザー一覧取得');
        const users = await fetchAllUsers();
        const currentUsername = getCurrentUsername();
        if (currentUsername) {
          setAvailableUsers([{ username: currentUsername }, ...users]);
        } else {
          setAvailableUsers(users);
        }
        logger.info(CONTEXT, 'ユーザー一覧取得成功');
      } catch (err) {
        logger.warn(CONTEXT, `ユーザー一覧取得失敗: ${err instanceof Error ? err.message : '不明なエラー'}`);
      } finally {
        setUsersLoading(false);
      }
    }

    void loadUsers();
  }, []);

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
        /** due_dateをdatetime-local inputに合わせてYYYY-MM-DDThh:mm形式に変換（nullの場合は空文字） */
        let formattedDate = '';
        if (task.due_date) {
          const localDate = new Date(task.due_date);
          const pad = (n: number): string => String(n).padStart(2, '0');
          formattedDate = `${localDate.getFullYear()}-${pad(localDate.getMonth() + 1)}-${pad(localDate.getDate())}T${pad(localDate.getHours())}:${pad(localDate.getMinutes())}`;
        }

        setValues({
          title: task.title,
          description: task.description,
          due_date: formattedDate,
          assignees: task.assignees,
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
   * 担当者を追加する（重複は無視）
   */
  function addAssignee(username: string): void {
    if (!username) return;
    setValues((prev) => {
      if (prev.assignees.includes(username)) return prev;
      return { ...prev, assignees: [...prev.assignees, username] };
    });
  }

  /**
   * 指定インデックスの担当者を削除する
   */
  function removeAssignee(index: number): void {
    setValues((prev) => ({
      ...prev,
      assignees: prev.assignees.filter((_, i) => i !== index),
    }));
  }

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
          description: values.description || undefined,
          due_date: values.due_date ? new Date(values.due_date).toISOString() : undefined,
          assignees: values.assignees.length > 0 ? values.assignees : undefined,
          priority: values.priority,
          category: values.category || undefined,
        };
        logger.info(CONTEXT, `タスク更新送信: id=${id}`);
        await updateTask(id, input);
        logger.info(CONTEXT, `タスク更新成功: id=${id}`);
      } else {
        const input = {
          title: values.title,
          description: values.description || undefined,
          due_date: values.due_date ? new Date(values.due_date).toISOString() : undefined,
          assignees: values.assignees.length > 0 ? values.assignees : undefined,
          priority: values.priority,
          category: values.category || undefined,
          parent_id: parentId,
        };
        logger.info(CONTEXT, `タスク作成送信: ${input.title}`);
        await createTask(input);
        logger.info(CONTEXT, 'タスク作成成功');
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
    availableUsers,
    usersLoading,
    setTitle: (v) => setValues((prev) => ({ ...prev, title: v })),
    setDescription: (v) => setValues((prev) => ({ ...prev, description: v })),
    setDueDate: (v) => setValues((prev) => ({ ...prev, due_date: v })),
    setPriority: (v) => setValues((prev) => ({ ...prev, priority: v })),
    setCategory: (v) => setValues((prev) => ({ ...prev, category: v })),
    addAssignee,
    removeAssignee,
    handleSubmit,
  };
}
