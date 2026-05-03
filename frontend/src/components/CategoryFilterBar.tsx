/**
 * カテゴリフィルターバーコンポーネント
 * 「すべて」ボタンと各カテゴリのピルボタンを表示し、選択中のカテゴリを強調する
 */

/** 「すべて」を表す定数（空文字はカテゴリ未選択を意味する） */
const ALL_CATEGORY_VALUE = '';

/** 「すべて」ボタンのラベル */
const ALL_CATEGORY_LABEL = 'すべて';

interface CategoryFilterBarProps {
  /** カテゴリ名の一覧 */
  categories: string[];
  /** 現在選択中のカテゴリ（空文字は「すべて」） */
  selectedCategory: string;
  /** カテゴリ選択時に呼び出されるコールバック（空文字で「すべて」） */
  onSelect: (category: string) => void;
}

/**
 * カテゴリフィルターバー
 * 「すべて」ボタンと各カテゴリのピルボタンを横並びで表示する
 * 選択中のカテゴリは `bg-sky-600 text-white`、非選択は `bg-slate-600 text-slate-300 hover:bg-slate-500` で表示する
 */
function CategoryFilterBar({ categories, selectedCategory, onSelect }: CategoryFilterBarProps) {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <button
        type="button"
        onClick={() => onSelect(ALL_CATEGORY_VALUE)}
        className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
          selectedCategory === ALL_CATEGORY_VALUE
            ? 'bg-sky-600 text-white'
            : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
        }`}
      >
        {ALL_CATEGORY_LABEL}
      </button>
      {categories.map((cat) => (
        <button
          key={cat}
          type="button"
          onClick={() => onSelect(cat)}
          className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
            selectedCategory === cat
              ? 'bg-sky-600 text-white'
              : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}

export default CategoryFilterBar;
