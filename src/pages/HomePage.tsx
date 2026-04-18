import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function HomePage() {
  const { t } = useTranslation()
  const { status } = useAuth()
  const isAuthed = status === 'authenticated'

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 py-16">
      <div className="text-center">
        <p className="text-sm font-medium uppercase tracking-wide text-accent">
          {t('app.name')}
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-primary md:text-4xl">
          {t('home.headline')}
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-base text-slate-600">
          {t('home.description')}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {isAuthed ? (
          <Link
            to="/dashboard"
            className="inline-flex rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
          >
            {t('home.openDashboard')}
          </Link>
        ) : (
          <>
            <Link
              to="/login"
              className="inline-flex rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
            >
              {t('auth.loginSubmit')}
            </Link>
            <Link
              to="/register"
              className="inline-flex rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
            >
              {t('auth.registerSubmit')}
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
