import { NavLink, Outlet } from 'react-router'
import { useAuth } from '../auth/AuthContext'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded px-3 py-1.5 ${isActive ? 'bg-amber-500 text-slate-950' : 'hover:bg-slate-800'}`

export function Layout() {
  const { team, logout } = useAuth()
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <span className="font-bold text-amber-400">⚓ Log Pose Console</span>
          <nav className="flex gap-1 text-sm">
            <NavLink to="/" end className={linkClass}>Dashboard</NavLink>
            <NavLink to="/wanted" className={linkClass}>Se Busca</NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            {team && <span className="text-slate-400">{team.name} · {team.code}</span>}
            <button onClick={logout} className="rounded border border-slate-600 px-3 py-1.5 hover:bg-slate-800">
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
