import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import type { DeadlineRow, DeadlineStatus, DeadlineType } from '../types/database'

/**
 * Rokovi za jednog klijenta: CRUD preko Supabase (RLS).
 */
export function useDeadlines(clientId: string | undefined) {
  const profile = useAuthStore((s) => s.profile)

  const [deadlines, setDeadlines] = useState<DeadlineRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [firmPlan, setFirmPlan] = useState<'solo' | 'team' | 'agency' | null>(null)
  const [teamMembers, setTeamMembers] = useState<{ id: string; full_name: string; email: string }[]>(
    [],
  )

  const fetchFirmMeta = useCallback(async () => {
    if (!profile?.firm_id) {
      setFirmPlan(null)
      setTeamMembers([])
      return
    }
    const { data: firm } = await supabase
      .from('firms')
      .select('plan')
      .eq('id', profile.firm_id)
      .maybeSingle()
    setFirmPlan((firm?.plan as 'solo' | 'team' | 'agency') ?? 'solo')

    if (firm?.plan === 'team' || firm?.plan === 'agency') {
      const { data: users } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('firm_id', profile.firm_id)
        .order('full_name')
      setTeamMembers((users ?? []) as { id: string; full_name: string; email: string }[])
    } else {
      setTeamMembers([])
    }
  }, [profile?.firm_id])

  const fetchDeadlines = useCallback(async () => {
    if (!clientId) {
      setDeadlines([])
      return
    }
    setLoading(true)
    setError(null)
    const { data, error: qError } = await supabase
      .from('deadlines')
      .select(
        'id, client_id, title, due_date, type, status, assigned_to, notes, created_at',
      )
      .eq('client_id', clientId)
      .order('due_date', { ascending: true })

    if (qError) {
      setError(qError.message)
      setDeadlines([])
    } else {
      setDeadlines((data ?? []) as DeadlineRow[])
    }
    setLoading(false)
  }, [clientId])

  async function addDeadline(input: {
    title: string
    dueDate: string
    type: DeadlineType
    notes?: string | null
    assignedTo?: string | null
  }): Promise<void> {
    if (!clientId) {
      throw new Error('Nema client_id')
    }
    const canAssign =
      (firmPlan === 'team' || firmPlan === 'agency') && input.assignedTo
    const { error: insError } = await supabase.from('deadlines').insert({
      client_id: clientId,
      title: input.title.trim(),
      due_date: input.dueDate,
      type: input.type,
      status: 'pending',
      notes: input.notes?.trim() || null,
      assigned_to: canAssign ? input.assignedTo : null,
    })
    if (insError) {
      throw insError
    }
    await fetchDeadlines()
  }

  async function updateDeadlineStatus(id: string, status: DeadlineStatus): Promise<void> {
    const { error: upError } = await supabase.from('deadlines').update({ status }).eq('id', id)
    if (upError) {
      throw upError
    }
    await fetchDeadlines()
  }

  return {
    deadlines,
    loading,
    error,
    firmPlan,
    teamMembers,
    fetchDeadlines,
    fetchFirmMeta,
    addDeadline,
    updateDeadlineStatus,
  }
}

/** Rok sa imenom klijenta (JOIN preko client_id). */
export type DeadlineWithClient = DeadlineRow & {
  client_name: string
  assigned_name: string | null
}

/**
 * Vizuelni status za badge: zakašnjeli pending tretiramo kao overdue.
 */
export function deriveDeadlineVisualStatus(
  row: DeadlineRow,
  today: string,
): 'pending' | 'overdue' | 'completed' {
  if (row.status === 'completed') {
    return 'completed'
  }
  if (row.due_date < today) {
    return 'overdue'
  }
  return 'pending'
}

/**
 * Svi rokovi firme (lista klijenata → IN client_id), sa imenom klijenta.
 * Za stranicu /deadlines.
 */
export function useFirmDeadlines() {
  const profile = useAuthStore((s) => s.profile)
  const firmId = profile?.firm_id ?? null

  const [deadlines, setDeadlines] = useState<DeadlineWithClient[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAllDeadlines = useCallback(async () => {
    if (!firmId) {
      setDeadlines([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)

    const { data: clientRows, error: cErr } = await supabase
      .from('clients')
      .select('id, name')
      .eq('firm_id', firmId)
      .eq('status', 'active')

    if (cErr) {
      setError(cErr.message)
      setDeadlines([])
      setLoading(false)
      return
    }

    const clients = (clientRows ?? []) as { id: string; name: string }[]
    const nameById = new Map(clients.map((c) => [c.id, c.name]))
    const clientIds = clients.map((c) => c.id)

    if (clientIds.length === 0) {
      setDeadlines([])
      setLoading(false)
      return
    }

    const { data: userRows } = await supabase
      .from('users')
      .select('id, full_name')
      .eq('firm_id', firmId)
    const userNameById = new Map(
      ((userRows ?? []) as { id: string; full_name: string }[]).map((u) => [
        u.id,
        u.full_name,
      ]),
    )

    const { data, error: qError } = await supabase
      .from('deadlines')
      .select(
        'id, client_id, title, due_date, type, status, assigned_to, notes, created_at',
      )
      .in('client_id', clientIds)
      .order('due_date', { ascending: true })

    if (qError) {
      setError(qError.message)
      setDeadlines([])
    } else {
      const rows = (data ?? []) as DeadlineRow[]
      setDeadlines(
        rows.map((r) => ({
          ...r,
          client_name: nameById.get(r.client_id) ?? '—',
          assigned_name: r.assigned_to
            ? userNameById.get(r.assigned_to) ?? '—'
            : null,
        })),
      )
    }
    setLoading(false)
  }, [firmId])

  useEffect(() => {
    void fetchAllDeadlines()
  }, [fetchAllDeadlines])

  async function deleteDeadline(id: string): Promise<void> {
    const { error: dErr } = await supabase.from('deadlines').delete().eq('id', id)
    if (dErr) {
      throw dErr
    }
    await fetchAllDeadlines()
  }

  async function addFirmDeadline(input: {
    clientId: string
    title: string
    dueDate: string
    type: DeadlineType
    notes?: string | null
    assignedTo?: string | null
  }): Promise<void> {
    const { data: firm } = await supabase
      .from('firms')
      .select('plan')
      .eq('id', firmId ?? '')
      .maybeSingle()
    const plan = firm?.plan as 'solo' | 'team' | 'agency' | undefined
    const canAssign =
      (plan === 'team' || plan === 'agency') && input.assignedTo

    const { error: insError } = await supabase.from('deadlines').insert({
      client_id: input.clientId,
      title: input.title.trim(),
      due_date: input.dueDate,
      type: input.type,
      status: 'pending',
      notes: input.notes?.trim() ?? null,
      assigned_to: canAssign ? input.assignedTo : null,
    })
    if (insError) {
      throw insError
    }
    await fetchAllDeadlines()
  }

  async function updateDeadlineStatus(id: string, status: DeadlineStatus): Promise<void> {
    const { error: upError } = await supabase.from('deadlines').update({ status }).eq('id', id)
    if (upError) {
      throw upError
    }
    await fetchAllDeadlines()
  }

  return {
    deadlines,
    loading,
    error,
    firmId,
    fetchAllDeadlines,
    deleteDeadline,
    addFirmDeadline,
    updateDeadlineStatus,
  }
}

