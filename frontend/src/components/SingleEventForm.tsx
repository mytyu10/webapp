import { useState } from 'react';
import { EventInput } from '../api/eventApi';
import {
  EventFormValues,
  EventValidationErrors,
  validateEventForm,
  isEventFormValid,
} from '../validation/eventValidation';
import DateTimeField from './DateTimeField';
import TextAreaField from './TextAreaField';
import FormField from './FormField';
import ColorPicker from './ColorPicker';
import CancelButton from './CancelButton';
import SubmitButton from './SubmitButton';
import DeleteButton from './DeleteButton';

/** 繰り返し予定編集時のスコープ選択 */
type UpdateScope = 'single' | 'all';

interface SingleEventFormProps {
  /** フォームの初期値 */
  initialValues: EventFormValues;
  /** 送信・入力無効化フラグ */
  disabled?: boolean;
  /** 編集モードかどうか */
  isEditMode: boolean;
  /** 現在のユーザーが作成者かどうか */
  isOwner: boolean;
  /** 繰り返しグループに属する予定かどうか（スコープ選択を表示するか） */
  isRepeatGroup: boolean;
  /** 保存コールバック。updateScope は編集時のみ有効 */
  onSubmit: (input: EventInput, updateScope: UpdateScope) => Promise<void>;
  /** 削除ボタン押下コールバック */
  onDeleteClick: () => void;
  /** キャンセルコールバック */
  onClose: () => void;
}

/**
 * 通常予定作成・編集フォームコンポーネント。
 * フォームの状態管理・バリデーション・送信ロジックを担う。
 * 繰り返しグループ予定の編集時は変更スコープ選択ラジオボタンを表示する
 */
function SingleEventForm({
  initialValues,
  disabled = false,
  isEditMode,
  isOwner,
  isRepeatGroup,
  onSubmit,
  onDeleteClick,
  onClose,
}: SingleEventFormProps) {
  const [formValues, setFormValues] = useState<EventFormValues>(initialValues);
  const [errors, setErrors] = useState<EventValidationErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');
  const [updateScope, setUpdateScope] = useState<UpdateScope>('single');

  const isInputDisabled = submitting || disabled || (isEditMode && !isOwner);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
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
        color: formValues.color,
      };
      await onSubmit(input, updateScope);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : '保存に失敗しました。');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* 繰り返しグループ予定の編集時に変更スコープ選択を表示する */}
      {isEditMode && isOwner && isRepeatGroup && (
        <div className="mb-5 p-3 bg-slate-700/50 rounded-lg border border-slate-600">
          <p className="text-xs text-slate-400 mb-2">変更対象</p>
          <div className="flex gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="update-scope"
                value="single"
                checked={updateScope === 'single'}
                onChange={() => setUpdateScope('single')}
                className="accent-sky-500"
              />
              <span className="text-sm text-slate-200">この予定のみ変更</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="update-scope"
                value="all"
                checked={updateScope === 'all'}
                onChange={() => setUpdateScope('all')}
                className="accent-sky-500"
              />
              <span className="text-sm text-slate-200">繰り返し予定を全て変更</span>
            </label>
          </div>
        </div>
      )}

      {apiError && (
        <div className="mb-4 px-3 py-2 bg-red-900/40 border border-red-700 rounded text-sm text-red-300">
          {apiError}
        </div>
      )}

      <form onSubmit={(e) => { void handleSubmit(e); }} noValidate>
        <FormField
          id="event-title"
          label="タイトル"
          value={formValues.title}
          onChange={(v) => setFormValues((prev) => ({ ...prev, title: v }))}
          error={errors.title}
          disabled={isInputDisabled}
          maxLength={200}
        />
        <TextAreaField
          id="event-description"
          label="説明"
          value={formValues.description}
          onChange={(v) => setFormValues((prev) => ({ ...prev, description: v }))}
          disabled={isInputDisabled}
          maxLength={1000}
          rows={3}
        />
        <DateTimeField
          id="event-start-at"
          label="開始日時"
          value={formValues.start_at}
          onChange={(v) => setFormValues((prev) => ({ ...prev, start_at: v }))}
          error={errors.start_at}
          disabled={isInputDisabled}
        />
        <DateTimeField
          id="event-end-at"
          label="終了日時"
          value={formValues.end_at}
          onChange={(v) => setFormValues((prev) => ({ ...prev, end_at: v }))}
          error={errors.end_at}
          disabled={isInputDisabled}
        />
        <ColorPicker
          value={formValues.color}
          onChange={(c) => setFormValues((prev) => ({ ...prev, color: c }))}
          disabled={isInputDisabled}
        />

        <div className="flex justify-between items-center mt-6">
          <div className="flex gap-2">
            {isEditMode && isOwner && (
              <DeleteButton
                onClick={onDeleteClick}
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
    </>
  );
}

export default SingleEventForm;
