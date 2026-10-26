interface FieldProps {
  label: string
  type: string
  value: string
  onChange: (value: string) => void
  error?: string
  autoComplete?: string
}

export function AuthField({ label, type, value, onChange, error, autoComplete }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-slate-300">{label}</span>
      <input
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        className={`w-full rounded border bg-slate-950 px-3 py-2 outline-none focus:border-amber-400 ${error ? 'border-red-500' : 'border-slate-700'}`}
      />
      {error && <span className="mt-1 block text-sm text-red-400">{error}</span>}
    </label>
  )
}
