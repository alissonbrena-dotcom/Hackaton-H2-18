import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { ApiError, apiFetch } from '../../api/client'
import type { NewsDetail, NewsVerification } from '../../api/types'
import { ErrorBox, LoadingBox, Spinner } from '../../components/StateViews'
import { useApiQuery } from '../../hooks/useApiQuery'
import { formatDateTime, NEWS_STATUS_LABEL } from '../../utils/format'
import { NewsBadges } from './NewsBadges'
import { applyNewsUpdate } from './newsFeedCache'

export function NewsDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  // El feed puede haber quedado scrolleado: el detalle siempre se abre desde arriba.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [id])

  const { data, error, loading, retry } = useApiQuery(`news/${id}`, (signal) =>
    apiFetch<NewsDetail>(`/news/${encodeURIComponent(id)}`, { signal }).catch((err: unknown) => {
      if (err instanceof ApiError && err.status === 404) throw new ApiError({ status: 404, code: 'NOT_FOUND', message: 'Esta noticia no existe.' })
      throw err
    }),
  )

  // Verificación del rumor.
  const [updated, setUpdated] = useState<NewsDetail | null>(null)
  const [pending, setPending] = useState<NewsVerification | null>(null)
  const [verifyError, setVerifyError] = useState<{ message: string; status: NewsVerification } | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const news = updated?.id === id ? updated : data

  function showResult(result: NewsDetail, message: string) {
    setUpdated(result)
    applyNewsUpdate(result) // el feed muestra el nuevo estado al volver
    setNotice(message)
  }

  async function verify(status: NewsVerification) {
    if (pending) return // la acción está deshabilitada mientras la request está en vuelo
    setPending(status)
    setVerifyError(null)
    setNotice(null)
    try {
      const result = await apiFetch<NewsDetail>(`/news/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: { status } })
      showResult(result, `Listo: la noticia quedó como "${NEWS_STATUS_LABEL[result.status]}".`)
    } catch (err) {
      if (err instanceof ApiError && err.code === 'NEWS_ALREADY_VERIFIED' && err.current) {
        // Alguien ya la verificó con el otro estado: mostramos cómo quedó realmente.
        showResult(err.current, `Esta noticia ya había sido verificada como "${NEWS_STATUS_LABEL[err.current.status]}".`)
      } else {
        // El estado anterior se conserva: solo mostramos el error y permitimos reintentar.
        setVerifyError({ message: err instanceof ApiError ? err.message : 'Error inesperado.', status })
      }
    } finally {
      setPending(null)
    }
  }

  // Si venimos del feed, "cerrar" = atrás en el historial: el feed vuelve con sus filtros, noticias y scroll.
  const cameFromFeed = typeof location.state === 'object' && location.state !== null && 'fromFeed' in location.state
  const close = (
    <button onClick={() => (cameFromFeed ? navigate(-1) : navigate('/news'))} className="text-amber-400 hover:underline">
      ← Volver a las noticias
    </button>
  )

  if (loading) return <div>{close}<LoadingBox label="Leyendo la noticia…" /></div>
  if (error || !news) {
    return (
      <div className="space-y-4">
        {close}
        <ErrorBox message={error ?? 'Sin datos.'} onRetry={error === 'Esta noticia no existe.' ? undefined : retry} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {close}
      <article className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <NewsBadges news={news} />
        <h1 className="mt-3 text-2xl font-bold">{news.title}</h1>
        <p className="mt-1 text-sm text-slate-400">
          {news.source} · {news.island} · {formatDateTime(news.publishedAt)}
        </p>
        <p className="mt-4 text-lg text-slate-200">{news.summary}</p>
        <div className="mt-4 space-y-3 text-slate-300">
          {news.body.map((paragraph, i) => <p key={i}>{paragraph}</p>)}
        </div>
        {news.relatedWanted && (
          <p className="mt-4 text-sm">
            Cartel relacionado:{' '}
            <Link to={`/wanted/${news.relatedWanted.id}`} className="text-amber-400 underline">{news.relatedWanted.name}</Link>
          </p>
        )}
        {news.verifiedAt && (
          <p className="mt-2 text-xs text-slate-500">Verificada el {formatDateTime(news.verifiedAt)}</p>
        )}
      </article>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-4" aria-live="polite">
        {news.status === 'RUMOR' ? (
          <>
            <h2 className="font-semibold">¿Es cierto este rumor?</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <VerifyButton label="Confirmar" pendingLabel="Confirmando…" status="CONFIRMED" pending={pending} onClick={verify}
                className="bg-emerald-600 hover:enabled:bg-emerald-500" />
              <VerifyButton label="Desmentir" pendingLabel="Desmintiendo…" status="DEBUNKED" pending={pending} onClick={verify}
                className="bg-red-700 hover:enabled:bg-red-600" />
            </div>
          </>
        ) : (
          <p className="text-slate-300">Esta noticia ya está verificada como <b>{NEWS_STATUS_LABEL[news.status]}</b>.</p>
        )}

        {notice && <p className="mt-3 text-emerald-300" role="status">{notice}</p>}
        {verifyError && (
          <div className="mt-3 text-red-300" role="alert">
            <p>No se pudo verificar la noticia: {verifyError.message}</p>
            <button
              onClick={() => verify(verifyError.status)}
              disabled={pending !== null}
              className="mt-2 rounded bg-red-700 px-3 py-1 text-white hover:enabled:bg-red-600 disabled:opacity-50"
            >
              Reintentar
            </button>
          </div>
        )}
      </section>
    </div>
  )
}

function VerifyButton({ label, pendingLabel, status, pending, onClick, className }: {
  label: string
  pendingLabel: string
  status: NewsVerification
  pending: NewsVerification | null
  onClick: (status: NewsVerification) => void
  className: string
}) {
  return (
    <button
      onClick={() => onClick(status)}
      disabled={pending !== null}
      className={`flex items-center gap-2 rounded px-4 py-2 font-medium text-white disabled:opacity-50 ${className}`}
    >
      {pending === status && <Spinner />}
      {pending === status ? pendingLabel : label}
    </button>
  )
}
