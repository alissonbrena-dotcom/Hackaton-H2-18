import { Navigate, Outlet, useLocation } from 'react-router'
import { ErrorBox, FullScreenLoader } from '../components/StateViews'
import { useAuth } from './AuthContext'

// Guardián de rutas privadas: envuelve todas las páginas que requieren sesión
// y decide qué mostrar según el estado de la sesión (ver AuthContext).
export function RequireAuth() {
  const { status, retrySession, logout } = useAuth()
  const location = useLocation()

  // Mientras verificamos el token NO mostramos el login (evita el "parpadeo").
  if (status === 'checking') return <FullScreenLoader label="Verificando sesión…" />

  // No se pudo verificar (red o servidor caído): reintentar sin perder la sesión.
  if (status === 'error') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4">
        <ErrorBox message="No se pudo verificar la sesión con el servidor." onRetry={retrySession} />
        <button onClick={logout} className="text-sm text-slate-400 underline">Ir al login</button>
      </div>
    )
  }

  if (status === 'anonymous') {
    // Guardamos a dónde quería ir (ruta + query) en el `state` de la navegación.
    // Después del login, LoginPage lee ese `from` y lo manda exactamente ahí.
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
