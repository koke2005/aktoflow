import { useTranslation } from 'react-i18next'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

/** Rute za neregistrovane: ako je korisnik ulogovan, preusmeri na dashboard. */
export function GuestRoute({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()
  const { status } = useAuth()

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

  if (status === 'authenticated') {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
