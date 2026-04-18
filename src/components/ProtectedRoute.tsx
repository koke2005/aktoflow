import { useTranslation } from 'react-i18next'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Spinner } from './Spinner'

/** Zaštita ruta: samo ulogovani korisnik; tokom učitavanja sesije prikazuje spinner. */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return <Spinner label={t('common.loading')} fullPage />
  }

  if (status === 'anonymous') {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}
