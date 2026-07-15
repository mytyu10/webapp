/**
 * 予定に選択できる色の定義。
 * アプリのダークテーマ（slate ベース）に合わせた6色
 */
export const EVENT_COLORS: Array<{
  /** 色識別子（APIへ送信する値） */
  id: string;
  /** 表示ラベル */
  label: string;
  /** カラーパレット上の背景色（Tailwind bg-* クラス） */
  bgClass: string;
  /** カラーパレット上の選択リング色（Tailwind ring-* クラス） */
  ringClass: string;
}> = [
  { id: 'cyan',    label: 'シアン',       bgClass: 'bg-cyan-700',    ringClass: 'ring-cyan-400' },
  { id: 'indigo',  label: 'インディゴ',   bgClass: 'bg-indigo-700',  ringClass: 'ring-indigo-400' },
  { id: 'emerald', label: 'エメラルド',   bgClass: 'bg-emerald-700', ringClass: 'ring-emerald-400' },
  { id: 'violet',  label: 'バイオレット', bgClass: 'bg-violet-700',  ringClass: 'ring-violet-400' },
  { id: 'rose',    label: 'ローズ',       bgClass: 'bg-rose-700',    ringClass: 'ring-rose-400' },
  { id: 'amber',   label: 'アンバー',     bgClass: 'bg-amber-700',   ringClass: 'ring-amber-400' },
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  disabled?: boolean;
}

/**
 * 色選択パレットコンポーネント。
 * 6色のボタンを横並びで表示し、選択中の色にリングを表示する
 */
function ColorPicker({ value, onChange, disabled }: ColorPickerProps) {
  return (
    <div className="mb-5">
      <span className="block text-sm font-medium text-slate-300 mb-1.5">色</span>
      <div className="flex gap-2 flex-wrap">
        {EVENT_COLORS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onChange(c.id)}
            disabled={disabled}
            title={c.label}
            aria-label={c.label}
            aria-pressed={value === c.id}
            className={`w-8 h-8 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed ${c.bgClass} ${
              value === c.id
                ? `ring-2 ring-offset-2 ring-offset-slate-800 ${c.ringClass} scale-110`
                : 'hover:scale-105'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export default ColorPicker;
