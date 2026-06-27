interface SubmitButtonProps {
  label: string;
  loadingLabel?: string;
  loading?: boolean;
  /** スタイルを上書きする場合に指定する。省略時はデフォルトのフォーム用スタイルを適用する */
  className?: string;
}

/**
 * フォーム送信ボタンコンポーネント
 * ローディング状態に応じてラベルを切り替える
 */
function SubmitButton({ label, loadingLabel = '処理中...', loading = false, className }: SubmitButtonProps) {
  return (
    <button
      type="submit"
      className={
        className ??
        'w-full py-2.5 bg-sky-600 hover:bg-sky-500 active:bg-sky-400 disabled:bg-slate-600 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-md transition-colors'
      }
      disabled={loading}
    >
      {loading ? loadingLabel : label}
    </button>
  );
}

export default SubmitButton;
