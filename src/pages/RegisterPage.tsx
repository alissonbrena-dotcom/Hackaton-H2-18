import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { ApiError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { getRedirectTarget } from '../auth/RequireAuth'
import { FullScreenLoader } from '../components/StateViews'
import { AuthCard, Field } from './LoginPage'

type FieldName = 'teamName' | 'email' | 'password'
type FieldErrors = Partial<Record<FieldName, string>>

// Traduce el error del servidor al campo que corresponde.
function mapServerError(err: ApiError): { fields: FieldErrors; general: string | null } {
  if (err.code === 'EMAIL_ALREADY_REGISTERED') return { fields: { email: err.message }, general: null }
  if (err.code === 'TEAM_NAME_TAKEN') return { fields: { teamName: err.message }, general: null }
  if (err.code === 'VALIDATION_ERROR' && err.details.length > 0) {
    const fields: FieldErrors = {}
    for (const d of err.details) {
      if (d.field === 'teamName' || d.field === 'email' || d.field === 'password') fields[d.field] = d.message
    }
    if (Object.keys(fields).length > 0) return { fields, general: null }
  }
  return { fields: {}, general: err.message }
}

export function RegisterPage() {
  const { status, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const target = getRedirectTarget(location.state)

  const [teamName, setTeamName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [generalError, setGeneralError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (status === 'checking') return <FullScreenLoader label="Verificando sesión…" />
  if (status === 'authenticated') return <Navigate to={target} replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFieldErrors({})
    setGeneralError(null)
    setSubmitting(true)
    try {
      // El registro devuelve token: entramos directo con la sesión iniciada.
      await register(teamName, email, password)
      navigate(target, { replace: true })
    } catch (err) {
      if (err instanceof ApiError) {
        const mapped = mapServerError(err)
        setFieldErrors(mapped.fields)
        setGeneralError(mapped.general)
      } else {
        setGeneralError('Error inesperado.')
      }
      setSubmitting(false)
    }
  }

  return (
    <AuthCard title="Registrar tripulación">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Field label="Nombre de la tripulación" type="text" value={teamName} onChange={setTeamName} error={fieldErrors.teamName} />
        <Field label="Email" type="email" value={email} onChange={setEmail} error={fieldErrors.email} autoComplete="email" />
        <Field label="Contraseña (mín. 8)" type="password" value={password} onChange={setPassword} error={fieldErrors.password} autoComplete="new-password" />
        {generalError && <p className="text-sm text-red-400" role="alert">{generalError}</p>}
        <button disabled={submitting} className="w-full rounded bg-amber-500 py-2 font-semibold text-slate-950 disabled:opacity-50">
          {submitting ? 'Registrando…' : 'Registrar y zarpar'}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-400">
        ¿Ya tienes cuenta?{' '}
        <Link to="/login" state={location.state} className="text-amber-400 underline">Inicia sesión</Link>
      </p>
    </AuthCard>
  )
}
