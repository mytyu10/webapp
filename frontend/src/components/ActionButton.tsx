/**
 * ナビゲーション・アクション用の汎用ボタンコンポーネント
 * フォーム送信ではなくページ遷移や任意のアクションに使用する
 */

interface ActionButtonProps {
  /** ボタンに表示するラベル */
  label: string;
  /** クリック時に実行するコールバック */
  onClick: () => void;
}

/**
 * アクションボタン
 * スカイブルーの塗りつぶしスタイルのボタンを表示する
 */
function ActionButton({ label, onClick }: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-4 py-2 bg-sky-600 hover:bg-sky-500 active:bg-sky-400 text-white text-sm font-semibold rounded-md transition-colors"
    >
      {label}
    </button>
  );
}

export default ActionButton;
