import type { FruitFilter, WantedSort, WantedStatus } from '../../api/types'

// La URL es la ÚNICA fuente de verdad del listado: /wanted?page=2&size=20&status=AT_LARGE...

export interface WantedFilters {
  page: number
  size: 10 | 20 | 50
  status: WantedStatus | null
  crewId: string | null
  fruit: FruitFilter | null
  q: string
  sort: WantedSort
}

const SIZES = [10, 20, 50] as const
const STATUSES: readonly WantedStatus[] = ['AT_LARGE', 'CAPTURED', 'MISSING']
const FRUITS: readonly FruitFilter[] = ['PARAMECIA', 'ZOAN', 'LOGIA', 'NONE']
const SORTS: readonly WantedSort[] = ['bounty,desc', 'name,asc', 'updatedAt,desc']

export const DEFAULT_FILTERS: WantedFilters = {
  page: 0,
  size: 20,
  status: null,
  crewId: null,
  fruit: null,
  q: '',
  sort: 'bounty,desc',
}

function pick<T extends string>(value: string | null, allowed: readonly T[]): T | null {
  return allowed.find((a) => a === value) ?? null
}

// Valores inválidos en la URL (page=-3, size=7, status=PIZZA) se reemplazan por el default: la vista no se rompe.
export function parseFilters(params: URLSearchParams): WantedFilters {
  const rawPage = Number(params.get('page'))
  const rawSize = Number(params.get('size'))
  const crewId = params.get('crewId')?.trim()
  return {
    page: Number.isInteger(rawPage) && rawPage >= 0 ? rawPage : DEFAULT_FILTERS.page,
    size: SIZES.find((s) => s === rawSize) ?? DEFAULT_FILTERS.size,
    status: pick(params.get('status'), STATUSES),
    crewId: crewId ? crewId : null,
    fruit: pick(params.get('fruit'), FRUITS),
    q: params.get('q')?.trim() ?? '',
    sort: pick(params.get('sort'), SORTS) ?? DEFAULT_FILTERS.sort,
  }
}

// Convierte filtros -> URLSearchParams en un orden fijo y omitiendo defaults (URL limpia y canónica).
export function toSearchParams(f: WantedFilters): URLSearchParams {
  const p = new URLSearchParams()
  if (f.page !== DEFAULT_FILTERS.page) p.set('page', String(f.page))
  if (f.size !== DEFAULT_FILTERS.size) p.set('size', String(f.size))
  if (f.status) p.set('status', f.status)
  if (f.crewId) p.set('crewId', f.crewId)
  if (f.fruit) p.set('fruit', f.fruit)
  if (f.q) p.set('q', f.q)
  if (f.sort !== DEFAULT_FILTERS.sort) p.set('sort', f.sort)
  return p
}

// Query que se manda al backend (siempre explícita, con page y size).
export function toApiQuery(f: WantedFilters): string {
  const p = toSearchParams(f)
  p.set('page', String(f.page))
  p.set('size', String(f.size))
  p.set('sort', f.sort)
  return p.toString()
}
