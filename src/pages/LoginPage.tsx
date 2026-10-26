import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { ApiError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { getRedirectTarget } from '../auth/RequireAuth'
import { AuthCard } from '../components/AuthCard'
import { FullScreenLoader } from '../components/StateViews'

export function LoginPage() {
  const { status, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const target = getRedirectTarget(location.state)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (status === 'checking') return <FullScreenLoader label="Verificando sesión…" />
  if (status === 'authenticated') return <Navigate to={target} replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(email, password)
      navigate(target, { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error inesperado.')
      setSubmitting(false)
    }
  }

  return (
    <AuthCard title="Iniciar sesión">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
        <Field label="Contraseña" type="password" value={password} onChange={setPassword} autoComplete="current-password" />
        {error && <p className="text-sm text-red-400" role="alert">{error}</p>}
        <button disabled={submitting} className="w-full rounded bg-amber-500 py-2 font-semibold text-slate-950 disabled:opacity-50">
          {submitting ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-400">
        ¿Sin tripulación?{' '}
        <Link to="/register" state={location.state} className="text-amber-400 underline">Regístrala</Link>
      </p>
    </AuthCard>
  )
}

interface FieldProps {
  label: string
  type: string
  value: string
  onChange: (v: string) => void
  error?: string
  autoComplete?: string
}

export function Field({ label, type, value, onChange, error, autoComplete }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-slate-300">{label}</span>
      <input
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        className={`w-full rounded border bg-slate-950 px-3 py-2 outline-none focus:border-amber-400 ${error ? 'border-red-500' : 'border-slate-700'}`}
      />
      {error && <span className="mt-1 block text-sm text-red-400">{error}</span>}
    </label>
  )
}
