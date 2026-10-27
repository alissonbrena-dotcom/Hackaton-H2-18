import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ApiError, apiFetch, isAbortError } from '../../api/client'
import type { NewsFeed, NewsPriority, NewsStatus, NewsType } from '../../api/types'
import { Select } from '../../components/Select'
import { EmptyBox, ErrorBox, LoadingBox, Spinner } from '../../components/StateViews'
import { formatDateTime, NEWS_PRIORITY_LABEL, NEWS_STATUS_LABEL, NEWS_TYPE_LABEL } from '../../utils/format'
import { NewsBadges } from './NewsBadges'
import { feedCache, feedScrollCache, type CachedFeed } from './newsFeedCache'
import { parseNewsFilters, toFeedQuery, toNewsSearchParams, type NewsFilters } from './newsParams'

interface FeedState extends CachedFeed {
  key: string // filtros a los que pertenecen estas noticias
  loading: boolean
  error: string | null
}

// Arranca desde el caché si ya teníamos ese feed; si no, vacío y listo para la primera carga.
function initialFeed(key: string): FeedState {
  const cached = feedCache.get(key)
  return { key, items: [], nextCursor: null, hasMore: true, ...cached, loading: false, error: null }
}

export function NewsFeedPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = parseNewsFilters(searchParams)
  const key = toNewsSearchParams(filters).toString()

  // URL inválida -> la normalizamos (replace, sin ensuciar el historial).
  useEffect(() => {
    if (key !== searchParams.toString()) setSearchParams(new URLSearchParams(key), { replace: true })
  }, [key, searchParams, setSearchParams])

  const updateFilters = (patch: Partial<NewsFilters>) => setSearchParams(toNewsSearchParams({ ...filters, ...patch }))

  const [feed, setFeed] = useState<FeedState>(() => initialFeed(key))
  // La carga en vuelo vive en un ref (no en el estado) para chequearla sin esperar a un render:
  // así nunca salen dos cargas a la vez.
  const inFlight = useRef<AbortController | null>(null)

  // 1) Cambio de filtros: cancelamos la carga en vuelo y empezamos el feed de esos filtros
  //    desde cero (sin cursor). Las respuestas de los filtros anteriores ya no pueden mezclarse.
  useEffect(() => {
    setFeed((prev) => (prev.key === key ? prev : initialFeed(key)))
    return () => {
      inFlight.current?.abort()
      inFlight.current = null
    }
  }, [key])

  // 2) Infinite scroll: un "centinela" al final de la lista avisa cuando está cerca de verse.
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [nearEnd, setNearEnd] = useState(false)
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => setNearEnd(entry.isIntersecting), { rootMargin: '400px 0px' })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // 3) Cargar la siguiente tanda cuando el centinela está cerca, hay más y no hay otra en vuelo.
  //    Si tras cargar el centinela sigue visible (pantalla grande), este efecto vuelve a correr y carga otra.
  useEffect(() => {
    const canLoad = feed.key === key && feed.hasMore && !feed.loading && !feed.error
    if (!nearEnd || !canLoad || inFlight.current) return

    const controller = new AbortController()
    inFlight.current = controller
    setFeed((prev) => ({ ...prev, loading: true, error: null }))
    apiFetch<NewsFeed>(`/news/feed?${toFeedQuery(key, feed.nextCursor)}`, { signal: controller.signal })
      .then((page) => {
        if (controller.signal.aborted) return // cambiaron los filtros: esta respuesta ya no sirve
        inFlight.current = null
        setFeed((prev) => {
          if (prev.key !== key) return prev
          // Regla de Nami: ninguna noticia aparece dos veces.
          const seen = new Set(prev.items.map((n) => n.id))
          return {
            ...prev,
            items: [...prev.items, ...page.items.filter((n) => !seen.has(n.id))],
            nextCursor: page.nextCursor,
            hasMore: page.hasMore && page.nextCursor !== null,
            loading: false,
          }
        })
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted || isAbortError(err)) return
        inFlight.current = null
        // El error no borra lo ya cargado: solo se guarda para mostrarlo con "Reintentar".
        setFeed((prev) =>
          prev.key !== key ? prev : { ...prev, loading: false, error: err instanceof ApiError ? err.message : 'Error inesperado.' },
        )
      })
  }, [nearEnd, feed, key])

  // 4) Guardamos lo cargado para poder volver del detalle sin pedirlo otra vez.
  useEffect(() => {
    if (feed.items.length > 0 || !feed.hasMore) {
      feedCache.set(feed.key, { items: feed.items, nextCursor: feed.nextCursor, hasMore: feed.hasMore })
    }
  }, [feed])

  // 5) Restaurar el scroll al volver del detalle.
  const restoredRef = useRef(false)
  useLayoutEffect(() => {
    if (restoredRef.current || feed.items.length === 0) return
    restoredRef.current = true
    const y = feedScrollCache.get(key)
    if (y !== undefined) window.scrollTo(0, y)
  }, [feed.items.length, key])
  const rememberScroll = () => feedScrollCache.set(key, window.scrollY)

  const retry = () => setFeed((prev) => ({ ...prev, error: null }))
  const current = feed.key === key ? feed : initialFeed(key)
  const isEmpty = current.items.length === 0

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Noticias del Mundo</h1>

      <div className="grid gap-3 rounded-lg border border-slate-800 bg-slate-900 p-4 sm:grid-cols-3">
        <Select
          label="Tipo"
          value={filters.type ?? ''}
          onChange={(v) => updateFilters({ type: (v || null) as NewsType | null })}
          options={[['', 'Todos'], ...Object.entries(NEWS_TYPE_LABEL)]}
        />
        <Select
          label="Prioridad"
          value={filters.priority ?? ''}
          onChange={(v) => updateFilters({ priority: (v || null) as NewsPriority | null })}
          options={[['', 'Todas'], ...Object.entries(NEWS_PRIORITY_LABEL)]}
        />
        <Select
          label="Estado"
          value={filters.status ?? ''}
          onChange={(v) => updateFilters({ status: (v || null) as NewsStatus | null })}
          options={[['', 'Todos'], ...Object.entries(NEWS_STATUS_LABEL)]}
        />
      </div>

      {isEmpty && current.error ? (
        <ErrorBox message={current.error} onRetry={retry} />
      ) : isEmpty && !current.hasMore ? (
        <EmptyBox>No hay noticias con estos filtros.</EmptyBox>
      ) : isEmpty ? (
        <LoadingBox label="Esperando al News Coo…" />
      ) : (
        <ul className="space-y-3">
          {current.items.map((n) => (
            <li key={n.id}>
              <Link
                to={`/news/${n.id}`}
                state={{ fromFeed: true }}
                onClick={rememberScroll}
                className="block rounded-lg border border-slate-800 bg-slate-900 p-4 hover:border-amber-500"
              >
                <NewsBadges news={n} />
                <h2 className="mt-2 font-semibold">{n.title}</h2>
                <p className="mt-1 text-sm text-slate-300">{n.summary}</p>
                <p className="mt-2 text-xs text-slate-500">
                  {n.source} · {n.island} · {formatDateTime(n.publishedAt)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* Pie del feed: cargando más / error sin perder lo cargado / fin de la lista. */}
      {!isEmpty && (
        <div className="flex min-h-12 items-center justify-center text-sm text-slate-400">
          {current.error ? (
            <p role="alert" className="text-red-300">
              No se pudieron cargar más noticias: {current.error}{' '}
              <button onClick={retry} className="ml-2 rounded bg-red-700 px-3 py-1 text-white hover:bg-red-600">Reintentar</button>
            </p>
          ) : current.loading ? (
            <span className="flex items-center gap-2" role="status"><Spinner /> Cargando más noticias…</span>
          ) : !current.hasMore ? (
            <span>No hay más noticias. Llegaste al final del feed.</span>
          ) : null}
        </div>
      )}

      <div ref={sentinelRef} aria-hidden="true" />
    </div>
  )
}
