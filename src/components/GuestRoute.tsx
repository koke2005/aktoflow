import { useTranslation } from 'react-i18next'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Spinner } from './Spinner'

/** Rute za neregistrovane: ako je korisnik ulogovan, preusmeri na dashboard. */
export function GuestRoute({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()
  const { status } = useAuth()

  if (status === 'loading') {
    return <Spinner label={t('common.loading')} fullPage />
  }

  if (status === 'authenticated') {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
