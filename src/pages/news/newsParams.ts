import type { NewsPriority, NewsStatus, NewsType } from '../../api/types'

// Igual que en /wanted, la URL es la fuente de verdad de los filtros: /news?type=BATTLE&status=RUMOR

export interface NewsFilters {
  type: NewsType | null
  priority: NewsPriority | null
  status: NewsStatus | null
}

const TYPES: readonly NewsType[] = ['BOUNTY_UPDATE', 'BATTLE', 'MARINE_OPERATION', 'WORLD_GOVERNMENT', 'DISCOVERY']
const PRIORITIES: readonly NewsPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
const STATUSES: readonly NewsStatus[] = ['RUMOR', 'CONFIRMED', 'DEBUNKED']

export const FEED_LIMIT = 20

function pick<T extends string>(value: string | null, allowed: readonly T[]): T | null {
  return allowed.find((a) => a === value) ?? null
}

// Valores inválidos (type=PIZZA) se descartan: la vista no se rompe.
export function parseNewsFilters(params: URLSearchParams): NewsFilters {
  return {
    type: pick(params.get('type'), TYPES),
    priority: pick(params.get('priority'), PRIORITIES),
    status: pick(params.get('status'), STATUSES),
  }
}

// Orden fijo y sin vacíos: la misma combinación de filtros siempre da el mismo string.
// Ese string es también la clave del caché de feeds.
export function toNewsSearchParams(f: NewsFilters): URLSearchParams {
  const p = new URLSearchParams()
  if (f.type) p.set('type', f.type)
  if (f.priority) p.set('priority', f.priority)
  if (f.status) p.set('status', f.status)
  return p
}

// Query para el backend. El cursor siempre va con los mismos filtros con los que se obtuvo.
export function toFeedQuery(filtersKey: string, cursor: string | null): string {
  const p = new URLSearchParams(filtersKey)
  p.set('limit', String(FEED_LIMIT))
  if (cursor) p.set('cursor', cursor)
  return p.toString()
}
