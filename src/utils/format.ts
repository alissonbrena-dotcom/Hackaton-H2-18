import type { FruitFilter, NewsPriority, NewsStatus, NewsType, WantedSort, WantedStatus } from '../api/types'

export function formatBerries(n: number): string {
  return `฿ ${n.toLocaleString('es-PE')}`
}

export const STATUS_LABEL: Record<WantedStatus, string> = {
  AT_LARGE: 'Prófugo',
  CAPTURED: 'Capturado',
  MISSING: 'Desaparecido',
}

export const FRUIT_LABEL: Record<FruitFilter, string> = {
  PARAMECIA: 'Paramecia',
  ZOAN: 'Zoan',
  LOGIA: 'Logia',
  NONE: 'Sin fruta',
}

export const SORT_LABEL: Record<WantedSort, string> = {
  'bounty,desc': 'Mayor recompensa',
  'name,asc': 'Nombre (A-Z)',
  'updatedAt,desc': 'Actualizados recientemente',
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' })
}

export const NEWS_TYPE_LABEL: Record<NewsType, string> = {
  BOUNTY_UPDATE: 'Recompensas',
  BATTLE: 'Batalla',
  MARINE_OPERATION: 'Operación de la Marina',
  WORLD_GOVERNMENT: 'Gobierno Mundial',
  DISCOVERY: 'Descubrimiento',
}

export const NEWS_PRIORITY_LABEL: Record<NewsPriority, string> = {
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
}

export const NEWS_STATUS_LABEL: Record<NewsStatus, string> = {
  RUMOR: 'Rumor',
  CONFIRMED: 'Confirmada',
  DEBUNKED: 'Desmentida',
}
