import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { ClientInsert, ClientRow } from '../types/database'

interface ClientsState {
  clients: ClientRow[]
  loading: boolean
  error: string | null
  /** Učitava klijente firme (RLS filtrira po firm_id). */
  fetchClients: (firmId: string) => Promise<void>
  /** Dodaje klijenta i osvežava listu. */
  addClient: (firmId: string, payload: Omit<ClientInsert, 'firm_id'>) => Promise<void>
  /** Ažurira klijenta (RLS). */
  updateClient: (
    firmId: string,
    clientId: string,
    payload: Partial<Omit<ClientInsert, 'firm_id'>>,
  ) => Promise<void>
  reset: () => void
}

export const useClientsStore = create<ClientsState>((set, get) => ({
  clients: [],
  loading: false,
  error: null,

  reset: () => set({ clients: [], loading: false, error: null }),

  fetchClients: async (firmId: string) => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('clients')
      .select(
        'id, firm_id, name, pib, address, contact_email, contact_phone, business_type, services, status, created_at',
      )
      .eq('firm_id', firmId)
      .order('name', { ascending: true })

    if (error) {
      set({ loading: false, error: error.message })
      return
    }

    set({
      clients: (data ?? []) as ClientRow[],
      loading: false,
      error: null,
    })
  },

  addClient: async (firmId: string, payload: Omit<ClientInsert, 'firm_id'>) => {
    set({ error: null })
    const row: ClientInsert = { ...payload, firm_id: firmId }
    const { error } = await supabase.from('clients').insert(row)
    if (error) {
      set({ error: error.message })
      throw error
    }
    await get().fetchClients(firmId)
  },

  updateClient: async (firmId, clientId, payload) => {
    set({ error: null })
    const { error } = await supabase.from('clients').update(payload).eq('id', clientId)
    if (error) {
      set({ error: error.message })
      throw error
    }
    await get().fetchClients(firmId)
  },
}))
