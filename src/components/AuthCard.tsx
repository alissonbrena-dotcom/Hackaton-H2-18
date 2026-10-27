import type { ReactNode } from 'react'

export function AuthCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h1 className="mb-1 text-center text-2xl font-bold text-amber-400">⚓ Log Pose Console</h1>
        <h2 className="mb-6 text-center text-slate-300">{title}</h2>
        {children}
      </div>
    </div>
  )
}
