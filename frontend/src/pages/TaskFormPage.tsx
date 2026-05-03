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
    setTitle,
    setDescription,
    setDueDate,
    setAssigneesText,
    setPriority,
    setCategory,
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
      navigate(`/tasks/${taskId}`);
    } else if (parentId !== undefined) {
      navigate(`/tasks/${parentId}`);
    } else {
      navigate('/tasks');
    }
  }

  /** 優先度の選択肢を生成する */
  const priorityOptions = PRIORITY_VALUES.map((p) => ({
    value: p,
    label: PRIORITY_LABELS[p],
  }));

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

        <FormField
          id="assignees"
          label="担当者（カンマ区切りで複数入力）"
          value={values.assigneesText}
          onChange={setAssigneesText}
          error={errors.assignees}
          disabled={loading}
        />

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
