import type { Session, User } from '@supabase/supabase-js'
import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { AppUserRow } from '../types/database'

export type AuthStatus = 'loading' | 'anonymous' | 'authenticated'

interface AuthState {
  status: AuthStatus
  session: Session | null
  user: User | null
  profile: AppUserRow | null
  authError: string | null
  /** Sinhronizacija stanja iz Supabase sesije (uključujući listener). */
  applySession: (session: Session | null) => Promise<void>
  /** Jednokratna inicijalizacija sesije pri učitavanju aplikacije */
  initialize: () => Promise<void>
  /** Prijava email/lozinka */
  signIn: (email: string, password: string) => Promise<void>
  /**
   * Registracija: auth.signUp zatim INSERT firms + public.users (RLS).
   * Za potpun flow potrebna je sesija odmah nakon signUp (isključiti email potvrdu u dev Supabase).
   */
  signUp: (input: {
    email: string
    password: string
    fullName: string
    firmName: string
  }) => Promise<{ needsEmailConfirmation: boolean }>
  signOut: () => Promise<void>
  /** Ponovo učitaj profil iz public.users */
  loadProfile: () => Promise<void>
  clearError: () => void
}

async function fetchProfileRow(userId: string): Promise<AppUserRow | null> {
  const { data, error } = await supabase
    .from('users')
    .select(
      'id, email, full_name, role, firm_id, created_at',
    )
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    console.error('fetchProfileRow', error)
    return null
  }
  return data as AppUserRow | null
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'loading',
  session: null,
  user: null,
  profile: null,
  authError: null,

  clearError: () => set({ authError: null }),

  applySession: async (session) => {
    if (!session?.user) {
      set({
        status: 'anonymous',
        session: null,
        user: null,
        profile: null,
      })
      return
    }
    const profile = await fetchProfileRow(session.user.id)
    set({
      status: 'authenticated',
      session,
      user: session.user,
      profile,
    })
  },

  loadProfile: async () => {
    const uid = get().user?.id
    if (!uid) {
      set({ profile: null })
      return
    }
    const row = await fetchProfileRow(uid)
    set({ profile: row })
  },

  initialize: async () => {
    set({ status: 'loading', authError: null })
    const {
      data: { session },
    } = await supabase.auth.getSession()
    await get().applySession(session)
  },

  signIn: async (email, password) => {
    set({ authError: null })
    const normalized = email.trim().toLowerCase()
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalized,
      password,
    })
    if (error) {
      set({ authError: error.message })
      throw error
    }
    if (!data.session) {
      const err = new Error('No session returned from sign in')
      set({ authError: err.message })
      throw err
    }
    await get().applySession(data.session)
  },

  signUp: async ({ email, password, fullName, firmName }) => {
    set({ authError: null })
    const normalizedEmail = email.trim().toLowerCase()
    const trimmedFirm = firmName.trim()
    const trimmedName = fullName.trim()

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: { full_name: trimmedName },
      },
    })

    if (error) {
      set({ authError: error.message })
      throw error
    }

    const session = data.session
    const newUser = data.user

    if (!session || !newUser) {
      return { needsEmailConfirmation: true }
    }

    const ownerId = newUser.id

    const { data: firmRow, error: firmError } = await supabase
      .from('firms')
      .insert({
        name: trimmedFirm,
        owner_id: ownerId,
        plan: 'solo',
      })
      .select('id')
      .single()

    if (firmError) {
      set({ authError: firmError.message })
      throw firmError
    }

    const firmId = firmRow.id as string

    const { error: userError } = await supabase.from('users').insert({
      id: ownerId,
      email: normalizedEmail,
      full_name: trimmedName,
      role: 'solo',
      firm_id: firmId,
    })

    if (userError) {
      set({ authError: userError.message })
      throw userError
    }

    await get().applySession(session)

    return { needsEmailConfirmation: false }
  },

  signOut: async () => {
    set({ authError: null })
    await supabase.auth.signOut()
    set({
      status: 'anonymous',
      session: null,
      user: null,
      profile: null,
    })
  },
}))
