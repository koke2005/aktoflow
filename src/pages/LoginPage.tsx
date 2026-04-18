import { type FormEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { signIn, authError, clearError } = useAuth()

  const from =
    (location.state as { from?: { pathname: string } } | null)?.from
      ?.pathname ?? '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    clearError()
  }, [clearError])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    clearError()
    try {
      await signIn(email, password)
      navigate(from, { replace: true })
    } catch {
      // greška je u authError
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col justify-center bg-slate-50 px-4 py-12 dark:bg-slate-900">
      <div className="mx-auto w-full max-w-md">
        <p className="text-center text-sm font-semibold uppercase tracking-wide text-accent">
          {t('app.name')}
        </p>
        <h1 className="mt-2 text-center text-2xl font-semibold text-primary">
          {t('auth.loginTitle')}
        </h1>

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"
        >
          {authError ? (
            <p
              className="rounded-lg bg-red-50 px-3 py-2 text-sm text-status-danger"
              role="alert"
            >
              {authError}
            </p>
          ) : null}

          <div>
            <label htmlFor="login-email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              {t('auth.email')}
            </label>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            />
          </div>

          <div>
            <label htmlFor="login-password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              {t('auth.password')}
            </label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? t('auth.submitting') : t('auth.loginSubmit')}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
          {t('auth.noAccount')}{' '}
          <Link to="/register" className="font-medium text-accent hover:underline">
            {t('auth.goToRegister')}
          </Link>
        </p>

        <p className="mt-4 text-center">
          <Link to="/" className="text-sm text-slate-500 hover:text-primary dark:text-slate-400">
            {t('auth.backHome')}
          </Link>
        </p>
      </div>
    </div>
  )
}
