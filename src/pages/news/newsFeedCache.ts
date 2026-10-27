import type { NewsItem } from '../../api/types'

export interface CachedFeed {
  items: NewsItem[]
  nextCursor: string | null
  hasMore: boolean
}

// Feeds ya cargados, por filtros (clave = query canónica de la URL). Al volver del detalle
// el feed se pinta tal cual estaba y en la misma posición, sin volver a pedir lo que ya tenía.
export const feedCache = new Map<string, CachedFeed>()
export const feedScrollCache = new Map<string, number>()

// Tras verificar una noticia, la reflejamos en todos los feeds guardados. Si un feed filtra por
// estado y la noticia ya no lo cumple, sale de ese feed (el backend tampoco la volvería a mandar).
export function applyNewsUpdate(updated: NewsItem) {
  for (const [key, feed] of feedCache) {
    const statusFilter = new URLSearchParams(key).get('status')
    const items = statusFilter && statusFilter !== updated.status
      ? feed.items.filter((n) => n.id !== updated.id)
      : feed.items.map((n) =>
          n.id === updated.id
            ? { ...n, status: updated.status, verifiedAt: updated.verifiedAt, updatedAt: updated.updatedAt }
            : n,
        )
    feedCache.set(key, { ...feed, items })
  }
}
