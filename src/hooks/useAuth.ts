import { useShallow } from 'zustand/react/shallow'
import { useAuthStore } from '../store/authStore'

/**
 * Hook za autentifikaciju — čita stanje iz Zustand store-a (Supabase sesija + public.users profil).
 */
export function useAuth() {
  return useAuthStore(
    useShallow((s) => ({
      status: s.status,
      session: s.session,
      user: s.user,
      profile: s.profile,
      authError: s.authError,
      signIn: s.signIn,
      signUp: s.signUp,
      signOut: s.signOut,
      clearError: s.clearError,
    })),
  )
}
