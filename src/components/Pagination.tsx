// Botones Anterior / Siguiente. `page` empieza en 0 (como en el backend),
// pero al usuario le mostramos "Página 1 de N".
export function Pagination({ page, totalPages, totalElements, disabled, onChange }: {
  page: number
  totalPages: number
  totalElements: number
  disabled: boolean
  onChange: (page: number) => void
}) {
  const btn = 'rounded border border-slate-700 px-3 py-1.5 disabled:opacity-40 hover:enabled:bg-slate-800'
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-400">{totalElements} carteles</span>
      <div className="flex items-center gap-2">
        <button className={btn} disabled={disabled || page <= 0} onClick={() => onChange(page - 1)}>← Anterior</button>
        <span>Página {totalPages === 0 ? 0 : page + 1} de {totalPages}</span>
        <button className={btn} disabled={disabled || page >= totalPages - 1} onClick={() => onChange(page + 1)}>Siguiente →</button>
      </div>
    </div>
  )
}
