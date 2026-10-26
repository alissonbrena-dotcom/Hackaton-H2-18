import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { ApiError, apiFetch } from '../../api/client'
import type { WantedDetail } from '../../api/types'
import { ErrorBox, LoadingBox } from '../../components/StateViews'
import { useApiQuery } from '../../hooks/useApiQuery'
import { FRUIT_LABEL, formatBerries, STATUS_LABEL } from '../../utils/format'

export function WantedDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { data, error, loading, retry } = useApiQuery(`wanted/${id}`, (signal) =>
    apiFetch<WantedDetail>(`/wanted/${encodeURIComponent(id)}`, { signal }).catch((err: unknown) => {
      if (err instanceof ApiError && err.status === 404) throw new ApiError({ status: 404, code: 'NOT_FOUND', message: 'Este cartel no existe.' })
      throw err
    }),
  )

  // Si venimos del listado, "volver" = atrás en el historial: recupera la URL exacta (filtros, página).
  const cameFromList = typeof location.state === 'object' && location.state !== null && 'fromList' in location.state
  const back = (
    <button
      onClick={() => (cameFromList ? navigate(-1) : navigate('/wanted'))}
      className="text-amber-400 hover:underline"
    >
      ← Volver a los carteles
    </button>
  )

  if (loading) return <div>{back}<LoadingBox label="Buscando el cartel…" /></div>
  if (error || !data) {
    return (
      <div className="space-y-4">
        {back}
        <ErrorBox message={error ?? 'Sin datos.'} onRetry={error === 'Este cartel no existe.' ? undefined : retry} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {back}
      <article className="rounded-xl border border-amber-700/50 bg-slate-900 p-6">
        <p className="text-sm uppercase tracking-widest text-amber-500">Se Busca · {STATUS_LABEL[data.status]}</p>
        <h1 className="text-3xl font-bold">{data.name}</h1>
        <p className="text-lg text-slate-400">“{data.epithet}”</p>
        <p className="mt-3 text-3xl font-bold text-amber-400">{formatBerries(data.bounty)}</p>

        <dl className="mt-6 grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
          <Info label="Tripulación" value={data.crew.name} />
          <Info label="Rol" value={data.role} />
          <Info label="Fruta" value={data.devilFruit ? `${data.devilFruit.name} (${FRUIT_LABEL[data.devilFruit.type]})` : 'Ninguna'} />
          <Info label="Edad" value={`${data.age} años`} />
          <Info label="Altura" value={`${data.heightCm} cm`} />
          <Info label="Amenaza" value={`${data.threatLevel}`} />
          <Info label="Visto por última vez" value={`${data.lastSeen.island} · ${new Date(data.lastSeen.seenAt).toLocaleString('es-PE')}`} />
        </dl>

        <p className="mt-6 text-slate-300">{data.bio}</p>

        <h2 className="mt-6 font-semibold">Historial de recompensas</h2>
        <ol className="mt-2 space-y-1 text-sm">
          {data.bountyHistory.map((h) => (
            <li key={h.issuedAt} className="flex justify-between border-b border-slate-800 py-1">
              <span className="text-slate-400">{new Date(h.issuedAt).toLocaleDateString('es-PE')}</span>
              <span>{formatBerries(h.amount)}</span>
            </li>
          ))}
        </ol>
      </article>
      <Link to="/wanted" className="sr-only">Ir al listado</Link>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase text-slate-500">{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}
