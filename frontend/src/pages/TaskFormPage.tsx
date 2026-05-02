import { useParams, useNavigate } from 'react-router-dom';
import { useTaskForm } from '../hooks/useTaskForm';
import FormCard from '../components/FormCard';
import FormField from '../components/FormField';
import FormErrorBanner from '../components/FormErrorBanner';
import SubmitButton from '../components/SubmitButton';

/**
 * タスク作成・編集ページ
 * URLパラメータにidが存在する場合は編集モード、存在しない場合は作成モードで動作する
 */
function TaskFormPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const taskId = id !== undefined ? Number(id) : undefined;

  const {
    values,
    errors,
    apiError,
    loading,
    isEditMode,
    setTitle,
    setDescription,
    setDueDate,
    setAssigneesText,
    handleSubmit,
  } = useTaskForm(taskId);

  return (
    <div className="max-w-xl mx-auto">
      <FormCard
        title={isEditMode ? 'タスクを編集' : 'タスクを作成'}
        onSubmit={(e) => void handleSubmit(e)}
      >
        <FormErrorBanner message={apiError} />

        <FormField
          id="title"
          label="タイトル"
          value={values.title}
          onChange={setTitle}
          error={errors.title}
          disabled={loading}
          maxLength={200}
        />

        <div className="mb-5">
          <label htmlFor="description" className="block text-sm font-medium text-slate-300 mb-1.5">
            説明文
          </label>
          <textarea
            id="description"
            className={`w-full px-3 py-2.5 bg-slate-700 border rounded-md text-sm text-slate-100 outline-none transition-shadow placeholder-slate-500 resize-y
              ${errors.description
                ? 'border-red-500 focus:ring-2 focus:ring-red-500/30'
                : 'border-slate-600 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20'}
              disabled:opacity-50 disabled:cursor-not-allowed`}
            value={values.description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
            rows={4}
            disabled={loading}
          />
          {errors.description && (
            <p className="mt-1.5 text-xs text-red-400">{errors.description}</p>
          )}
        </div>

        <div className="mb-5">
          <label htmlFor="due_date" className="block text-sm font-medium text-slate-300 mb-1.5">
            期限
          </label>
          <input
            id="due_date"
            type="datetime-local"
            className={`w-full px-3 py-2.5 bg-slate-700 border rounded-md text-sm text-slate-100 outline-none transition-shadow
              ${errors.due_date
                ? 'border-red-500 focus:ring-2 focus:ring-red-500/30'
                : 'border-slate-600 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20'}
              disabled:opacity-50 disabled:cursor-not-allowed`}
            value={values.due_date}
            onChange={(e) => setDueDate(e.target.value)}
            disabled={loading}
          />
          {errors.due_date && (
            <p className="mt-1.5 text-xs text-red-400">{errors.due_date}</p>
          )}
        </div>

        <FormField
          id="assignees"
          label="担当者（カンマ区切りで複数入力）"
          value={values.assigneesText}
          onChange={setAssigneesText}
          error={errors.assignees}
          disabled={loading}
        />

        <div className="flex gap-3 mt-2">
          <button
            type="button"
            onClick={() => navigate('/tasks')}
            disabled={loading}
            className="flex-1 py-2.5 bg-slate-600 hover:bg-slate-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-md transition-colors"
          >
            キャンセル
          </button>
          <div className="flex-1">
            <SubmitButton
              label={isEditMode ? '更新する' : '作成する'}
              loadingLabel="処理中..."
              loading={loading}
            />
          </div>
        </div>
      </FormCard>
    </div>
  );
}

export default TaskFormPage;
