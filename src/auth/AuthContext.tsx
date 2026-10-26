import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { apiFetch, setUnauthorizedHandler, tokenStorage } from '../api/client'
import type { LoginResponse, MeResponse, Team, User } from '../api/types'

// 'checking' = hay un token guardado y todavía estamos preguntando a /auth/me si sigue siendo válido.
type AuthStatus = 'checking' | 'authenticated' | 'anonymous'

interface AuthContextValue {
  status: AuthStatus
  user: User | null
  team: Team | null
  login: (email: string, password: string) => Promise<void>
  register: (teamName: string, email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(() => (tokenStorage.get() ? 'checking' : 'anonymous'))
  const [user, setUser] = useState<User | null>(null)
  const [team, setTeam] = useState<Team | null>(null)

  const logout = useCallback(() => {
    tokenStorage.clear()
    setUser(null)
    setTeam(null)
    setStatus('anonymous')
  }, [])

  // Cualquier 401 en cualquier parte de la app cierra la sesión -> RequireAuth manda al login.
  useEffect(() => {
    setUnauthorizedHandler(logout)
  }, [logout])

  // Restauración de sesión al recargar: validamos el token guardado con /auth/me.
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
        if (controller.signal.aborted) return
        // 401 ya llamó a logout; ante otros errores tampoco podemos confirmar la sesión.
        if (!(err instanceof DOMException)) logout()
      })
    return () => controller.abort()
  }, [logout])

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
    () => ({ status, user, team, login, register, logout }),
    [status, user, team, login, register, logout],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
