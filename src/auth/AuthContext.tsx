import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ApiError, apiFetch, isAbortError, setUnauthorizedHandler, tokenStorage } from '../api/client'
import type { LoginResponse, MeResponse, Team, User } from '../api/types'

// Estados posibles de la sesión:
// 'checking'      = hay un token guardado y estamos preguntando a /auth/me si sigue siendo válido.
// 'authenticated' = sesión confirmada: se pueden ver las rutas privadas.
// 'anonymous'     = no hay sesión: las rutas privadas mandan al login.
// 'error'         = no pudimos confirmarlo (red caída, 5xx): el token NO se descarta, se puede reintentar.
type AuthStatus = 'checking' | 'authenticated' | 'anonymous' | 'error'

interface AuthContextValue {
  status: AuthStatus
  user: User | null
  team: Team | null
  login: (email: string, password: string) => Promise<void>
  register: (teamName: string, email: string, password: string) => Promise<void>
  logout: () => void
  retrySession: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(() => (tokenStorage.get() ? 'checking' : 'anonymous'))
  const [user, setUser] = useState<User | null>(null)
  const [team, setTeam] = useState<Team | null>(null)
  const [restoreAttempt, setRestoreAttempt] = useState(0)

  const logout = useCallback(() => {
    tokenStorage.clear()
    setUser(null)
    setTeam(null)
    setStatus('anonymous')
  }, [])

  // Sesión que deja de ser válida: si CUALQUIER request recibe 401 (token vencido o inválido),
  // apiFetch llama a logout. El estado pasa a 'anonymous' y RequireAuth manda al login.
  useEffect(() => {
    setUnauthorizedHandler(logout)
  }, [logout])

  // Restauración de sesión al recargar: el token está en localStorage, pero no sabemos si sigue
  // siendo válido. Se lo preguntamos a /auth/me. Mientras responde, el estado es 'checking'
  // y se muestra "Verificando sesión…" en vez del login (así no hay parpadeo).
  useEffect(() => {
    if (!tokenStorage.get()) return
    const controller = new AbortController()
    apiFetch<MeResponse>('/auth/me', { signal: controller.signal })
      .then((me) => {
        setUser(me.user)
        setTeam(me.team)
        setStatus('authenticated')
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted || isAbortError(err)) return
        // 401 ya llamó a logout. Otro error no dice que la sesión sea inválida: dejamos reintentar.
        if (!(err instanceof ApiError && err.status === 401)) setStatus('error')
      })
    return () => controller.abort()
  }, [restoreAttempt])

  const retrySession = useCallback(() => {
    setStatus('checking')
    setRestoreAttempt((a) => a + 1)
  }, [])

  // Login y registro responden lo mismo (token + usuario + equipo): guardamos el token y entramos.
  // Por eso el registro entra directo a la app con la sesión iniciada.
  const startSession = useCallback((res: LoginResponse) => {
    tokenStorage.set(res.token)
    setUser(res.user)
    setTeam(res.team)
    setStatus('authenticated')
  }, [])

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await apiFetch<LoginResponse>('/auth/login', {
        method: 'POST',
        body: { email, password },
        skipAuthRedirect: true,
      })
      startSession(res)
    },
    [startSession],
  )

  const register = useCallback(
    async (teamName: string, email: string, password: string) => {
      const res = await apiFetch<LoginResponse>('/auth/register', {
        method: 'POST',
        body: { teamName, email, password },
        skipAuthRedirect: true,
      })
      startSession(res)
    },
    [startSession],
  )

  const value = useMemo(
    () => ({ status, user, team, login, register, logout, retrySession }),
    [status, user, team, login, register, logout, retrySession],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
