import type { ApiErrorBody, NewsDetail } from './types'

// La URL base viene de .env (VITE_API_BASE_URL), nunca escrita en el código.
const BASE_URL: string = import.meta.env.VITE_API_BASE_URL

const TOKEN_KEY = 'logpose.token'

export const tokenStorage = {
  get: (): string | null => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

// Error tipado: guarda el status HTTP, el code del backend y los detalles por campo.
export class ApiError extends Error {
  status: number
  code: string
  details: { field: string; message: string }[]
  current: NewsDetail | null

  constructor(body: ApiErrorBody) {
    super(body.message)
    this.status = body.status
    this.code = body.code
    this.details = body.details ?? []
    this.current = body.current ?? null
  }
}

// El AuthProvider registra aquí qué hacer cuando la sesión deja de ser válida (401).
let onUnauthorized: () => void = () => {}
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler
}

interface RequestOptions {
  method?: string
  body?: unknown
  signal?: AbortSignal
  // En login/registro un 401 significa "credenciales incorrectas", no "sesión vencida".
  skipAuthRedirect?: boolean
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  const token = tokenStorage.get()
  if (token) headers.Authorization = `Bearer ${token}`

  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    })
  } catch (err) {
    // Una request cancelada a propósito se propaga tal cual para poder ignorarla.
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    throw new ApiError({ status: 0, code: 'NETWORK_ERROR', message: 'No se pudo conectar con el servidor.' })
  }

  if (response.ok) return (await response.json()) as T

  const body = (await response.json().catch(() => null)) as ApiErrorBody | null
  const error = new ApiError(
    body ?? { status: response.status, code: 'UNKNOWN', message: `Error ${response.status}` },
  )
  if (response.status === 401 && !options.skipAuthRedirect) onUnauthorized()
  throw error
}

export function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError'
}
