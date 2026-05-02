interface FormFieldProps {
  id: string;
  label: string;
  type?: 'text' | 'password';
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  maxLength?: number;
  autoComplete?: string;
}

function FormField({ id, label, type = 'text', value, onChange, error, disabled, maxLength, autoComplete }: FormFieldProps) {
  return (
    <div className="mb-5">
      <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-1.5">
        {label}
      </label>
      <input
        id={id}
        type={type}
        className={`w-full px-3 py-2.5 bg-slate-700 border rounded-md text-sm text-slate-100 outline-none transition-shadow placeholder-slate-500
          ${error
            ? 'border-red-500 focus:ring-2 focus:ring-red-500/30'
            : 'border-slate-600 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20'}
          disabled:opacity-50 disabled:cursor-not-allowed`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        autoComplete={autoComplete}
        disabled={disabled}
      />
      {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
    </div>
  );
}

export default FormField;
