interface DeleteButtonProps {
  label?: string;
  onClick: () => void;
  disabled?: boolean;
  /** スタイルを上書きする場合に指定する。省略時はデフォルトの削除ボタンスタイルを適用する */
  className?: string;
}

/**
 * 削除ボタンコンポーネント
 * 削除操作の確認トリガーに使用する
 */
function DeleteButton({ label = '削除', onClick, disabled, className }: DeleteButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        className ??
        'px-4 py-2 text-sm font-semibold text-white bg-red-700 hover:bg-red-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
      }
    >
      {label}
    </button>
  );
}

export default DeleteButton;
