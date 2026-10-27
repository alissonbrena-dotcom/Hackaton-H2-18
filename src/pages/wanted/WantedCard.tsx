import { Link } from 'react-router'
import type { WantedSummary } from '../../api/types'
import { FRUIT_LABEL, formatBerries, STATUS_LABEL } from '../../utils/format'

// Tarjeta de un cartel en el listado. Al hacer clic abre el detalle.
// `state={{ fromList: true }}` le avisa al detalle que venimos del listado,
// así su botón "Volver" hace atrás en el historial y recupera los filtros.
export function WantedCard({ wanted: w, onOpen }: { wanted: WantedSummary; onOpen: () => void }) {
  return (
    <Link
      to={`/wanted/${w.id}`}
      state={{ fromList: true }}
      onClick={onOpen}
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
  )
}
