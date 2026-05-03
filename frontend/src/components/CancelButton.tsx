interface CancelButtonProps {
  label?: string;
  onClick: () => void;
  disabled?: boolean;
}

/**
 * キャンセルボタンコンポーネント
 * フォームのキャンセル操作に使用する
 */
function CancelButton({ label = 'キャンセル', onClick, disabled }: CancelButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex-1 py-2.5 bg-slate-600 hover:bg-slate-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-md transition-colors"
    >
      {label}
    </button>
  );
}

export default CancelButton;
