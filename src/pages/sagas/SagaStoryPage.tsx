import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { ApiError, apiFetch } from '../../api/client'
import type { SagaStage, SagaStory, SagaSummary, StageMetric } from '../../api/types'
import { ErrorBox, LoadingBox } from '../../components/StateViews'
import { useApiQuery } from '../../hooks/useApiQuery'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { formatBerries } from '../../utils/format'
import { withViewTransition } from '../../utils/viewTransition'
import { GrandLineMap } from './GrandLineMap'

// Referencia fija: un `[]` nuevo en cada render haría correr de nuevo los efectos que dependen de las etapas.
const NO_STAGES: SagaStage[] = []

function formatMetric(m: StageMetric): string {
  if (m.unit === 'berries') return formatBerries(m.value)
  if (m.unit === '%' || m.unit.startsWith('/')) return `${m.value}${m.unit}`
  return `${m.value.toLocaleString('es-PE')} ${m.unit}`
}

export function SagaStoryPage() {
  const { id = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const reducedMotion = useReducedMotion()

  const { data, error, loading, retry } = useApiQuery(`saga/${id}`, (signal) =>
    apiFetch<SagaStory>(`/sagas/${encodeURIComponent(id)}/story`, { signal }).catch((err: unknown) => {
      if (err instanceof ApiError && err.status === 404) throw new ApiError({ status: 404, code: 'NOT_FOUND', message: 'Esta saga no existe.' })
      throw err
    }),
  )
  const story = data?.saga.id === id ? data : null
  const stages = story?.stages ?? NO_STAGES

  // La URL es la fuente de verdad de la etapa activa: /sagas/:id?stage=<slug>.
  const requested = stages.findIndex((s) => s.slug === searchParams.get('stage'))
  const active = Math.max(requested, 0)
  const stage = stages[active]

  const setStage = useCallback(
    (slug: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.set('stage', slug)
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  // ?stage inválido o ausente -> lo normalizamos a la primera etapa.
  useEffect(() => {
    if (stages.length > 0 && requested === -1) setStage(stages[0].slug)
  }, [stages, requested, setStage])

  const sectionRefs = useRef<(HTMLElement | null)[]>([])

  // Abrir una URL con ?stage lleva directo a esa etapa (sin animar el salto).
  const initialScrollDone = useRef(false)
  useLayoutEffect(() => {
    if (!story || initialScrollDone.current) return
    initialScrollDone.current = true
    if (requested > 0) sectionRefs.current[requested]?.scrollIntoView({ block: 'start' })
  }, [story, requested])

  // Etapas activadas por scroll: la etapa que cruza una franja en el centro de la pantalla
  // pasa a ser la activa (y se escribe en la URL con replace, sin llenar el historial).
  useEffect(() => {
    if (stages.length === 0) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const index = Number((entry.target as HTMLElement).dataset.index)
          if (stages[index]) setStage(stages[index].slug)
        }
      },
      { rootMargin: '-55% 0px -44% 0px' },
    )
    sectionRefs.current.forEach((el) => el && observer.observe(el))
    return () => observer.disconnect()
  }, [stages, setStage])

  // Navegación por teclado: ← / → (o los botones) mueven el foco y el scroll a la etapa.
  const goTo = useCallback(
    (index: number) => {
      const target = stages[index]
      const el = sectionRefs.current[index]
      if (!target || !el) return
      setStage(target.slug)
      el.scrollIntoView({ block: 'start', behavior: reducedMotion ? 'auto' : 'smooth' })
      el.focus({ preventScroll: true })
    },
    [stages, setStage, reducedMotion],
  )
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || e.altKey || e.ctrlKey || e.metaKey) return
      if (e.key === 'ArrowRight') { e.preventDefault(); goTo(active + 1) }
      if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(active - 1) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, goTo])

  // Barra de progreso: con soporte la mueve CSS (animation-timeline: scroll()). Sin soporte,
  // o con reduced motion (sin animación CSS), la actualizamos con un listener de scroll.
  const progressRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const bar = progressRef.current
    if (!bar || (CSS.supports('animation-timeline: scroll()') && !reducedMotion)) return
    let frame = 0
    const update = () => {
      frame = 0
      const max = document.documentElement.scrollHeight - window.innerHeight
      bar.style.transform = `scaleX(${max > 0 ? Math.min(window.scrollY / max, 1) : 1})`
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [reducedMotion, story])

  const back = (
    <button onClick={() => withViewTransition(() => navigate('/sagas'))} className="text-amber-400 hover:underline">
      ← Volver a las sagas
    </button>
  )

  // Mientras carga, mostramos el encabezado con el resumen que trajimos del listado
  // (así la View Transition tiene a qué animar).
  const preview = (location.state as { summary?: SagaSummary } | null)?.summary
  const header = story?.saga ?? (preview?.id === id ? preview : null)

  if (!story) {
    return (
      <div className="space-y-4">
        {back}
        {header && <SagaHeader saga={header} />}
        {loading ? <LoadingBox label="Leyendo el Poneglyph…" /> : (
          <ErrorBox message={error ?? 'Sin datos.'} onRetry={error === 'Esta saga no existe.' ? undefined : retry} />
        )}
      </div>
    )
  }

  const palette = stage?.palette ?? story.saga.palette
  const fade = 'transition-colors duration-700 motion-reduce:transition-none'

  return (
    <div className="space-y-4">
      <div ref={progressRef} className="story-progress fixed inset-x-0 top-0 z-30 h-1" style={{ backgroundColor: palette.primary }} aria-hidden="true" />
      {back}

      <div className={`rounded-xl ${fade}`} style={{ backgroundColor: palette.background, color: palette.text }}>
        <div className="p-5 md:p-8">
          <SagaHeader saga={story.saga} />
          <p className="mt-4 max-w-2xl text-lg">{story.saga.intro}</p>
        </div>

        <div className="grid gap-6 px-3 pb-6 md:px-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)]">
          {/* Panel persistente: mapa, progreso y métricas de la etapa activa. Sticky en desktop y mobile. */}
          <aside
            className={`sticky top-0 z-20 -mx-3 space-y-3 p-3 lg:top-4 lg:order-2 lg:mx-0 lg:self-start lg:rounded-xl ${fade}`}
            style={{ backgroundColor: palette.background }}
          >
            <GrandLineMap map={story.map} stages={stages} active={active} palette={palette} reducedMotion={reducedMotion} />

            <div>
              <div className="flex justify-between text-sm">
                <span>Etapa {active + 1} de {stages.length}</span>
                <span className="opacity-80">{stage?.island.name}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded" style={{ backgroundColor: palette.surface }}
                role="progressbar" aria-valuemin={1} aria-valuemax={stages.length} aria-valuenow={active + 1} aria-label="Progreso del recorrido">
                <div
                  className="h-full rounded transition-[width] duration-700 motion-reduce:transition-none"
                  style={{ width: `${((active + 1) / stages.length) * 100}%`, backgroundColor: palette.primary }}
                />
              </div>
            </div>

            {/* Métricas: siempre las de la etapa activa. */}
            <dl className="grid grid-cols-4 gap-2 lg:grid-cols-2" aria-live="polite">
              {stage?.metrics.map((m) => (
                <div key={m.key} className={`rounded-lg p-2 lg:p-3 ${fade}`} style={{ backgroundColor: palette.surface }}>
                  <dt className="text-[10px] uppercase opacity-75 lg:text-xs">{m.label}</dt>
                  <dd className="text-sm font-bold lg:text-lg" style={{ color: palette.primary }}>{formatMetric(m)}</dd>
                </div>
              ))}
            </dl>

            <nav aria-label="Etapas de la saga" className="flex flex-wrap items-center gap-1 text-xs">
              <button onClick={() => goTo(active - 1)} disabled={active === 0} className="rounded px-2 py-1 disabled:opacity-40"
                style={{ backgroundColor: palette.surface }}>← Anterior</button>
              {stages.map((s, i) => (
                <button key={s.id} onClick={() => goTo(i)} aria-current={i === active ? 'step' : undefined}
                  aria-label={`Etapa ${i + 1}: ${s.title}`} className="h-7 w-7 rounded-full font-bold"
                  style={i === active ? { backgroundColor: palette.primary, color: palette.background } : { backgroundColor: palette.surface }}>
                  {i + 1}
                </button>
              ))}
              <button onClick={() => goTo(active + 1)} disabled={active === stages.length - 1} className="rounded px-2 py-1 disabled:opacity-40"
                style={{ backgroundColor: palette.surface }}>Siguiente →</button>
              <span className="hidden w-full opacity-70 lg:block">Tip: usa las flechas ← → del teclado.</span>
            </nav>
          </aside>

          {/* Narrativa: una sección por etapa. Todo el texto está siempre en el DOM (nada se pierde). */}
          <div className="pb-[45vh] lg:order-1">
            {stages.map((s, i) => (
              <section
                key={s.id}
                ref={(el) => { sectionRefs.current[i] = el }}
                data-index={i}
                data-active={i === active}
                tabIndex={-1}
                aria-labelledby={`stage-${s.id}`}
                className="stage-section flex min-h-[70vh] scroll-mt-[48vh] flex-col justify-center py-10 outline-none focus-visible:ring-2 lg:scroll-mt-16"
              >
                <div className="stage-reveal">
                  <p className="text-xs uppercase tracking-widest" style={{ color: s.palette.primary }}>
                    Etapa {s.order} · {s.island.name}
                  </p>
                  <h2 id={`stage-${s.id}`} className="mt-1 text-2xl font-bold">{s.title}</h2>
                  <div className="mt-3 space-y-3 text-base leading-relaxed">
                    {s.narrative.map((p, j) => <p key={j}>{p}</p>)}
                  </div>
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function SagaHeader({ saga }: { saga: SagaSummary }) {
  return (
    <header style={{ viewTransitionName: `saga-${saga.id}` }}>
      <p className="text-xs uppercase tracking-widest opacity-80">Saga {saga.order}</p>
      <h1 className="text-3xl font-bold">{saga.title}</h1>
      <p className="opacity-80">{saga.subtitle}</p>
    </header>
  )
}
