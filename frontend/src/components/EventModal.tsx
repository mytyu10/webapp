import { useState, useEffect } from 'react';
import { CalendarEvent, EventInput } from '../api/eventApi';
import {
  EventFormValues,
  EventValidationErrors,
  validateEventForm,
  isEventFormValid,
} from '../validation/eventValidation';
import DateTimeField from './DateTimeField';
import TextAreaField from './TextAreaField';
import FormField from './FormField';
import ConfirmModal from './ConfirmModal';
import CancelButton from './CancelButton';
import SubmitButton from './SubmitButton';
import DeleteButton from './DeleteButton';

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
  /** 保存ボタン押下時のコールバック */
  onSave: (input: EventInput) => Promise<void>;
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

/**
 * 予定作成・編集モーダルコンポーネント
 * event が null の場合は新規作成モード、指定されている場合は編集モード
 */
function EventModal({
  open,
  event,
  initialStart,
  currentUsername,
  onSave,
  onDelete,
  onClose,
}: EventModalProps) {
  const isEditMode = event !== null;
  const isOwner = isEditMode ? event.created_by === currentUsername : true;

  const [formValues, setFormValues] = useState<EventFormValues>({
    title: '',
    description: '',
    start_at: '',
    end_at: '',
  });
  const [errors, setErrors] = useState<EventValidationErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  /** モーダルが開くたびにフォームを初期化する */
  useEffect(() => {
    if (!open) return;
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
      setFormValues({
        title: '',
        description: '',
        start_at: initialStart ? toDatetimeLocalValue(initialStart) : '',
        end_at: defaultEnd,
      });
    }
    setErrors({});
    setApiError('');
    setShowDeleteConfirm(false);
  }, [open, event, initialStart]);

  if (!open) return null;

  /**
   * フォーム送信処理
   */
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

  return (
    <>
      <div
        className="fixed inset-0 z-40 flex items-center justify-center bg-black/60"
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-modal-title"
      >
        <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
          <h2
            id="event-modal-title"
            className="text-base font-semibold text-slate-100 mb-4"
          >
            {isEditMode ? '予定を編集' : '予定を作成'}
          </h2>

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
