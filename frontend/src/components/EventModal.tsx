import { useState, useEffect } from 'react';
import { CalendarEvent, EventInput, MultipleEventInput, RepeatEventInput } from '../api/eventApi';
import {
  EventFormValues,
  EventValidationErrors,
  validateEventForm,
  isEventFormValid,
  MultipleEventFormValues,
  MultipleEventValidationErrors,
  validateMultipleEventForm,
  isMultipleEventFormValid,
  RepeatEventFormValues,
  RepeatEventValidationErrors,
  validateRepeatEventForm,
  isRepeatEventFormValid,
} from '../validation/eventValidation';
import DateTimeField from './DateTimeField';
import TextAreaField from './TextAreaField';
import FormField from './FormField';
import SelectField from './SelectField';
import ConfirmModal from './ConfirmModal';
import CancelButton from './CancelButton';
import SubmitButton from './SubmitButton';
import DeleteButton from './DeleteButton';

/** 作成モードの種別 */
type CreateMode = 'single' | 'multiple' | 'repeat';

/** EventModalのprops型 */
interface EventModalProps {
  /** モーダルの表示状態 */
  open: boolean;
  /** 編集時は既存予定、新規作成時はnull */
  event: CalendarEvent | null;
  /** 新規作成時の初期開始日時（datetime-local形式） */
  initialStart?: string;
  /** ログイン中ユーザー名 */
  currentUsername: string | null;
  /** 通常作成の保存ボタン押下時のコールバック */
  onSave: (input: EventInput) => Promise<void>;
  /** 複数日付一括作成のコールバック */
  onSaveMultiple: (input: MultipleEventInput) => Promise<void>;
  /** 繰り返し作成のコールバック */
  onSaveRepeat: (input: RepeatEventInput) => Promise<void>;
  /** 削除ボタン押下時のコールバック */
  onDelete: (id: number) => Promise<void>;
  /** モーダルを閉じるコールバック */
  onClose: () => void;
}

/** datetime-local入力値形式にISOStringを変換する */
function toDatetimeLocalValue(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

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

/**
 * 予定作成・編集モーダルコンポーネント。
 * 新規作成時は「通常」「複数日付」「繰り返し」の3モードを切り替えられる。
 * 編集時は通常フォームのみ表示する
 */
function EventModal({
  open,
  event,
  initialStart,
  currentUsername,
  onSave,
  onSaveMultiple,
  onSaveRepeat,
  onDelete,
  onClose,
}: EventModalProps) {
  const isEditMode = event !== null;
  const isOwner = isEditMode ? event.created_by === currentUsername : true;

  const [createMode, setCreateMode] = useState<CreateMode>('single');

  // 通常フォームの状態
  const [formValues, setFormValues] = useState<EventFormValues>({
    title: '',
    description: '',
    start_at: '',
    end_at: '',
  });
  const [errors, setErrors] = useState<EventValidationErrors>({});

  // 複数日付フォームの状態
  const [multipleValues, setMultipleValues] = useState<MultipleEventFormValues>({
    title: '',
    description: '',
    duration_minutes: '60',
    start_times: [''],
  });
  const [multipleErrors, setMultipleErrors] = useState<MultipleEventValidationErrors>({});

  // 繰り返しフォームの状態
  const [repeatValues, setRepeatValues] = useState<RepeatEventFormValues>({
    title: '',
    description: '',
    duration_minutes: '60',
    start_at: '',
    repeat_type: 'weekly',
    interval: '1',
    days_of_week: [],
    end_condition_type: 'count',
    end_date: '',
    count: '4',
  });
  const [repeatErrors, setRepeatErrors] = useState<RepeatEventValidationErrors>({});

  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  /** モーダルが開くたびにフォームを初期化する */
  useEffect(() => {
    if (!open) return;
    setCreateMode('single');
    setErrors({});
    setMultipleErrors({});
    setRepeatErrors({});
    setApiError('');
    setShowDeleteConfirm(false);

    if (event) {
      setFormValues({
        title: event.title,
        description: event.description,
        start_at: toDatetimeLocalValue(event.start_at),
        end_at: toDatetimeLocalValue(event.end_at),
      });
    } else {
      const defaultEnd = initialStart
        ? (() => {
            const d = new Date(initialStart);
            d.setHours(d.getHours() + 1);
            return toDatetimeLocalValue(d.toISOString());
          })()
        : '';
      const defaultStart = initialStart ? toDatetimeLocalValue(initialStart) : '';
      setFormValues({
        title: '',
        description: '',
        start_at: defaultStart,
        end_at: defaultEnd,
      });
      setMultipleValues({
        title: '',
        description: '',
        duration_minutes: '60',
        start_times: [defaultStart],
      });
      setRepeatValues({
        title: '',
        description: '',
        duration_minutes: '60',
        start_at: defaultStart,
        repeat_type: 'weekly',
        interval: '1',
        days_of_week: [],
        end_condition_type: 'count',
        end_date: '',
        count: '4',
      });
    }
  }, [open, event, initialStart]);

  if (!open) return null;

  /**
   * 通常フォームの送信処理
   */
  async function handleSingleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    const validationErrors = validateEventForm(formValues);
    setErrors(validationErrors);
    if (!isEventFormValid(validationErrors)) return;

    setSubmitting(true);
    setApiError('');
    try {
      const input: EventInput = {
        title: formValues.title,
        description: formValues.description,
        start_at: new Date(formValues.start_at).toISOString(),
        end_at: new Date(formValues.end_at).toISOString(),
      };
      await onSave(input);
      onClose();
    } catch (err) {
      setApiError(err instanceof Error ? err.message : '保存に失敗しました。');
    } finally {
      setSubmitting(false);
    }
  }

  /**
   * 複数日付フォームの送信処理
   */
  async function handleMultipleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    const validationErrors = validateMultipleEventForm(multipleValues);
    setMultipleErrors(validationErrors);
    if (!isMultipleEventFormValid(validationErrors)) return;

    setSubmitting(true);
    setApiError('');
    try {
      const input: MultipleEventInput = {
        title: multipleValues.title,
        description: multipleValues.description,
        duration_minutes: Number(multipleValues.duration_minutes),
        start_times: multipleValues.start_times.map((t) => new Date(t).toISOString()),
      };
      await onSaveMultiple(input);
      onClose();
    } catch (err) {
      setApiError(err instanceof Error ? err.message : '保存に失敗しました。');
    } finally {
      setSubmitting(false);
    }
  }

  /**
   * 繰り返しフォームの送信処理
   */
  async function handleRepeatSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    const validationErrors = validateRepeatEventForm(repeatValues);
    setRepeatErrors(validationErrors);
    if (!isRepeatEventFormValid(validationErrors)) return;

    setSubmitting(true);
    setApiError('');
    try {
      const input: RepeatEventInput = {
        title: repeatValues.title,
        description: repeatValues.description,
        duration_minutes: Number(repeatValues.duration_minutes),
        start_at: new Date(repeatValues.start_at).toISOString(),
        repeat: {
          type: repeatValues.repeat_type,
          interval: Number(repeatValues.interval),
          ...(repeatValues.repeat_type === 'weekly' && repeatValues.days_of_week.length > 0
            ? { days_of_week: repeatValues.days_of_week }
            : {}),
          ...(repeatValues.end_condition_type === 'end_date'
            ? { end_date: new Date(repeatValues.end_date).toISOString() }
            : { count: Number(repeatValues.count) }),
        },
      };
      await onSaveRepeat(input);
      onClose();
    } catch (err) {
      setApiError(err instanceof Error ? err.message : '保存に失敗しました。');
    } finally {
      setSubmitting(false);
    }
  }

  /**
   * 削除確認後の削除処理
   */
  async function handleConfirmDelete(): Promise<void> {
    if (!event) return;
    setSubmitting(true);
    setApiError('');
    try {
      await onDelete(event.id);
      onClose();
    } catch (err) {
      setApiError(err instanceof Error ? err.message : '削除に失敗しました。');
    } finally {
      setSubmitting(false);
      setShowDeleteConfirm(false);
    }
  }

  /**
   * 複数日付フォームに日時入力欄を追加する
   */
  function addStartTime(): void {
    setMultipleValues((prev) => ({ ...prev, start_times: [...prev.start_times, ''] }));
  }

  /**
   * 複数日付フォームから指定インデックスの日時入力欄を削除する
   */
  function removeStartTime(index: number): void {
    setMultipleValues((prev) => ({
      ...prev,
      start_times: prev.start_times.filter((_, i) => i !== index),
    }));
  }

  /**
   * 複数日付フォームの指定インデックスの日時値を更新する
   */
  function updateStartTime(index: number, value: string): void {
    setMultipleValues((prev) => {
      const next = [...prev.start_times];
      next[index] = value;
      return { ...prev, start_times: next };
    });
  }

  /**
   * 繰り返しフォームの曜日チェックボックスの選択状態を切り替える
   */
  function toggleDayOfWeek(day: number): void {
    setRepeatValues((prev) => {
      const next = prev.days_of_week.includes(day)
        ? prev.days_of_week.filter((d) => d !== day)
        : [...prev.days_of_week, day];
      return { ...prev, days_of_week: next };
    });
  }

  const modalTitle = isEditMode ? '予定を編集' : '予定を作成';

  return (
    <>
      <div
        className="fixed inset-0 z-40 flex items-center justify-center bg-black/60"
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-modal-title"
      >
        <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
          <h2
            id="event-modal-title"
            className="text-base font-semibold text-slate-100 mb-4"
          >
            {modalTitle}
          </h2>

          {/* 新規作成時のみモード切り替えタブを表示する */}
          {!isEditMode && (
            <div className="flex gap-1 mb-5 bg-slate-700 rounded-lg p-1">
              {([['single', '通常'], ['multiple', '複数日付'], ['repeat', '繰り返し']] as [CreateMode, string][]).map(
                ([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setCreateMode(mode)}
                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      createMode === mode
                        ? 'bg-sky-700 text-white'
                        : 'text-slate-300 hover:text-slate-100'
                    }`}
                  >
                    {label}
                  </button>
                ),
              )}
            </div>
          )}

          {apiError && (
            <div className="mb-4 px-3 py-2 bg-red-900/40 border border-red-700 rounded text-sm text-red-300">
              {apiError}
            </div>
          )}

          {/* 通常モード / 編集モード */}
          {(createMode === 'single' || isEditMode) && (
            <form onSubmit={(e) => { void handleSingleSubmit(e); }} noValidate>
              <FormField
                id="event-title"
                label="タイトル"
                value={formValues.title}
                onChange={(v) => setFormValues((prev) => ({ ...prev, title: v }))}
                error={errors.title}
                disabled={submitting || (isEditMode && !isOwner)}
                maxLength={200}
              />
              <TextAreaField
                id="event-description"
                label="説明"
                value={formValues.description}
                onChange={(v) => setFormValues((prev) => ({ ...prev, description: v }))}
                disabled={submitting || (isEditMode && !isOwner)}
                maxLength={1000}
                rows={3}
              />
              <DateTimeField
                id="event-start-at"
                label="開始日時"
                value={formValues.start_at}
                onChange={(v) => setFormValues((prev) => ({ ...prev, start_at: v }))}
                error={errors.start_at}
                disabled={submitting || (isEditMode && !isOwner)}
              />
              <DateTimeField
                id="event-end-at"
                label="終了日時"
                value={formValues.end_at}
                onChange={(v) => setFormValues((prev) => ({ ...prev, end_at: v }))}
                error={errors.end_at}
                disabled={submitting || (isEditMode && !isOwner)}
              />

              <div className="flex justify-between items-center mt-6">
                <div className="flex gap-2">
                  {isEditMode && isOwner && (
                    <DeleteButton
                      onClick={() => setShowDeleteConfirm(true)}
                      disabled={submitting}
                    />
                  )}
                </div>
                <div className="flex gap-2">
                  <CancelButton
                    onClick={onClose}
                    disabled={submitting}
                    className="px-4 py-2 text-sm font-semibold text-slate-300 bg-slate-600 hover:bg-slate-500 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  {(!isEditMode || isOwner) && (
                    <SubmitButton
                      label="保存"
                      loadingLabel="保存中..."
                      loading={submitting}
                      className="px-4 py-2 text-sm font-semibold text-white bg-sky-700 hover:bg-sky-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  )}
                </div>
              </div>
            </form>
          )}

          {/* 複数日付モード */}
          {!isEditMode && createMode === 'multiple' && (
            <form onSubmit={(e) => { void handleMultipleSubmit(e); }} noValidate>
              <FormField
                id="multiple-event-title"
                label="タイトル"
                value={multipleValues.title}
                onChange={(v) => setMultipleValues((prev) => ({ ...prev, title: v }))}
                error={multipleErrors.title}
                disabled={submitting}
                maxLength={200}
              />
              <TextAreaField
                id="multiple-event-description"
                label="説明"
                value={multipleValues.description}
                onChange={(v) => setMultipleValues((prev) => ({ ...prev, description: v }))}
                disabled={submitting}
                maxLength={1000}
                rows={3}
              />
              <FormField
                id="multiple-event-duration"
                label="予定の長さ（分）"
                value={multipleValues.duration_minutes}
                onChange={(v) => setMultipleValues((prev) => ({ ...prev, duration_minutes: v }))}
                error={multipleErrors.duration_minutes}
                disabled={submitting}
              />

              <div className="mb-5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="block text-sm font-medium text-slate-300">開始日時</span>
                  <button
                    type="button"
                    onClick={addStartTime}
                    disabled={submitting}
                    className="text-xs text-sky-400 hover:text-sky-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    + 日時を追加
                  </button>
                </div>
                {multipleValues.start_times.map((t, i) => (
                  <div key={i} className="flex items-center gap-2 mb-2">
                    <div className="flex-1">
                      <DateTimeField
                        id={`multiple-start-time-${i}`}
                        label=""
                        value={t}
                        onChange={(v) => updateStartTime(i, v)}
                        disabled={submitting}
                      />
                    </div>
                    {multipleValues.start_times.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeStartTime(i)}
                        disabled={submitting}
                        className="mb-5 text-slate-400 hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed text-lg leading-none"
                        aria-label="削除"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                {multipleErrors.start_times && (
                  <p className="mt-1 text-xs text-red-400">{multipleErrors.start_times}</p>
                )}
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <CancelButton
                  onClick={onClose}
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-semibold text-slate-300 bg-slate-600 hover:bg-slate-500 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <SubmitButton
                  label={`${multipleValues.start_times.length}件作成`}
                  loadingLabel="作成中..."
                  loading={submitting}
                  className="px-4 py-2 text-sm font-semibold text-white bg-sky-700 hover:bg-sky-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </form>
          )}

          {/* 繰り返しモード */}
          {!isEditMode && createMode === 'repeat' && (
            <form onSubmit={(e) => { void handleRepeatSubmit(e); }} noValidate>
              <FormField
                id="repeat-event-title"
                label="タイトル"
                value={repeatValues.title}
                onChange={(v) => setRepeatValues((prev) => ({ ...prev, title: v }))}
                error={repeatErrors.title}
                disabled={submitting}
                maxLength={200}
              />
              <TextAreaField
                id="repeat-event-description"
                label="説明"
                value={repeatValues.description}
                onChange={(v) => setRepeatValues((prev) => ({ ...prev, description: v }))}
                disabled={submitting}
                maxLength={1000}
                rows={3}
              />
              <FormField
                id="repeat-event-duration"
                label="予定の長さ（分）"
                value={repeatValues.duration_minutes}
                onChange={(v) => setRepeatValues((prev) => ({ ...prev, duration_minutes: v }))}
                error={repeatErrors.duration_minutes}
                disabled={submitting}
              />
              <DateTimeField
                id="repeat-event-start-at"
                label="最初の開始日時"
                value={repeatValues.start_at}
                onChange={(v) => setRepeatValues((prev) => ({ ...prev, start_at: v }))}
                error={repeatErrors.start_at}
                disabled={submitting}
              />

              <SelectField
                id="repeat-event-type"
                label="繰り返しタイプ"
                value={repeatValues.repeat_type}
                onChange={(v) =>
                  setRepeatValues((prev) => ({
                    ...prev,
                    repeat_type: v as 'daily' | 'weekly' | 'monthly',
                  }))
                }
                options={REPEAT_TYPE_OPTIONS}
                disabled={submitting}
              />

              <FormField
                id="repeat-event-interval"
                label={`繰り返し間隔（${{ daily: '日', weekly: '週', monthly: 'ヶ月' }[repeatValues.repeat_type]}ごと）`}
                value={repeatValues.interval}
                onChange={(v) => setRepeatValues((prev) => ({ ...prev, interval: v }))}
                disabled={submitting}
              />

              {/* 毎週の場合のみ曜日選択を表示する */}
              {repeatValues.repeat_type === 'weekly' && (
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
                        disabled={submitting}
                        className={`w-9 h-9 text-sm font-medium rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                          repeatValues.days_of_week.includes(day)
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
                value={repeatValues.end_condition_type}
                onChange={(v) =>
                  setRepeatValues((prev) => ({
                    ...prev,
                    end_condition_type: v as 'end_date' | 'count',
                  }))
                }
                options={END_CONDITION_OPTIONS}
                disabled={submitting}
              />

              {repeatValues.end_condition_type === 'end_date' ? (
                <DateTimeField
                  id="repeat-event-end-date"
                  label="終了日"
                  value={repeatValues.end_date}
                  onChange={(v) => setRepeatValues((prev) => ({ ...prev, end_date: v }))}
                  error={repeatErrors.end_condition}
                  disabled={submitting}
                />
              ) : (
                <FormField
                  id="repeat-event-count"
                  label="繰り返し回数"
                  value={repeatValues.count}
                  onChange={(v) => setRepeatValues((prev) => ({ ...prev, count: v }))}
                  error={repeatErrors.end_condition}
                  disabled={submitting}
                />
              )}

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
          )}
        </div>
      </div>

      <ConfirmModal
        open={showDeleteConfirm}
        title="予定を削除"
        message="この予定を削除しますか？この操作は取り消せません。"
        confirmLabel="削除する"
        cancelLabel="キャンセル"
        onConfirm={() => { void handleConfirmDelete(); }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
}

export default EventModal;
