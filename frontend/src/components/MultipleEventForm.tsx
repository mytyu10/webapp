import { useState } from 'react';
import { MultipleEventInput } from '../api/eventApi';
import {
  MultipleEventFormValues,
  MultipleEventValidationErrors,
  validateMultipleEventForm,
  isMultipleEventFormValid,
} from '../validation/eventValidation';
import DateTimeField from './DateTimeField';
import TextAreaField from './TextAreaField';
import FormField from './FormField';
import ColorPicker from './ColorPicker';
import CancelButton from './CancelButton';
import SubmitButton from './SubmitButton';

interface MultipleEventFormProps {
  /** フォームの初期値 */
  initialValues: MultipleEventFormValues;
  /** 送信・入力無効化フラグ */
  disabled?: boolean;
  /** 保存コールバック */
  onSubmit: (input: MultipleEventInput) => Promise<void>;
  /** キャンセルコールバック */
  onClose: () => void;
}

/**
 * 複数日付一括作成フォームコンポーネント。
 * 開始・終了日時のペアをリストで追加・削除でき、全ペアで一括作成する。
 * フォームの状態管理・バリデーション・送信ロジックを担う
 */
function MultipleEventForm({
  initialValues,
  disabled = false,
  onSubmit,
  onClose,
}: MultipleEventFormProps) {
  const [values, setValues] = useState<MultipleEventFormValues>(initialValues);
  const [errors, setErrors] = useState<MultipleEventValidationErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');

  const isInputDisabled = submitting || disabled;

  function addStartTime(): void {
    setValues((prev) => ({
      ...prev,
      start_times: [...prev.start_times, ''],
      end_times: [...prev.end_times, ''],
    }));
  }

  function removeStartTime(index: number): void {
    setValues((prev) => ({
      ...prev,
      start_times: prev.start_times.filter((_, i) => i !== index),
      end_times: prev.end_times.filter((_, i) => i !== index),
    }));
  }

  function updateStartTime(index: number, value: string): void {
    setValues((prev) => {
      const next = [...prev.start_times];
      next[index] = value;
      return { ...prev, start_times: next };
    });
  }

  function updateEndTime(index: number, value: string): void {
    setValues((prev) => {
      const next = [...prev.end_times];
      next[index] = value;
      return { ...prev, end_times: next };
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    const validationErrors = validateMultipleEventForm(values);
    setErrors(validationErrors);
    if (!isMultipleEventFormValid(validationErrors)) return;

    setSubmitting(true);
    setApiError('');
    try {
      const input: MultipleEventInput = {
        title: values.title,
        description: values.description,
        start_times: values.start_times.map((t) => new Date(t).toISOString()),
        end_times: values.end_times.map((t) => new Date(t).toISOString()),
        color: values.color,
      };
      await onSubmit(input);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : '保存に失敗しました。');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {apiError && (
        <div className="mb-4 px-3 py-2 bg-red-900/40 border border-red-700 rounded text-sm text-red-300">
          {apiError}
        </div>
      )}

      <form onSubmit={(e) => { void handleSubmit(e); }} noValidate>
        <FormField
          id="multiple-event-title"
          label="タイトル"
          value={values.title}
          onChange={(v) => setValues((prev) => ({ ...prev, title: v }))}
          error={errors.title}
          disabled={isInputDisabled}
          maxLength={200}
        />
        <TextAreaField
          id="multiple-event-description"
          label="説明"
          value={values.description}
          onChange={(v) => setValues((prev) => ({ ...prev, description: v }))}
          disabled={isInputDisabled}
          maxLength={1000}
          rows={3}
        />

        <div className="mb-5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="block text-sm font-medium text-slate-300">日時</span>
            <button
              type="button"
              onClick={addStartTime}
              disabled={isInputDisabled}
              className="text-xs text-sky-400 hover:text-sky-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              + 日時を追加
            </button>
          </div>
          {values.start_times.map((startTime, i) => (
            <div key={i} className="flex items-start gap-2 mb-3">
              <div className="flex-1 space-y-1">
                <DateTimeField
                  id={`multiple-start-time-${i}`}
                  label="開始"
                  value={startTime}
                  onChange={(v) => updateStartTime(i, v)}
                  disabled={isInputDisabled}
                />
                <DateTimeField
                  id={`multiple-end-time-${i}`}
                  label="終了"
                  value={values.end_times[i] ?? ''}
                  onChange={(v) => updateEndTime(i, v)}
                  disabled={isInputDisabled}
                />
              </div>
              {values.start_times.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeStartTime(i)}
                  disabled={isInputDisabled}
                  className="mt-6 text-slate-400 hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed text-lg leading-none"
                  aria-label="削除"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          {errors.start_times && (
            <p className="mt-1 text-xs text-red-400">{errors.start_times}</p>
          )}
          {errors.end_times && (
            <p className="mt-1 text-xs text-red-400">{errors.end_times}</p>
          )}
        </div>

        <ColorPicker
          value={values.color}
          onChange={(c) => setValues((prev) => ({ ...prev, color: c }))}
          disabled={isInputDisabled}
        />

        <div className="flex justify-end gap-2 mt-6">
          <CancelButton
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm font-semibold text-slate-300 bg-slate-600 hover:bg-slate-500 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <SubmitButton
            label={`${values.start_times.length}件作成`}
            loadingLabel="作成中..."
            loading={submitting}
            className="px-4 py-2 text-sm font-semibold text-white bg-sky-700 hover:bg-sky-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
      </form>
    </>
  );
}

export default MultipleEventForm;
