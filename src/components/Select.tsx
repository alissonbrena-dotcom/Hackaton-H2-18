import type { ReactNode } from 'react'

// Un <select> con su etiqueta. `options` es una lista de pares [valor, texto visible].
// `hint` es un mensaje opcional debajo (por ejemplo, un error con "Reintentar").
export function Select({ label, value, onChange, options, hint }: {
  label: string
  value: string
  onChange: (v: string) => void
  options: [string, string][]
  hint?: ReactNode
}) {
  return (
    <div>
      <label className="block">
        <span className="text-xs uppercase text-slate-400">{label}</span>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2"
        >
          {options.map(([v, text]) => <option key={v} value={v}>{text}</option>)}
        </select>
      </label>
      {hint && <p className="mt-1 text-xs">{hint}</p>}
    </div>
  )
}
