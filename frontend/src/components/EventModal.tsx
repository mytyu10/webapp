import { useState, useEffect } from 'react';
import {
  CalendarEvent,
  EventInput,
  MultipleEventInput,
  RepeatEventInput,
  fetchProxyGranters,
  ProxyGrantUser,
} from '../api/eventApi';
import { EventFormValues, MultipleEventFormValues, RepeatEventFormValues } from '../validation/eventValidation';
import { fetchAllUsers } from '../api/chatApi';
import { CreateEventOptions } from '../hooks/useCalendar';
import { EventPermissionInput } from '../api/eventApi';
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
  /** 代理登録・共有登録オプション付き保存コールバック */
  onSaveWithOptions?: (input: EventInput, updateScope: UpdateScope, options: CreateEventOptions) => Promise<void>;
  /** 代理登録・共有登録オプション付き複数保存コールバック */
  onSaveMultipleWithOptions?: (input: MultipleEventInput, options: CreateEventOptions) => Promise<void>;
  /** 代理登録・共有登録オプション付き繰り返し保存コールバック */
  onSaveRepeatWithOptions?: (input: RepeatEventInput, options: CreateEventOptions) => Promise<void>;
}

/** 権限種別ラベル */
const PERMISSION_LABELS: Record<string, string> = {
  READ: '閲覧のみ',
  WRITE: '編集可',
};

/**
 * 予定作成・編集モーダルコンポーネント。
 * 新規作成時は「通常」「複数日付」「繰り返し」の3モードを切り替えられる。
 * 編集時は通常フォームのみ表示する。
 * 繰り返しグループに属する予定の編集時は「この予定のみ変更」「繰り返し全て変更」を選択できる。
 * 新規作成時のみ「代理登録オプション」「共有登録オプション」を表示する。
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
  onSaveWithOptions,
  onSaveMultipleWithOptions,
  onSaveRepeatWithOptions,
}: EventModalProps) {
  const isEditMode = event !== null;
  const isOwner = isEditMode ? event.created_by === currentUsername : true;
  const isRepeatGroup = isEditMode && event.repeat_group_id !== null;

  const [createMode, setCreateMode] = useState<CreateMode>('single');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // 代理登録オプション
  const [proxyGranters, setProxyGranters] = useState<ProxyGrantUser[]>([]);
  const [selectedProxyUsername, setSelectedProxyUsername] = useState('');
  const [proxyGrantersLoading, setProxyGrantersLoading] = useState(false);

  // 共有登録オプション
  const [allUsers, setAllUsers] = useState<string[]>([]);
  const [sharePermissions, setSharePermissions] = useState<EventPermissionInput[]>([]);
  const [selectedShareUsername, setSelectedShareUsername] = useState('');
  const [selectedSharePermission, setSelectedSharePermission] = useState<'READ' | 'WRITE'>('READ');
  const [usersLoading, setUsersLoading] = useState(false);

  /** モーダルが開くたびにモード・削除確認状態・オプションをリセットする */
  useEffect(() => {
    if (!open) return;
    setCreateMode('single');
    setShowDeleteConfirm(false);
    setDeleteError('');
    setSelectedProxyUsername('');
    setSharePermissions([]);
    setSelectedShareUsername('');
    setSelectedSharePermission('READ');

    if (!isEditMode) {
      // 新規作成時のみ代理登録・共有登録ユーザー一覧を取得する
      void (async () => {
        setProxyGrantersLoading(true);
        setUsersLoading(true);
        try {
          const [granters, users] = await Promise.all([
            fetchProxyGranters(),
            fetchAllUsers(),
          ]);
          setProxyGranters(granters);
          setAllUsers(users.map((u) => u.username));
        } catch {
          // エラーは無視（オプション機能のため）
        } finally {
          setProxyGrantersLoading(false);
          setUsersLoading(false);
        }
      })();
    }
  }, [open, event, isEditMode]);

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

  /** 現在のオプション設定を CreateEventOptions に変換する */
  function buildOptions(): CreateEventOptions {
    return {
      proxyUsername: selectedProxyUsername || undefined,
      sharePermissions: sharePermissions.length > 0 ? sharePermissions : undefined,
    };
  }

  /** 通常フォームの保存後にモーダルを閉じるラッパー */
  async function handleSingleSubmit(input: EventInput, updateScope: UpdateScope): Promise<void> {
    if (!isEditMode && onSaveWithOptions) {
      await onSaveWithOptions(input, updateScope, buildOptions());
    } else {
      await onSave(input, updateScope);
    }
    onClose();
  }

  /** 複数日付フォームの保存後にモーダルを閉じるラッパー */
  async function handleMultipleSubmit(input: MultipleEventInput): Promise<void> {
    if (onSaveMultipleWithOptions) {
      await onSaveMultipleWithOptions(input, buildOptions());
    } else {
      await onSaveMultiple(input);
    }
    onClose();
  }

  /** 繰り返しフォームの保存後にモーダルを閉じるラッパー */
  async function handleRepeatSubmit(input: RepeatEventInput): Promise<void> {
    if (onSaveRepeatWithOptions) {
      await onSaveRepeatWithOptions(input, buildOptions());
    } else {
      await onSaveRepeat(input);
    }
    onClose();
  }

  /** 共有登録ユーザーを追加する */
  function handleAddSharePermission(): void {
    if (!selectedShareUsername) return;
    if (sharePermissions.some((p) => p.username === selectedShareUsername)) return;
    setSharePermissions((prev) => [
      ...prev,
      { username: selectedShareUsername, permission: selectedSharePermission },
    ]);
    setSelectedShareUsername('');
  }

  /** 共有登録ユーザーを削除する */
  function handleRemoveSharePermission(username: string): void {
    setSharePermissions((prev) => prev.filter((p) => p.username !== username));
  }

  /** 共有登録のユーザー候補（作成者本人・すでに追加済みのユーザーを除外） */
  const shareableUsers = allUsers.filter(
    (u) => u !== currentUsername && !sharePermissions.some((p) => p.username === u),
  );

  // 代理登録選択時のユーザー（共有登録の除外対象としても考慮する必要なし）
  const proxyUser = selectedProxyUsername || currentUsername;

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

          {/* 新規作成時のみ代理登録・共有登録オプションを表示する */}
          {!isEditMode && (
            <div className="mb-5 space-y-3">
              {/* 代理登録オプション */}
              {proxyGranters.length > 0 && (
                <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
                    代理登録（作成者を指定）
                  </p>
                  <select
                    value={selectedProxyUsername}
                    onChange={(e) => setSelectedProxyUsername(e.target.value)}
                    disabled={proxyGrantersLoading}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-500 rounded-md text-sm text-slate-100 outline-none focus:border-sky-500 disabled:opacity-50"
                  >
                    <option value="">自分の予定として登録</option>
                    {proxyGranters.map((g) => (
                      <option key={g.username} value={g.username}>
                        {g.username} の予定として登録
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">
                    作成者: {selectedProxyUsername || currentUsername || ''}
                  </p>
                </div>
              )}

              {/* 共有登録オプション */}
              <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
                  共有登録（他ユーザーとも共有）
                </p>

                {usersLoading ? (
                  <p className="text-xs text-slate-500">ユーザー一覧を読み込み中...</p>
                ) : shareableUsers.length > 0 || sharePermissions.length > 0 ? (
                  <>
                    <div className="flex gap-2 mb-2">
                      <select
                        value={selectedShareUsername}
                        onChange={(e) => setSelectedShareUsername(e.target.value)}
                        disabled={shareableUsers.length === 0}
                        className="flex-1 px-2 py-1.5 bg-slate-700 border border-slate-500 rounded-md text-sm text-slate-100 outline-none focus:border-sky-500 disabled:opacity-50"
                      >
                        <option value="">
                          {shareableUsers.length === 0 ? '追加できるユーザーがいません' : 'ユーザーを選択'}
                        </option>
                        {shareableUsers.map((u) => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                      <select
                        value={selectedSharePermission}
                        onChange={(e) => setSelectedSharePermission(e.target.value as 'READ' | 'WRITE')}
                        className="px-2 py-1.5 bg-slate-700 border border-slate-500 rounded-md text-sm text-slate-100 outline-none focus:border-sky-500"
                      >
                        <option value="READ">{PERMISSION_LABELS['READ']}</option>
                        <option value="WRITE">{PERMISSION_LABELS['WRITE']}</option>
                      </select>
                      <button
                        type="button"
                        onClick={handleAddSharePermission}
                        disabled={!selectedShareUsername}
                        className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-md transition-colors whitespace-nowrap"
                      >
                        追加
                      </button>
                    </div>

                    {sharePermissions.length > 0 && (
                      <div className="space-y-1">
                        {sharePermissions.map((perm) => (
                          <div
                            key={perm.username}
                            className="flex items-center justify-between px-2 py-1.5 bg-slate-700 border border-slate-600 rounded-md"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-slate-200">{perm.username}</span>
                              <span className={`px-1.5 py-0.5 text-xs font-medium rounded-full ${
                                perm.permission === 'WRITE'
                                  ? 'bg-sky-900 text-sky-300'
                                  : 'bg-slate-600 text-slate-300'
                              }`}>
                                {PERMISSION_LABELS[perm.permission]}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveSharePermission(perm.username)}
                              className="text-red-400 hover:text-red-300 text-xs font-medium transition-colors"
                            >
                              削除
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-slate-500">
                    共有できるユーザーがいません（自分以外のユーザーが必要です）
                  </p>
                )}
                {proxyUser && selectedProxyUsername && (
                  <p className="text-xs text-amber-400 mt-1">
                    ※ 共有は {selectedProxyUsername} の予定を作成した後に付与されます
                  </p>
                )}
              </div>
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
