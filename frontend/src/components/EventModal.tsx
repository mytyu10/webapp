import { useState, useEffect } from 'react';
import { CalendarEvent, EventInput, MultipleEventInput, RepeatEventInput } from '../api/eventApi';
import { EventFormValues, MultipleEventFormValues, RepeatEventFormValues } from '../validation/eventValidation';
import ConfirmModal from './ConfirmModal';
import SingleEventForm from './SingleEventForm';
import MultipleEventForm from './MultipleEventForm';
import RepeatEventForm from './RepeatEventForm';

// ColorPicker で定義した EVENT_COLORS を re-export して既存の import を壊さない
export { EVENT_COLORS } from './ColorPicker';

/** 作成モードの種別 */
type CreateMode = 'single' | 'multiple' | 'repeat';

/** 繰り返し予定編集時のスコープ選択 */
type UpdateScope = 'single' | 'all';

/** datetime-local入力値形式にISOStringを変換する */
function toDatetimeLocalValue(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** デフォルトの色識別子 */
const DEFAULT_COLOR = 'cyan';

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
  /** 通常作成・編集の保存ボタン押下時のコールバック。updateScopeは編集時のみ有効 */
  onSave: (input: EventInput, updateScope: UpdateScope) => Promise<void>;
  /** 複数日付一括作成のコールバック */
  onSaveMultiple: (input: MultipleEventInput) => Promise<void>;
  /** 繰り返し作成のコールバック */
  onSaveRepeat: (input: RepeatEventInput) => Promise<void>;
  /** 削除ボタン押下時のコールバック */
  onDelete: (id: number) => Promise<void>;
  /** モーダルを閉じるコールバック */
  onClose: () => void;
}

/**
 * 予定作成・編集モーダルコンポーネント。
 * 新規作成時は「通常」「複数日付」「繰り返し」の3モードを切り替えられる。
 * 編集時は通常フォームのみ表示する。
 * 繰り返しグループに属する予定の編集時は「この予定のみ変更」「繰り返し全て変更」を選択できる。
 * 各フォームの状態管理は SingleEventForm / MultipleEventForm / RepeatEventForm に委譲する
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
  const isRepeatGroup = isEditMode && event.repeat_group_id !== null;

  const [createMode, setCreateMode] = useState<CreateMode>('single');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  /** モーダルが開くたびにモード・削除確認状態をリセットする */
  useEffect(() => {
    if (!open) return;
    setCreateMode('single');
    setShowDeleteConfirm(false);
    setDeleteError('');
  }, [open, event]);

  if (!open) return null;

  /** 通常フォームの初期値を計算する */
  function buildSingleInitialValues(): EventFormValues {
    if (event) {
      return {
        title: event.title,
        description: event.description,
        start_at: toDatetimeLocalValue(event.start_at),
        end_at: toDatetimeLocalValue(event.end_at),
        color: event.color ?? DEFAULT_COLOR,
      };
    }
    const defaultStart = initialStart ? toDatetimeLocalValue(initialStart) : '';
    const defaultEnd = initialStart
      ? (() => {
          const d = new Date(initialStart);
          d.setHours(d.getHours() + 1);
          return toDatetimeLocalValue(d.toISOString());
        })()
      : '';
    return { title: '', description: '', start_at: defaultStart, end_at: defaultEnd, color: DEFAULT_COLOR };
  }

  /** 複数日付フォームの初期値を計算する */
  function buildMultipleInitialValues(): MultipleEventFormValues {
    const defaultStart = initialStart ? toDatetimeLocalValue(initialStart) : '';
    const defaultEnd = initialStart
      ? (() => {
          const d = new Date(initialStart);
          d.setHours(d.getHours() + 1);
          return toDatetimeLocalValue(d.toISOString());
        })()
      : '';
    return {
      title: '',
      description: '',
      start_times: [defaultStart],
      end_times: [defaultEnd],
      color: DEFAULT_COLOR,
    };
  }

  /** 繰り返しフォームの初期値を計算する */
  function buildRepeatInitialValues(): RepeatEventFormValues {
    const defaultStart = initialStart ? toDatetimeLocalValue(initialStart) : '';
    const defaultEnd = initialStart
      ? (() => {
          const d = new Date(initialStart);
          d.setHours(d.getHours() + 1);
          return toDatetimeLocalValue(d.toISOString());
        })()
      : '';
    return {
      title: '',
      description: '',
      start_at: defaultStart,
      end_at: defaultEnd,
      repeat_type: 'weekly',
      interval: '1',
      days_of_week: [],
      end_condition_type: 'count',
      end_date: '',
      count: '4',
      color: DEFAULT_COLOR,
    };
  }

  /**
   * 削除確認後の削除処理
   */
  async function handleConfirmDelete(): Promise<void> {
    if (!event) return;
    setDeleteError('');
    try {
      await onDelete(event.id);
      onClose();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : '削除に失敗しました。');
      setShowDeleteConfirm(false);
    }
  }

  /** 通常フォームの保存後にモーダルを閉じるラッパー */
  async function handleSingleSubmit(input: EventInput, updateScope: UpdateScope): Promise<void> {
    await onSave(input, updateScope);
    onClose();
  }

  /** 複数日付フォームの保存後にモーダルを閉じるラッパー */
  async function handleMultipleSubmit(input: MultipleEventInput): Promise<void> {
    await onSaveMultiple(input);
    onClose();
  }

  /** 繰り返しフォームの保存後にモーダルを閉じるラッパー */
  async function handleRepeatSubmit(input: RepeatEventInput): Promise<void> {
    await onSaveRepeat(input);
    onClose();
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

          {deleteError && (
            <div className="mb-4 px-3 py-2 bg-red-900/40 border border-red-700 rounded text-sm text-red-300">
              {deleteError}
            </div>
          )}

          {/* 通常モード / 編集モード */}
          {(createMode === 'single' || isEditMode) && (
            <SingleEventForm
              key={`single-${event?.id ?? 'new'}-${initialStart ?? ''}`}
              initialValues={buildSingleInitialValues()}
              isEditMode={isEditMode}
              isOwner={isOwner}
              isRepeatGroup={isRepeatGroup}
              onSubmit={handleSingleSubmit}
              onDeleteClick={() => setShowDeleteConfirm(true)}
              onClose={onClose}
            />
          )}

          {/* 複数日付モード */}
          {!isEditMode && createMode === 'multiple' && (
            <MultipleEventForm
              key={`multiple-${initialStart ?? ''}`}
              initialValues={buildMultipleInitialValues()}
              onSubmit={handleMultipleSubmit}
              onClose={onClose}
            />
          )}

          {/* 繰り返しモード */}
          {!isEditMode && createMode === 'repeat' && (
            <RepeatEventForm
              key={`repeat-${initialStart ?? ''}`}
              initialValues={buildRepeatInitialValues()}
              onSubmit={handleRepeatSubmit}
              onClose={onClose}
            />
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
