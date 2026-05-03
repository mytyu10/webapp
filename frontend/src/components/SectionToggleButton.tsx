/**
 * セクション折りたたみボタンコンポーネント
 * セクション名・件数・展開状態を表示し、クリックで開閉を切り替える
 */

/** 展開中に表示するアイコン */
const ICON_OPEN = '▾';

/** 折りたたみ中に表示するアイコン */
const ICON_CLOSED = '▸';

interface SectionToggleButtonProps {
  /** セクション名（例: "完了済み"） */
  label: string;
  /** 表示する件数 */
  count: number;
  /** セクションが展開中かどうか */
  isOpen: boolean;
  /** クリック時に呼び出されるコールバック */
  onClick: () => void;
}

/**
 * セクション折りたたみボタン
 * 展開中は `▾`、折りたたみ中は `▸` を表示する
 * ラベルと件数を "ラベル (N件)" の形式で表示する
 */
function SectionToggleButton({ label, count, isOpen, onClick }: SectionToggleButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 text-xs font-medium text-slate-400 uppercase tracking-wide mb-3 hover:text-slate-200 transition-colors"
    >
      <span>{isOpen ? ICON_OPEN : ICON_CLOSED}</span>
      <span>{label} ({count}件)</span>
    </button>
  );
}

export default SectionToggleButton;
