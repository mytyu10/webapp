interface ConfirmModalProps {
  /** モーダルの表示状態 */
  open: boolean;
  /** モーダルタイトル */
  title: string;
  /** 確認メッセージ本文 */
  message: string;
  /** 確認ボタンのラベル */
  confirmLabel?: string;
  /** キャンセルボタンのラベル */
  cancelLabel?: string;
  /** 確認ボタンが押された時のコールバック */
  onConfirm: () => void;
  /** キャンセルボタンが押された時のコールバック */
  onCancel: () => void;
}

/**
 * 確認ダイアログモーダルコンポーネント
 * 削除など破壊的操作の前にユーザーへ確認を求める際に使用する
 */
function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = '削除する',
  cancelLabel = 'キャンセル',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
        <h2
          id="confirm-modal-title"
          className="text-base font-semibold text-slate-100 mb-2"
        >
          {title}
        </h2>
        <p className="text-sm text-slate-300 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-semibold text-slate-300 bg-slate-600 hover:bg-slate-500 rounded-md transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-semibold text-white bg-red-700 hover:bg-red-600 rounded-md transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
