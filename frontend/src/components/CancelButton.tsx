interface CancelButtonProps {
  label?: string;
  onClick: () => void;
  disabled?: boolean;
  /** スタイルを上書きする場合に指定する。省略時はデフォルトのフォーム用スタイルを適用する */
  className?: string;
}

/**
 * キャンセルボタンコンポーネント
 * フォームのキャンセル操作に使用する
 */
function CancelButton({ label = 'キャンセル', onClick, disabled, className }: CancelButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        className ??
        'flex-1 py-2.5 bg-slate-600 hover:bg-slate-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-md transition-colors'
      }
    >
      {label}
    </button>
  );
}

export default CancelButton;
