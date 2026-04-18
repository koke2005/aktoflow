import { useTranslation } from 'react-i18next'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

/** Zaštita ruta: samo ulogovani korisnik; tokom učitavanja sesije prikazuje spinner. */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-50">
        <div
          className="size-10 animate-spin rounded-full border-2 border-primary border-t-transparent"
          aria-hidden
        />
        <span className="sr-only">{t('common.loading')}</span>
      </div>
    )
  }

  if (status === 'anonymous') {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}
