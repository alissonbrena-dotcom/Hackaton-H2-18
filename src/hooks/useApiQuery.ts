import { useCallback, useEffect, useState } from 'react'
import { ApiError, isAbortError } from '../api/client'

interface QueryState<T> {
  data: T | null
  error: string | null
  loading: boolean
  retry: () => void
}

// Ejecuta una request cada vez que cambia `key`.
// - AbortController: si cambia la key (o se desmonta), la request anterior se cancela,
//   así una respuesta vieja nunca pisa a la nueva.
// - retry: vuelve a disparar la misma request.
export function useApiQuery<T>(key: string, fetcher: (signal: AbortSignal) => Promise<T>): QueryState<T> {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    fetcher(controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return
        setData(result)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted || isAbortError(err)) return
        setError(err instanceof ApiError ? err.message : 'Error inesperado.')
        setLoading(false)
      })
    return () => controller.abort()
    // fetcher se recrea en cada render; la key es la que define "qué" pedimos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt])

  const retry = useCallback(() => setAttempt((a) => a + 1), [])
  return { data, error, loading, retry }
}
