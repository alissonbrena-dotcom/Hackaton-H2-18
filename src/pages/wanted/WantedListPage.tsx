import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ApiError, apiFetch, isAbortError } from '../../api/client'
import type { Crew, FruitFilter, WantedPage, WantedSort, WantedStatus } from '../../api/types'
import { EmptyBox, ErrorBox, Spinner } from '../../components/StateViews'
import { useApiQuery } from '../../hooks/useApiQuery'
import { FRUIT_LABEL, formatBerries, SORT_LABEL, STATUS_LABEL } from '../../utils/format'
import { MAX_Q_LENGTH, parseFilters, toApiQuery, toSearchParams, type WantedFilters } from './wantedParams'

// Caché en memoria de páginas ya vistas (clave = query). Al volver del detalle
// el listado se pinta al instante y en la misma posición de scroll.
const pageCache = new Map<string, WantedPage>()
const scrollCache = new Map<string, number>()

const SEARCH_DEBOUNCE_MS = 400

export function WantedListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = parseFilters(searchParams)
  const apiQuery = toApiQuery(filters)

  // Actualiza la URL. Si cambia un filtro/orden/tamaño/búsqueda, vuelve a la página 0.
  const updateFilters = useCallback(
    (patch: Partial<WantedFilters>, options: { replace?: boolean } = {}) => {
      setSearchParams(
        (prev) => {
          const current = parseFilters(prev)
          const next = { ...current, ...patch }
          if (!('page' in patch)) next.page = 0
          return toSearchParams(next)
        },
        { replace: options.replace },
      )
    },
    [setSearchParams],
  )

  // 1) URL inválida -> la normalizamos (replace, sin ensuciar el historial).
  const canonical = toSearchParams(filters).toString()
  useEffect(() => {
    if (canonical !== searchParams.toString()) setSearchParams(new URLSearchParams(canonical), { replace: true })
  }, [canonical, searchParams, setSearchParams])

  // 2) Búsqueda con debounce: el input es estado local; la URL se actualiza 400 ms después de dejar de escribir.
  const [searchText, setSearchText] = useState(filters.q)
  useEffect(() => {
    setSearchText(filters.q) // si la URL cambia (atrás/adelante), el input se sincroniza
  }, [filters.q])
  useEffect(() => {
    if (searchText.trim() === filters.q) return
    const timer = setTimeout(() => updateFilters({ q: searchText.trim() }, { replace: true }), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer) // cada tecla cancela el timer anterior
  }, [searchText, filters.q, updateFilters])

  // 3) Datos del servidor, protegidos contra respuestas antiguas.
  const [data, setData] = useState<WantedPage | null>(() => pageCache.get(apiQuery) ?? null)
  const [dataKey, setDataKey] = useState(apiQuery) // a qué query pertenecen los datos en pantalla
  const [loading, setLoading] = useState(!pageCache.has(apiQuery))
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const cached = pageCache.get(apiQuery)
    if (cached && attempt === 0) {
      setData(cached)
      setDataKey(apiQuery)
      setLoading(false)
      setError(null)
      return
    }
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    apiFetch<WantedPage>(`/wanted?${apiQuery}`, { signal: controller.signal })
      .then((page) => {
        if (controller.signal.aborted) return // llegó tarde: ya pedimos otra cosa
        pageCache.set(apiQuery, page)
        setData(page)
        setDataKey(apiQuery)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted || isAbortError(err)) return
        setError(err instanceof ApiError ? err.message : 'Error inesperado.')
        setLoading(false)
      })
    // Al cambiar la query, React ejecuta este cleanup y cancela la request anterior.
    return () => controller.abort()
  }, [apiQuery, attempt])

  // 4) Página que ya no existe (p. ej. page=99) -> saltamos a la última válida.
  useEffect(() => {
    if (!data || loading || dataKey !== apiQuery) return
    const lastPage = Math.max(data.totalPages - 1, 0)
    if (filters.page > lastPage) updateFilters({ page: lastPage }, { replace: true })
  }, [data, dataKey, apiQuery, loading, filters.page, updateFilters])

  // 5) Restaurar el scroll al volver del detalle.
  const restoredRef = useRef(false)
  useLayoutEffect(() => {
    if (restoredRef.current || !data || loading) return
    restoredRef.current = true
    const y = scrollCache.get(apiQuery)
    if (y !== undefined) window.scrollTo(0, y)
  }, [data, loading, apiQuery])
  const rememberScroll = () => scrollCache.set(apiQuery, window.scrollY)

  const crews = useApiQuery('crews', (signal) => apiFetch<Crew[]>('/crews', { signal }))
  const crewOptions: [string, string][] = (crews.data ?? []).map((c) => [c.id, c.name])
  // Si la URL trae un crewId que aún no está en la lista (cargando, error o id inexistente),
  // lo mostramos igual: el select nunca debe decir "Todas" con un filtro activo.
  if (filters.crewId && !crewOptions.some(([id]) => id === filters.crewId)) {
    const label = crews.loading ? 'Cargando tripulaciones…' : crews.error ? 'Tripulación seleccionada' : 'Tripulación desconocida'
    crewOptions.unshift([filters.crewId, label])
  }

  // Regla del Log Pose: solo mostramos datos de la query actual. Mientras carga la nueva
  // no se ve nada de la anterior (ni cards ni totales de paginación).
  const current = dataKey === apiQuery ? data : (pageCache.get(apiQuery) ?? null)

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Carteles de “Se Busca”</h1>

      <div className="grid gap-3 rounded-lg border border-slate-800 bg-slate-900 p-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block sm:col-span-2 lg:col-span-3">
          <span className="text-xs uppercase text-slate-400">Buscar por nombre o epíteto</span>
          <input
            type="search"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            maxLength={MAX_Q_LENGTH}
            placeholder="Ej: Luffy, Pirate Hunter…"
            className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2"
          />
        </label>
        <Select
          label="Estado"
          value={filters.status ?? ''}
          onChange={(v) => updateFilters({ status: (v || null) as WantedStatus | null })}
          options={[['', 'Todos'], ...Object.entries(STATUS_LABEL)]}
        />
        <Select
          label="Tripulación"
          value={filters.crewId ?? ''}
          onChange={(v) => updateFilters({ crewId: v || null })}
          options={[['', 'Todas'], ...crewOptions]}
          hint={crews.error && (
            <span className="text-red-400">
              No se pudieron cargar las tripulaciones.{' '}
              <button type="button" onClick={crews.retry} className="underline">Reintentar</button>
            </span>
          )}
        />
        <Select
          label="Fruta del diablo"
          value={filters.fruit ?? ''}
          onChange={(v) => updateFilters({ fruit: (v || null) as FruitFilter | null })}
          options={[['', 'Todas'], ...Object.entries(FRUIT_LABEL)]}
        />
        <Select
          label="Ordenar por"
          value={filters.sort}
          onChange={(v) => updateFilters({ sort: v as WantedSort })}
          options={Object.entries(SORT_LABEL)}
        />
        <Select
          label="Por página"
          value={String(filters.size)}
          onChange={(v) => updateFilters({ size: Number(v) as WantedFilters['size'] })}
          options={[['10', '10'], ['20', '20'], ['50', '50']]}
        />
        <button
          type="button"
          onClick={() => {
            setSearchText('')
            setSearchParams(new URLSearchParams())
          }}
          disabled={canonical.length === 0}
          className="rounded border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-2 lg:col-span-3"
        >
          Limpiar filtros
        </button>
      </div>

      {/* Altura mínima fija + overlay de carga: el layout no "salta" mientras carga. */}
      <div className="relative min-h-[480px]">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-start justify-center bg-slate-950/60 pt-24" role="status">
            <span className="flex items-center gap-2 rounded bg-slate-900 px-4 py-2"><Spinner /> Cargando carteles…</span>
          </div>
        )}

        {error ? (
          <ErrorBox message={error} onRetry={() => setAttempt((a) => a + 1)} />
        ) : current && current.content.length === 0 ? (
          <EmptyBox>No hay carteles que coincidan con estos filtros.</EmptyBox>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {(current ? current.content : []).map((w) => (
              <li key={w.id}>
                <Link
                  to={`/wanted/${w.id}`}
                  state={{ fromList: true }}
                  onClick={rememberScroll}
                  className="block h-full rounded-lg border border-slate-800 bg-slate-900 p-4 hover:border-amber-500"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold">{w.name}</div>
                      <div className="text-sm text-slate-400">“{w.epithet}” · {w.crew.name}</div>
                    </div>
                    <span className="shrink-0 rounded bg-slate-800 px-2 py-0.5 text-xs">{STATUS_LABEL[w.status]}</span>
                  </div>
                  <div className="mt-2 flex justify-between text-sm">
                    <span className="text-amber-400">{formatBerries(w.bounty)}</span>
                    <span className="text-slate-400">{w.devilFruit ? `${w.devilFruit.name} (${FRUIT_LABEL[w.devilFruit.type]})` : 'Sin fruta'}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Altura reservada: la paginación aparece y desaparece sin mover el layout. */}
      <div className="min-h-9">
        {current && !error && (
          <Pagination
            page={filters.page}
            totalPages={current.totalPages}
            totalElements={current.totalElements}
            disabled={loading}
            onChange={(page) => updateFilters({ page })}
          />
        )}
      </div>
    </div>
  )
}

function Select({ label, value, onChange, options, hint }: {
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

function Pagination({ page, totalPages, totalElements, disabled, onChange }: {
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
