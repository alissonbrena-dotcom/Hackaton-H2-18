import { Link } from 'react-router'
import { apiFetch } from '../api/client'
import type { DashboardSummary, LogPose } from '../api/types'
import { EmptyBox, ErrorBox, LoadingBox } from '../components/StateViews'
import { useApiQuery } from '../hooks/useApiQuery'
import { formatBerries, STATUS_LABEL } from '../utils/format'

export function DashboardPage() {
  // Pedimos summary y log-pose en paralelo.
  const { data, error, loading, retry } = useApiQuery('dashboard', (signal) =>
    Promise.all([
      apiFetch<DashboardSummary>('/dashboard/summary', { signal }),
      apiFetch<LogPose>('/log-pose', { signal }),
    ]),
  )

  if (loading) return <LoadingBox label="Consultando a la Guild…" />
  if (error || !data) return <ErrorBox message={error ?? 'Sin datos.'} onRetry={retry} />

  const [summary, logPose] = data

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard · {summary.team.name}</h1>

      <section
        className={`rounded-lg border p-4 ${logPose.grandLineUnlocked ? 'border-emerald-600 bg-emerald-950/40' : 'border-amber-700 bg-amber-950/30'}`}
      >
        <h2 className="font-semibold">🧭 Log Pose: {logPose.grandLineUnlocked ? 'DESBLOQUEADO' : 'BLOQUEADO'}</h2>
        <p className="text-sm text-slate-300">{logPose.message}</p>
      </section>

      {summary.wanted.total === 0 ? (
        <EmptyBox>Tu workspace todavía no tiene carteles de "Se Busca".</EmptyBox>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Carteles" value={summary.wanted.total.toString()} />
            <Stat label="Recompensa total" value={formatBerries(summary.wanted.totalBounty)} />
            <Stat label="Recompensa promedio" value={formatBerries(summary.wanted.averageBounty)} />
            <Stat label="Tripulaciones" value={summary.crews.total.toString()} />
          </section>

          <section className="grid grid-cols-3 gap-3">
            {(Object.keys(STATUS_LABEL) as (keyof typeof STATUS_LABEL)[]).map((s) => (
              <Stat key={s} label={STATUS_LABEL[s]} value={summary.wanted.byStatus[s].toString()} />
            ))}
          </section>

          {summary.crews.mostWanted && (
            <p className="text-slate-300">
              Tripulación más buscada: <b>{summary.crews.mostWanted.name}</b> ({formatBerries(summary.crews.mostWanted.totalBounty)})
            </p>
          )}

          <section>
            <h2 className="mb-2 text-lg font-semibold">Top recompensas</h2>
            <ul className="divide-y divide-slate-800 rounded-lg border border-slate-800">
              {summary.topBounties.map((w) => (
                <li key={w.id}>
                  <Link to={`/wanted/${w.id}`} className="flex justify-between px-4 py-2 hover:bg-slate-900">
                    <span>{w.name} <span className="text-slate-400">“{w.epithet}”</span></span>
                    <span className="text-amber-400">{formatBerries(w.bounty)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <div className="text-xs uppercase text-slate-400">{label}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  )
}
