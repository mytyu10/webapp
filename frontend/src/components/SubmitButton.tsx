interface SubmitButtonProps {
  label: string;
  loadingLabel?: string;
  loading?: boolean;
}

function SubmitButton({ label, loadingLabel = '処理中...', loading = false }: SubmitButtonProps) {
  return (
    <button
      type="submit"
      className="w-full py-2.5 mt-2 bg-sky-600 hover:bg-sky-500 active:bg-sky-400
        disabled:bg-slate-600 disabled:cursor-not-allowed
        text-white text-sm font-semibold rounded-md transition-colors"
      disabled={loading}
    >
      {loading ? loadingLabel : label}
    </button>
  );
}

export default SubmitButton;
