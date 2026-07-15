import { useState } from 'react';
import { RepeatEventInput } from '../api/eventApi';
import {
  RepeatEventFormValues,
  RepeatEventValidationErrors,
  validateRepeatEventForm,
  isRepeatEventFormValid,
} from '../validation/eventValidation';
import DateTimeField from './DateTimeField';
import TextAreaField from './TextAreaField';
import FormField from './FormField';
import SelectField from './SelectField';
import ColorPicker from './ColorPicker';
import CancelButton from './CancelButton';
import SubmitButton from './SubmitButton';

/** 繰り返しタイプの選択肢 */
const REPEAT_TYPE_OPTIONS = [
  { value: 'daily', label: '毎日' },
  { value: 'weekly', label: '毎週' },
  { value: 'monthly', label: '毎月' },
];

/** 終了条件の選択肢 */
const END_CONDITION_OPTIONS = [
  { value: 'end_date', label: '終了日を指定' },
  { value: 'count', label: '回数を指定' },
];

/** 曜日ラベル（0=日曜〜6=土曜） */
const DAY_OF_WEEK_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

interface RepeatEventFormProps {
  /** フォームの初期値 */
  initialValues: RepeatEventFormValues;
  /** 送信・入力無効化フラグ */
  disabled?: boolean;
  /** 保存コールバック */
  onSubmit: (input: RepeatEventInput) => Promise<void>;
  /** キャンセルコールバック */
  onClose: () => void;
}

/**
 * 繰り返し予定一括作成フォームコンポーネント。
 * 繰り返しタイプ（毎日/毎週/毎月）・間隔・曜日・終了条件を設定できる。
 * フォームの状態管理・バリデーション・送信ロジックを担う
 */
function RepeatEventForm({
  initialValues,
  disabled = false,
  onSubmit,
  onClose,
}: RepeatEventFormProps) {
  const [values, setValues] = useState<RepeatEventFormValues>(initialValues);
  const [errors, setErrors] = useState<RepeatEventValidationErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');

  const isInputDisabled = submitting || disabled;

  function toggleDayOfWeek(day: number): void {
    setValues((prev) => {
      const next = prev.days_of_week.includes(day)
        ? prev.days_of_week.filter((d) => d !== day)
        : [...prev.days_of_week, day];
      return { ...prev, days_of_week: next };
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    const validationErrors = validateRepeatEventForm(values);
    setErrors(validationErrors);
    if (!isRepeatEventFormValid(validationErrors)) return;

    setSubmitting(true);
    setApiError('');
    try {
      const input: RepeatEventInput = {
        title: values.title,
        description: values.description,
        start_at: new Date(values.start_at).toISOString(),
        end_at: new Date(values.end_at).toISOString(),
        repeat: {
          type: values.repeat_type,
          interval: Number(values.interval),
          ...(values.repeat_type === 'weekly' && values.days_of_week.length > 0
            ? { days_of_week: values.days_of_week }
            : {}),
          ...(values.end_condition_type === 'end_date'
            ? { end_date: new Date(values.end_date).toISOString() }
            : { count: Number(values.count) }),
        },
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
          id="repeat-event-title"
          label="タイトル"
          value={values.title}
          onChange={(v) => setValues((prev) => ({ ...prev, title: v }))}
          error={errors.title}
          disabled={isInputDisabled}
          maxLength={200}
        />
        <TextAreaField
          id="repeat-event-description"
          label="説明"
          value={values.description}
          onChange={(v) => setValues((prev) => ({ ...prev, description: v }))}
          disabled={isInputDisabled}
          maxLength={1000}
          rows={3}
        />
        <DateTimeField
          id="repeat-event-start-at"
          label="最初の開始日時"
          value={values.start_at}
          onChange={(v) => setValues((prev) => ({ ...prev, start_at: v }))}
          error={errors.start_at}
          disabled={isInputDisabled}
        />
        <DateTimeField
          id="repeat-event-end-at"
          label="最初の終了日時"
          value={values.end_at}
          onChange={(v) => setValues((prev) => ({ ...prev, end_at: v }))}
          error={errors.end_at}
          disabled={isInputDisabled}
        />

        <SelectField
          id="repeat-event-type"
          label="繰り返しタイプ"
          value={values.repeat_type}
          onChange={(v) =>
            setValues((prev) => ({
              ...prev,
              repeat_type: v as 'daily' | 'weekly' | 'monthly',
            }))
          }
          options={REPEAT_TYPE_OPTIONS}
          disabled={isInputDisabled}
        />

        <FormField
          id="repeat-event-interval"
          label={`繰り返し間隔（${{ daily: '日', weekly: '週', monthly: 'ヶ月' }[values.repeat_type]}ごと）`}
          value={values.interval}
          onChange={(v) => setValues((prev) => ({ ...prev, interval: v }))}
          disabled={isInputDisabled}
        />

        {/* 毎週の場合のみ曜日選択を表示する */}
        {values.repeat_type === 'weekly' && (
          <div className="mb-5">
            <span className="block text-sm font-medium text-slate-300 mb-1.5">
              対象曜日（未選択の場合は開始日時の曜日）
            </span>
            <div className="flex gap-2 flex-wrap">
              {DAY_OF_WEEK_LABELS.map((label, day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDayOfWeek(day)}
                  disabled={isInputDisabled}
                  className={`w-9 h-9 text-sm font-medium rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    values.days_of_week.includes(day)
                      ? 'bg-sky-700 text-white'
                      : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        <SelectField
          id="repeat-event-end-condition-type"
          label="終了条件"
          value={values.end_condition_type}
          onChange={(v) =>
            setValues((prev) => ({
              ...prev,
              end_condition_type: v as 'end_date' | 'count',
            }))
          }
          options={END_CONDITION_OPTIONS}
          disabled={isInputDisabled}
        />

        {values.end_condition_type === 'end_date' ? (
          <DateTimeField
            id="repeat-event-end-date"
            label="終了日"
            value={values.end_date}
            onChange={(v) => setValues((prev) => ({ ...prev, end_date: v }))}
            error={errors.end_condition}
            disabled={isInputDisabled}
          />
        ) : (
          <FormField
            id="repeat-event-count"
            label="繰り返し回数"
            value={values.count}
            onChange={(v) => setValues((prev) => ({ ...prev, count: v }))}
            error={errors.end_condition}
            disabled={isInputDisabled}
          />
        )}

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
            label="繰り返し作成"
            loadingLabel="作成中..."
            loading={submitting}
            className="px-4 py-2 text-sm font-semibold text-white bg-sky-700 hover:bg-sky-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
      </form>
    </>
  );
}

export default RepeatEventForm;
