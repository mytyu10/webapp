interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  error?: string;
  disabled?: boolean;
}

/**
 * セレクトボックスフィールドコンポーネント
 * ラベル・セレクトボックス・エラー表示をセットで提供する
 */
function SelectField({ id, label, value, onChange, options, error, disabled }: SelectFieldProps) {
  return (
    <div className="mb-5">
      <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-1.5">
        {label}
      </label>
      <select
        id={id}
        className={`w-full px-3 py-2.5 bg-slate-700 border rounded-md text-sm text-slate-100 outline-none transition-shadow
          ${error
            ? 'border-red-500 focus:ring-2 focus:ring-red-500/30'
            : 'border-slate-600 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20'}
          disabled:opacity-50 disabled:cursor-not-allowed`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
    </div>
  );
}

export default SelectField;
