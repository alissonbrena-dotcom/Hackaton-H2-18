import type { NewsItem, NewsStatus } from '../../api/types'
import { NEWS_PRIORITY_LABEL, NEWS_STATUS_LABEL, NEWS_TYPE_LABEL } from '../../utils/format'

const STATUS_CLASS: Record<NewsStatus, string> = {
  RUMOR: 'bg-amber-900/60 text-amber-200',
  CONFIRMED: 'bg-emerald-900/60 text-emerald-200',
  DEBUNKED: 'bg-red-900/60 text-red-200',
}

export function NewsBadges({ news }: { news: Pick<NewsItem, 'type' | 'priority' | 'status'> }) {
  return (
    <div className="flex flex-wrap gap-2 text-xs">
      <span className={`rounded px-2 py-0.5 ${STATUS_CLASS[news.status]}`}>{NEWS_STATUS_LABEL[news.status]}</span>
      <span className="rounded bg-slate-800 px-2 py-0.5">{NEWS_TYPE_LABEL[news.type]}</span>
      <span className={`rounded px-2 py-0.5 ${news.priority === 'CRITICAL' ? 'bg-red-700 text-white' : 'bg-slate-800'}`}>
        Prioridad {NEWS_PRIORITY_LABEL[news.priority].toLowerCase()}
      </span>
    </div>
  )
}
