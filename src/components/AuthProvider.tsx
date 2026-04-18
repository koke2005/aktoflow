import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

/** Inicijalizuje sesiju i sluša promene (osvežavanje tokena, odjava u drugom tabu). */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((s) => s.initialize)
  const applySession = useAuthStore((s) => s.applySession)

  useEffect(() => {
    void initialize()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void applySession(session)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [initialize, applySession])

  return children
}
