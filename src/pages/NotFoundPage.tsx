import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-6xl font-bold text-amber-400">404</p>
      <p className="text-slate-300">Este rumbo no aparece en ningún mapa del Grand Line.</p>
      <Link to="/" className="rounded bg-amber-500 px-4 py-2 font-semibold text-slate-950">Volver al inicio</Link>
    </div>
  )
}
