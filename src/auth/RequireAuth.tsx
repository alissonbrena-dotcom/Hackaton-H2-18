import { Navigate, Outlet, useLocation } from 'react-router'
import { FullScreenLoader } from '../components/StateViews'
import { useAuth } from './AuthContext'

// Guardián de rutas privadas.
export function RequireAuth() {
  const { status } = useAuth()
  const location = useLocation()

  // Mientras verificamos el token NO mostramos el login (evita el "parpadeo").
  if (status === 'checking') return <FullScreenLoader label="Verificando sesión…" />

  if (status === 'anonymous') {
    // Guardamos a dónde quería ir (ruta + query) para volver ahí después del login.
    const from = location.pathname + location.search + location.hash
    return <Navigate to="/login" replace state={{ from }} />
  }

  return <Outlet />
}

// Lee el destino guardado por RequireAuth; si no hay, va al dashboard.
export function getRedirectTarget(state: unknown): string {
  if (state && typeof state === 'object' && 'from' in state && typeof state.from === 'string') {
    return state.from
  }
  return '/'
}
