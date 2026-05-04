import { useState } from 'react';
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
 * 通知日時を複数追加できるUIを提供する
 */
function TaskFormPage() {
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const taskId = id !== undefined ? Number(id) : undefined;
  const parentIdParam = searchParams.get('parent_id');
  const parentId = parentIdParam !== null ? Number(parentIdParam) : undefined;

  /** 通知日時入力の一時値 */
  const [notificationInput, setNotificationInput] = useState('');

  const {
    values,
    errors,
    apiError,
    loading,
    isEditMode,
    notifications,
    setTitle,
    setDescription,
    setDueDate,
    setAssigneesText,
    setPriority,
    setCategory,
    addNotificationDatetime,
    removeNotificationDatetime,
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

  /** 通知日時を追加する */
  function handleAddNotification(): void {
    if (!notificationInput) return;
    addNotificationDatetime(notificationInput);
    setNotificationInput('');
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

        {/* 通知日時セクション */}
        <div>
          <p className="block text-sm font-medium text-slate-300 mb-1">通知日時（任意・複数設定可）</p>
          <div className="flex gap-2 mb-2">
            <DateTimeField
              id="notification_input"
              label=""
              value={notificationInput}
              onChange={setNotificationInput}
              disabled={loading}
            />
            <button
              type="button"
              onClick={handleAddNotification}
              disabled={loading || !notificationInput}
              className="shrink-0 px-3 py-2 bg-sky-700 hover:bg-sky-600 disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors self-end mb-0"
            >
              追加
            </button>
          </div>
          {notifications.length > 0 && (
            <ul className="space-y-1">
              {notifications.map((datetime, index) => (
                <li
                  key={index}
                  className="flex items-center justify-between px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-sm text-slate-200"
                >
                  <span>
                    {new Date(datetime).toLocaleString('ja-JP', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeNotificationDatetime(index)}
                    disabled={loading}
                    className="ml-3 text-red-400 hover:text-red-300 disabled:opacity-50 text-xs font-medium transition-colors"
                  >
                    削除
                  </button>
                </li>
              ))}
            </ul>
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
