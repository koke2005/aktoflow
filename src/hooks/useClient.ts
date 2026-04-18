import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { useClientsStore } from '../store/clientsStore'
import type { ClientInsert, ClientRow } from '../types/database'

/**
 * Jedan klijent po ID-u (RLS dozvoljava samo klijente sopstvene firme).
 */
export function useClient(clientId: string | undefined) {
  const firmId = useAuthStore((s) => s.profile?.firm_id ?? null)
  const updateInStore = useClientsStore((s) => s.updateClient)

  const [client, setClient] = useState<ClientRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!clientId || !firmId) {
      setClient(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const { data, error: qError } = await supabase
      .from('clients')
      .select(
        'id, firm_id, name, pib, address, contact_email, contact_phone, business_type, services, status, created_at',
      )
      .eq('id', clientId)
      .maybeSingle()

    if (qError) {
      setError(qError.message)
      setClient(null)
    } else {
      setClient((data ?? null) as ClientRow | null)
    }
    setLoading(false)
  }, [clientId, firmId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function updateClient(
    payload: Partial<Omit<ClientInsert, 'firm_id'>>,
  ): Promise<void> {
    if (!firmId || !clientId) {
      throw new Error('Nedostaju firm_id ili client_id')
    }
    await updateInStore(firmId, clientId, payload)
    await refresh()
  }

  return { client, loading, error, refresh, updateClient, firmId }
}
