import { useState, useEffect } from 'react';
import { Task, TaskInput, Priority, PRIORITY_VALUES, PRIORITY_LABELS, getCurrentUsername } from '../api/taskApi';
import { fetchAllUsers, ChatContact } from '../api/chatApi';
import { validateTaskForm, TaskFormValues, TaskFormErrors } from '../validation/taskValidation';
import { logger } from '../logger';

const CONTEXT = 'TaskEditForm';

const INPUT_CLASS =
  'w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 disabled:opacity-50';
const LABEL_CLASS = 'block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1';
const ERROR_CLASS = 'mt-1 text-xs text-red-400';

/** ISO文字列をdatetime-local input用のローカル時刻文字列に変換する（nullの場合は空文字） */
function toDatetimeLocal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface TaskEditFormProps {
  /** 編集対象のタスク */
  task: Task;
  /** 保存コールバック（task.id と更新フィールドを受け取る） */
  onSave: (id: number, input: Partial<TaskInput>) => Promise<void>;
  /** キャンセルコールバック */
  onCancel: () => void;
}

/**
 * タスクインライン編集フォームコンポーネント。
 * TaskDetailPanel 内で使用し、タイトル・説明・期限・優先度・カテゴリ・担当者を編集する。
 * フォームの状態管理・バリデーション・保存ロジックを担う
 */
function TaskEditForm({ task, onSave, onCancel }: TaskEditFormProps) {
  const [editValues, setEditValues] = useState<TaskFormValues>({
    title: task.title,
    description: task.description,
    due_date: toDatetimeLocal(task.due_date),
    assignees: task.assignees,
    priority: task.priority,
    category: task.category ?? '',
  });
  const [editErrors, setEditErrors] = useState<TaskFormErrors>({});
  const [saveError, setSaveError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
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

  /** 担当者を追加する（重複は無視） */
  function handleAssigneeSelect(e: React.ChangeEvent<HTMLSelectElement>): void {
    const username = e.target.value;
    if (!username) return;
    setEditValues((prev) => {
      if (prev.assignees.includes(username)) return prev;
      return { ...prev, assignees: [...prev.assignees, username] };
    });
    e.target.value = '';
  }

  /** 指定インデックスの担当者を削除する */
  function removeAssignee(index: number): void {
    setEditValues((prev) => ({
      ...prev,
      assignees: prev.assignees.filter((_, i) => i !== index),
    }));
  }

  async function handleSave(): Promise<void> {
    const errors = validateTaskForm(editValues);
    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      return;
    }
    setEditErrors({});
    setSaveError('');
    setIsSaving(true);
    try {
      await onSave(task.id, {
        title: editValues.title,
        description: editValues.description || undefined,
        due_date: editValues.due_date ? new Date(editValues.due_date).toISOString() : undefined,
        assignees: editValues.assignees.length > 0 ? editValues.assignees : undefined,
        priority: editValues.priority,
        category: editValues.category || undefined,
      });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'タスクの更新に失敗しました。');
    } finally {
      setIsSaving(false);
    }
  }

  /** まだ選択されていないユーザーのみ選択肢に表示する */
  const selectableUsers = availableUsers.filter(
    (u) => !editValues.assignees.includes(u.username)
  );

  return (
    <div className="space-y-4">
      <div>
        <label className={LABEL_CLASS}>タイトル</label>
        <input
          type="text"
          value={editValues.title}
          onChange={(e) => setEditValues((prev) => ({ ...prev, title: e.target.value }))}
          disabled={isSaving}
          className={INPUT_CLASS}
        />
        {editErrors.title && <p className={ERROR_CLASS}>{editErrors.title}</p>}
      </div>

      <div>
        <label className={LABEL_CLASS}>説明文</label>
        <textarea
          value={editValues.description}
          onChange={(e) => setEditValues((prev) => ({ ...prev, description: e.target.value }))}
          disabled={isSaving}
          rows={4}
          className={`${INPUT_CLASS} resize-none`}
        />
        {editErrors.description && <p className={ERROR_CLASS}>{editErrors.description}</p>}
      </div>

      <div>
        <label className={LABEL_CLASS}>期限</label>
        <input
          type="datetime-local"
          value={editValues.due_date}
          onChange={(e) => setEditValues((prev) => ({ ...prev, due_date: e.target.value }))}
          disabled={isSaving}
          className={INPUT_CLASS}
        />
        {editErrors.due_date && <p className={ERROR_CLASS}>{editErrors.due_date}</p>}
      </div>

      <div>
        <label className={LABEL_CLASS}>優先度</label>
        <select
          value={editValues.priority}
          onChange={(e) => setEditValues((prev) => ({ ...prev, priority: e.target.value as Priority }))}
          disabled={isSaving}
          className={INPUT_CLASS}
        >
          {PRIORITY_VALUES.map((p) => (
            <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
          ))}
        </select>
        {editErrors.priority && <p className={ERROR_CLASS}>{editErrors.priority}</p>}
      </div>

      <div>
        <label className={LABEL_CLASS}>カテゴリ（任意）</label>
        <input
          type="text"
          value={editValues.category}
          onChange={(e) => setEditValues((prev) => ({ ...prev, category: e.target.value }))}
          disabled={isSaving}
          placeholder="例: 開発, 設計"
          className={INPUT_CLASS}
        />
        {editErrors.category && <p className={ERROR_CLASS}>{editErrors.category}</p>}
      </div>

      <div>
        <label className={LABEL_CLASS}>担当者</label>
        <select
          onChange={handleAssigneeSelect}
          disabled={isSaving || usersLoading}
          className={`${INPUT_CLASS} mb-2`}
          defaultValue=""
        >
          <option value="" disabled>
            {usersLoading ? '読み込み中...' : 'ユーザーを選択してください'}
          </option>
          {selectableUsers.map((u) => (
            <option key={u.username} value={u.username}>
              {u.username}
            </option>
          ))}
        </select>
        {editValues.assignees.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-1">
            {editValues.assignees.map((username, index) => (
              <span
                key={username}
                className="flex items-center gap-1 px-2 py-1 bg-sky-800 border border-sky-600 rounded-full text-xs text-sky-100"
              >
                {username}
                <button
                  type="button"
                  onClick={() => removeAssignee(index)}
                  disabled={isSaving}
                  className="ml-1 text-sky-300 hover:text-white disabled:opacity-50 leading-none"
                  aria-label={`${username}を担当者から削除`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        {editErrors.assignees && <p className={ERROR_CLASS}>{editErrors.assignees}</p>}
      </div>

      {saveError && <p className={ERROR_CLASS}>{saveError}</p>}

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={isSaving}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-sm font-semibold rounded-md transition-colors"
        >
          {isSaving ? '保存中...' : '保存する'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="px-4 py-2 bg-slate-600 hover:bg-slate-500 disabled:opacity-50 text-white text-sm font-semibold rounded-md transition-colors"
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}

export default TaskEditForm;
