import { useCallback, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { useClientsStore } from '../store/clientsStore'
import type { ClientInsert, ClientRow } from '../types/database'

/**
 * Klijenti firme: lista iz Supabase + dodavanje.
 * RLS ograničava SELECT/INSERT na firm_id trenutnog korisnika.
 */
export function useClients() {
  const firmId = useAuthStore((s) => s.profile?.firm_id ?? null)

  const clients = useClientsStore((s) => s.clients)
  const loading = useClientsStore((s) => s.loading)
  const error = useClientsStore((s) => s.error)
  const fetchClients = useClientsStore((s) => s.fetchClients)
  const addClient = useClientsStore((s) => s.addClient)

  const refresh = useCallback(() => {
    if (firmId) {
      void fetchClients(firmId)
    }
  }, [firmId, fetchClients])

  useEffect(() => {
    if (firmId) {
      void fetchClients(firmId)
    }
  }, [firmId, fetchClients])

  async function addClientForFirm(
    payload: Omit<ClientInsert, 'firm_id'>,
  ): Promise<void> {
    if (!firmId) {
      throw new Error('Niste prijavljeni ili nema firm_id')
    }
    await addClient(firmId, payload)
  }

  return {
    firmId,
    clients: clients as ClientRow[],
    loading,
    error,
    refresh,
    fetchClients,
    addClient: addClientForFirm,
  }
}
