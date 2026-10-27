import type { MouseEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { apiFetch } from '../../api/client'
import type { SagaSummary } from '../../api/types'
import { EmptyBox, ErrorBox, LoadingBox } from '../../components/StateViews'
import { useApiQuery } from '../../hooks/useApiQuery'
import { withViewTransition } from '../../utils/viewTransition'

export function SagasPage() {
  const navigate = useNavigate()
  const { data, error, loading, retry } = useApiQuery('sagas', (signal) => apiFetch<SagaSummary[]>('/sagas', { signal }))

  // Click normal -> navegación con View Transition (si hay soporte). Ctrl/Cmd+click sigue abriendo otra pestaña.
  function open(e: MouseEvent, saga: SagaSummary) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
    e.preventDefault()
    withViewTransition(() => navigate(`/sagas/${saga.id}`, { state: { summary: saga } }))
  }

  if (loading) return <LoadingBox label="Descifrando los Poneglyphs…" />
  if (error || !data) return <ErrorBox message={error ?? 'Sin datos.'} onRetry={retry} />

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Poneglyphs: las grandes sagas</h1>
      {data.length === 0 ? (
        <EmptyBox>Todavía no hay sagas para recorrer.</EmptyBox>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {data.map((saga) => (
            <li key={saga.id}>
              <Link
                to={`/sagas/${saga.id}`}
                onClick={(e) => open(e, saga)}
                className="block h-full rounded-xl border-2 p-5 transition-transform hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                style={{ backgroundColor: saga.palette.background, color: saga.palette.text, borderColor: saga.palette.primary }}
              >
                {/* Mismo view-transition-name que el encabezado de la historia: el navegador anima entre ambos. */}
                <div style={{ viewTransitionName: `saga-${saga.id}` }}>
                  <p className="text-xs uppercase tracking-widest" style={{ color: saga.palette.primary }}>Saga {saga.order}</p>
                  <h2 className="text-xl font-bold">{saga.title}</h2>
                  <p className="opacity-80">{saga.subtitle}</p>
                </div>
                <p className="mt-3 text-sm opacity-90">{saga.synopsis}</p>
                <p className="mt-3 text-xs opacity-75">
                  {saga.stageCount} etapas · {saga.totalDistanceNm.toLocaleString('es-PE')} mn · {saga.firstIsland} → {saga.lastIsland}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
