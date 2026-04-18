import { type FormEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function RegisterPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { signUp, authError, clearError } = useAuth()

  const [fullName, setFullName] = useState('')
  const [firmName, setFirmName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false)

  useEffect(() => {
    clearError()
  }, [clearError])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLocalError(null)
    clearError()

    if (password !== passwordConfirm) {
      setLocalError(t('auth.passwordMismatch'))
      return
    }

    if (password.length < 6) {
      setLocalError(t('auth.passwordTooShort'))
      return
    }

    setSubmitting(true)
    try {
      const result = await signUp({
        email,
        password,
        fullName,
        firmName,
      })
      if (result.needsEmailConfirmation) {
        setNeedsEmailConfirmation(true)
        return
      }
      navigate('/dashboard', { replace: true })
    } catch {
      // authError ili throw iz signUp
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
          {t('auth.registerTitle')}
        </h1>

        {needsEmailConfirmation ? (
          <div
            className="mt-8 rounded-xl border border-status-caution bg-amber-50 p-6 text-center text-sm text-slate-800 dark:bg-amber-900/30 dark:text-slate-100"
            role="status"
          >
            {t('auth.confirmEmailHint')}
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="mt-8 space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"
          >
            {(authError || localError) && (
              <p
                className="rounded-lg bg-red-50 px-3 py-2 text-sm text-status-danger"
                role="alert"
              >
                {localError ?? authError}
              </p>
            )}

            <div>
              <label htmlFor="reg-fullname" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                {t('auth.fullName')}
              </label>
              <input
                id="reg-fullname"
                name="fullName"
                type="text"
                autoComplete="name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              />
            </div>

            <div>
              <label htmlFor="reg-firm" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                {t('auth.firmName')}
              </label>
              <input
                id="reg-firm"
                name="firmName"
                type="text"
                required
                value={firmName}
                onChange={(e) => setFirmName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              />
            </div>

            <div>
              <label htmlFor="reg-email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                {t('auth.email')}
              </label>
              <input
                id="reg-email"
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
              <label htmlFor="reg-password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                {t('auth.password')}
              </label>
              <input
                id="reg-password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="reg-password-confirm"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                {t('auth.passwordConfirm')}
              </label>
              <input
                id="reg-password-confirm"
                name="passwordConfirm"
                type="password"
                autoComplete="new-password"
                required
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 flex w-full justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? t('auth.submitting') : t('auth.registerSubmit')}
            </button>
          </form>
        )}

        {!needsEmailConfirmation && (
          <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
            {t('auth.hasAccount')}{' '}
            <Link to="/login" className="font-medium text-accent hover:underline">
              {t('auth.goToLogin')}
            </Link>
          </p>
        )}

        <p className="mt-4 text-center">
          <Link to="/" className="text-sm text-slate-500 hover:text-primary dark:text-slate-400">
            {t('auth.backHome')}
          </Link>
        </p>
      </div>
    </div>
  )
}
