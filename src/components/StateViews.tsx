import type { ReactNode } from 'react'

export function Spinner() {
  return <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-amber-400 border-t-transparent motion-reduce:animate-none" />
}

export function FullScreenLoader({ label }: { label: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center gap-3 text-slate-300" role="status">
      <Spinner /> {label}
    </div>
  )
}

export function LoadingBox({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-12 text-slate-300" role="status">
      <Spinner /> {label}
    </div>
  )
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-lg border border-red-800 bg-red-950/50 p-6 text-center" role="alert">
      <p className="text-red-200">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-4 rounded bg-red-700 px-4 py-2 font-medium hover:bg-red-600">
          Reintentar
        </button>
      )}
    </div>
  )
}

export function EmptyBox({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-slate-700 p-8 text-center text-slate-400">{children}</div>
}
