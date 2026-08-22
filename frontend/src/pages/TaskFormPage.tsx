import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useTaskForm } from '../hooks/useTaskForm';
import { PRIORITY_VALUES, PRIORITY_LABELS } from '../api/taskApi';
import FormCard from '../components/FormCard';
import FormField from '../components/FormField';
import FormErrorBanner from '../components/FormErrorBanner';
import SubmitButton from '../components/SubmitButton';
import TextAreaField from '../components/TextAreaField';
import DateTimeField from '../components/DateTimeField';
import SelectField from '../components/SelectField';
import CancelButton from '../components/CancelButton';

/**
 * タスク作成・編集ページ
 * URLパラメータにidが存在する場合は編集モード、存在しない場合は作成モードで動作する
 * クエリパラメータ parent_id が存在する場合は子タスク作成モードになる
 */
function TaskFormPage() {
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const taskId = id !== undefined ? Number(id) : undefined;
  const parentIdParam = searchParams.get('parent_id');
  const parentId = parentIdParam !== null ? Number(parentIdParam) : undefined;

  const {
    values,
    errors,
    apiError,
    loading,
    isEditMode,
    availableUsers,
    usersLoading,
    setTitle,
    setDescription,
    setDueDate,
    setPriority,
    setCategory,
    addAssignee,
    removeAssignee,
    handleSubmit,
  } = useTaskForm({ id: taskId, parentId });

  /** フォームタイトルを決定する */
  function getFormTitle(): string {
    if (isEditMode) return 'タスクを編集';
    if (parentId !== undefined) return '子タスクを作成';
    return 'タスクを作成';
  }

  /** キャンセル時の遷移先を決定する */
  function handleCancel(): void {
    if (isEditMode && taskId !== undefined) {
      navigate('/tasks');
    } else if (parentId !== undefined) {
      navigate(`/tasks/${parentId}`);
    } else {
      navigate('/tasks');
    }
  }

  /** 担当者を選択して追加する */
  function handleAssigneeSelect(e: React.ChangeEvent<HTMLSelectElement>): void {
    const username = e.target.value;
    if (!username) return;
    addAssignee(username);
    e.target.value = '';
  }

  /** 優先度の選択肢を生成する */
  const priorityOptions = PRIORITY_VALUES.map((p) => ({
    value: p,
    label: PRIORITY_LABELS[p],
  }));

  /** まだ選択されていないユーザーのみ選択肢に表示する */
  const selectableUsers = availableUsers.filter(
    (u) => !values.assignees.includes(u.username)
  );

  return (
    <div className="max-w-xl mx-auto">
      <FormCard
        title={getFormTitle()}
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

        <TextAreaField
          id="description"
          label="説明文"
          value={values.description}
          onChange={setDescription}
          error={errors.description}
          disabled={loading}
          maxLength={1000}
          rows={4}
        />

        <DateTimeField
          id="due_date"
          label="期限"
          value={values.due_date}
          onChange={setDueDate}
          error={errors.due_date}
          disabled={loading}
        />

        <SelectField
          id="priority"
          label="優先度"
          value={values.priority}
          onChange={(v) => setPriority(v as typeof PRIORITY_VALUES[number])}
          options={priorityOptions}
          error={errors.priority}
          disabled={loading}
        />

        <FormField
          id="category"
          label="カテゴリ（任意）"
          value={values.category}
          onChange={setCategory}
          error={errors.category}
          disabled={loading}
          maxLength={100}
        />

        {/* 担当者セクション */}
        <div>
          <p className="block text-sm font-medium text-slate-300 mb-1">担当者</p>
          <select
            onChange={handleAssigneeSelect}
            disabled={loading || usersLoading}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-sm text-slate-200 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 disabled:opacity-50 mb-2"
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
          {values.assignees.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-1">
              {values.assignees.map((username, index) => (
                <span
                  key={username}
                  className="flex items-center gap-1 px-2 py-1 bg-sky-800 border border-sky-600 rounded-full text-xs text-sky-100"
                >
                  {username}
                  <button
                    type="button"
                    onClick={() => removeAssignee(index)}
                    disabled={loading}
                    className="ml-1 text-sky-300 hover:text-white disabled:opacity-50 leading-none"
                    aria-label={`${username}を担当者から削除`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          {errors.assignees && (
            <p className="mt-1 text-xs text-red-400">{errors.assignees}</p>
          )}
        </div>

        <div className="flex gap-3 mt-2">
          <CancelButton onClick={handleCancel} disabled={loading} />
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
