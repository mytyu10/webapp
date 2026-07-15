import { useState } from 'react';
import { Task, TaskInput, Priority, PRIORITY_VALUES, PRIORITY_LABELS } from '../api/taskApi';
import { validateTaskForm, parseAssignees, TaskFormValues, TaskFormErrors } from '../validation/taskValidation';

const INPUT_CLASS =
  'w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 disabled:opacity-50';
const LABEL_CLASS = 'block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1';
const ERROR_CLASS = 'mt-1 text-xs text-red-400';

/** ISO文字列をdatetime-local input用のローカル時刻文字列に変換する */
function toDatetimeLocal(iso: string): string {
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
    assigneesText: task.assignees.join(', '),
    priority: task.priority,
    category: task.category ?? '',
  });
  const [editErrors, setEditErrors] = useState<TaskFormErrors>({});
  const [saveError, setSaveError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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
        description: editValues.description,
        due_date: new Date(editValues.due_date).toISOString(),
        assignees: parseAssignees(editValues.assigneesText),
        priority: editValues.priority,
        category: editValues.category || undefined,
      });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'タスクの更新に失敗しました。');
    } finally {
      setIsSaving(false);
    }
  }

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
        <label className={LABEL_CLASS}>担当者（カンマ区切り）</label>
        <input
          type="text"
          value={editValues.assigneesText}
          onChange={(e) => setEditValues((prev) => ({ ...prev, assigneesText: e.target.value }))}
          disabled={isSaving}
          placeholder="例: alice, bob"
          className={INPUT_CLASS}
        />
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
