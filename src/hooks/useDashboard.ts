import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { currentMonthPeriod } from './useSmartDetector'
import type { DocumentWithType, RequirementWithType } from './useDocuments'

/** Lokalni YYYY-MM-DD (bez UTC pomaka za poređenje sa due_date iz baze). */
function todayISODateLocal(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Dodaje dane na datum (lokalno). */
function addDaysLocal(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + days)
  const yy = dt.getFullYear()
  const mm = `${dt.getMonth() + 1}`.padStart(2, '0')
  const dd = `${dt.getDate()}`.padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

/** Početak dana kao ISO string za poređenje uploaded_at. */
function daysAgoISO(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_')
}

/** Da li postoji primljen dokument za zahtev u datom periodu. */
function hasReceivedDocument(
  documents: DocumentWithType[],
  clientId: string,
  documentTypeId: string,
  period: string,
): boolean {
  return documents.some(
    (d) =>
      d.client_id === clientId &&
      d.document_type_id === documentTypeId &&
      d.period === period &&
      d.status === 'received',
  )
}

export type DashboardDeadlineItem = {
  kind: 'deadline'
  id: string
  clientId: string
  clientName: string
  title: string
  dueDate: string
}

export type DashboardDocumentMissingItem = {
  kind: 'document_missing'
  id: string
  clientId: string
  clientName: string
  documentTypeId: string
  docTitle: string
  docTitleEn: string
  period: string
}

export type DashboardRequirementGapItem = {
  kind: 'requirement_gap'
  requirementId: string
  clientId: string
  clientName: string
  documentTypeId: string
  docTitle: string
  docTitleEn: string
  period: string
}

export type DashboardDoneDeadlineItem = {
  kind: 'deadline_done'
  id: string
  clientId: string
  clientName: string
  title: string
  /** Za prikaz (due_date) */
  dateLabel: string
}

export type DashboardDoneDocumentItem = {
  kind: 'document_done'
  id: string
  clientId: string
  clientName: string
  fileName: string
  docTitle: string
  docTitleEn: string
  dateLabel: string
}

export type MissingGrouped = {
  clientId: string
  clientName: string
  items: DashboardRequirementGapItem[]
}

export type DashboardBuckets = {
  overdue: {
    deadlines: DashboardDeadlineItem[]
    documents: DashboardDocumentMissingItem[]
  }
  soon: {
    deadlines: DashboardDeadlineItem[]
    documents: DashboardDocumentMissingItem[]
  }
  missingGrouped: MissingGrouped[]
  done: {
    deadlines: DashboardDoneDeadlineItem[]
    documents: DashboardDoneDocumentItem[]
  }
}

export type DashboardCounts = {
  overdue: number
  soon: number
  missing: number
  done: number
}

/**
 * Učitava rokove, dokumente i zahteve za firmu i deli ih u četiri kolone (Today Radar).
 * Napomena: za „završene rokove u poslednjih 30 dana” koristimo due_date u poslednjih 30 dana
 * i status=completed (nema completed_at kolone u šemi).
 */
export function useDashboard() {
  const firmId = useAuthStore((s) => s.profile?.firm_id ?? null)
  const userId = useAuthStore((s) => s.profile?.id ?? null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [buckets, setBuckets] = useState<DashboardBuckets | null>(null)

  const buildBuckets = useCallback(
    (
      clientMap: Map<string, string>,
      clientIds: string[],
      deadlinesRaw: {
        id: string
        client_id: string
        title: string
        due_date: string
        status: string
      }[],
      documentsRaw: DocumentWithType[],
      requirementsRaw: RequirementWithType[],
    ): DashboardBuckets => {
      const today = todayISODateLocal()
      const plus7 = addDaysLocal(today, 7)
      const monthPeriod = currentMonthPeriod()
      const dueLowerBound = addDaysLocal(today, -30)

      const deadlines = deadlinesRaw.filter((d) => clientIds.includes(d.client_id))

      const overdueDeadlines: DashboardDeadlineItem[] = []
      const soonDeadlines: DashboardDeadlineItem[] = []

      for (const d of deadlines) {
        const name = clientMap.get(d.client_id) ?? '—'
        if (d.status === 'pending' && d.due_date < today) {
          overdueDeadlines.push({
            kind: 'deadline',
            id: d.id,
            clientId: d.client_id,
            clientName: name,
            title: d.title,
            dueDate: d.due_date,
          })
        } else if (
          d.status === 'pending' &&
          d.due_date >= today &&
          d.due_date <= plus7
        ) {
          soonDeadlines.push({
            kind: 'deadline',
            id: d.id,
            clientId: d.client_id,
            clientName: name,
            title: d.title,
            dueDate: d.due_date,
          })
        }
      }

      const overdueDocs: DashboardDocumentMissingItem[] = []
      const soonDocs: DashboardDocumentMissingItem[] = []

      for (const doc of documentsRaw) {
        if (doc.status !== 'missing') {
          continue
        }
        const dt = doc.document_types
        const title = dt ? dt.name : doc.file_name
        const titleEn = dt?.name_en ?? title
        const name = clientMap.get(doc.client_id) ?? '—'
        const item: DashboardDocumentMissingItem = {
          kind: 'document_missing',
          id: doc.id,
          clientId: doc.client_id,
          clientName: name,
          documentTypeId: doc.document_type_id,
          docTitle: title,
          docTitleEn: titleEn,
          period: doc.period,
        }
        if (doc.period < monthPeriod) {
          overdueDocs.push(item)
        } else if (doc.period === monthPeriod) {
          soonDocs.push(item)
        }
      }

      const gapItems: DashboardRequirementGapItem[] = []
      for (const req of requirementsRaw) {
        if (!req.is_required || !req.document_types) {
          continue
        }
        const cid = req.client_id
        if (!clientIds.includes(cid)) {
          continue
        }
        if (
          hasReceivedDocument(
            documentsRaw,
            cid,
            req.document_type_id,
            monthPeriod,
          )
        ) {
          continue
        }
        const dt = req.document_types
        gapItems.push({
          kind: 'requirement_gap',
          requirementId: req.id,
          clientId: cid,
          clientName: clientMap.get(cid) ?? '—',
          documentTypeId: req.document_type_id,
          docTitle: dt.name,
          docTitleEn: dt.name_en,
          period: monthPeriod,
        })
      }

      const groupMap = new Map<string, MissingGrouped>()
      for (const g of gapItems) {
        const existing = groupMap.get(g.clientId)
        if (existing) {
          existing.items.push(g)
        } else {
          groupMap.set(g.clientId, {
            clientId: g.clientId,
            clientName: g.clientName,
            items: [g],
          })
        }
      }
      const missingGrouped = Array.from(groupMap.values()).sort((a, b) =>
        a.clientName.localeCompare(b.clientName, 'sr'),
      )

      const doneDeadlines: DashboardDoneDeadlineItem[] = []
      for (const d of deadlines) {
        if (d.status !== 'completed') {
          continue
        }
        if (d.due_date < dueLowerBound || d.due_date > today) {
          continue
        }
        doneDeadlines.push({
          kind: 'deadline_done',
          id: d.id,
          clientId: d.client_id,
          clientName: clientMap.get(d.client_id) ?? '—',
          title: d.title,
          dateLabel: d.due_date,
        })
      }

      const cutoffIso = daysAgoISO(30)
      const doneDocuments: DashboardDoneDocumentItem[] = []
      for (const doc of documentsRaw) {
        if (doc.status !== 'received') {
          continue
        }
        if (doc.uploaded_at < cutoffIso) {
          continue
        }
        const dt = doc.document_types
        doneDocuments.push({
          kind: 'document_done',
          id: doc.id,
          clientId: doc.client_id,
          clientName: clientMap.get(doc.client_id) ?? '—',
          fileName: doc.file_name,
          docTitle: dt?.name ?? doc.file_name,
          docTitleEn: dt?.name_en ?? doc.file_name,
          dateLabel: doc.uploaded_at.slice(0, 10),
        })
      }

      return {
        overdue: { deadlines: overdueDeadlines, documents: overdueDocs },
        soon: { deadlines: soonDeadlines, documents: soonDocs },
        missingGrouped,
        done: { deadlines: doneDeadlines, documents: doneDocuments },
      }
    },
    [],
  )

  const load = useCallback(async () => {
    if (!firmId) {
      setBuckets(null)
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
      setLoading(false)
      return
    }

    const clients = (clientRows ?? []) as { id: string; name: string }[]
    const clientMap = new Map(clients.map((c) => [c.id, c.name]))
    const clientIds = clients.map((c) => c.id)

    if (clientIds.length === 0) {
      setBuckets({
        overdue: { deadlines: [], documents: [] },
        soon: { deadlines: [], documents: [] },
        missingGrouped: [],
        done: { deadlines: [], documents: [] },
      })
      setLoading(false)
      return
    }

    const [dlRes, docRes, reqRes] = await Promise.all([
      supabase
        .from('deadlines')
        .select('id, client_id, title, due_date, status')
        .in('client_id', clientIds),
      supabase
        .from('documents')
        .select(
          `
          id,
          client_id,
          document_type_id,
          file_url,
          file_name,
          uploaded_by,
          uploaded_at,
          period,
          status,
          document_types ( id, name, name_en, category, is_system )
        `,
        )
        .in('client_id', clientIds),
      supabase
        .from('client_document_requirements')
        .select(
          `
          id,
          client_id,
          document_type_id,
          is_required,
          added_by,
          notes,
          document_types ( id, name, name_en, category, is_system )
        `,
        )
        .in('client_id', clientIds),
    ])

    if (dlRes.error) {
      setError(dlRes.error.message)
      setLoading(false)
      return
    }
    if (docRes.error) {
      setError(docRes.error.message)
      setLoading(false)
      return
    }
    if (reqRes.error) {
      setError(reqRes.error.message)
      setLoading(false)
      return
    }

    const documentsRaw = (docRes.data ?? []) as unknown as DocumentWithType[]
    const requirementsRaw = (reqRes.data ?? []) as unknown as RequirementWithType[]

    const next = buildBuckets(
      clientMap,
      clientIds,
      (dlRes.data ?? []) as {
        id: string
        client_id: string
        title: string
        due_date: string
        status: string
      }[],
      documentsRaw,
      requirementsRaw,
    )
    setBuckets(next)
    setLoading(false)
  }, [firmId, buildBuckets])

  useEffect(() => {
    void load()
  }, [load])

  const counts: DashboardCounts = useMemo(() => {
    if (!buckets) {
      return { overdue: 0, soon: 0, missing: 0, done: 0 }
    }
    const overdueCount =
      buckets.overdue.deadlines.length + buckets.overdue.documents.length
    const soonCount = buckets.soon.deadlines.length + buckets.soon.documents.length
    const missingCount = buckets.missingGrouped.reduce(
      (acc, g) => acc + g.items.length,
      0,
    )
    const doneCount =
      buckets.done.deadlines.length + buckets.done.documents.length
    return {
      overdue: overdueCount,
      soon: soonCount,
      missing: missingCount,
      done: doneCount,
    }
  }, [buckets])

  async function completeDeadline(deadlineId: string): Promise<void> {
    const { error: uErr } = await supabase
      .from('deadlines')
      .update({ status: 'completed' })
      .eq('id', deadlineId)
    if (uErr) {
      throw uErr
    }
    await load()
  }

  async function uploadForRequirement(input: {
    clientId: string
    documentTypeId: string
    period: string
    file: File
  }): Promise<void> {
    if (!firmId || !userId) {
      throw new Error('Niste prijavljeni')
    }
    const safeName = sanitizeFileName(input.file.name)
    const objectPath = `${firmId}/${input.clientId}/${Date.now()}_${safeName}`

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(objectPath, input.file, { cacheControl: '3600', upsert: false })

    if (uploadError) {
      throw uploadError
    }

    const { error: insError } = await supabase.from('documents').insert({
      client_id: input.clientId,
      document_type_id: input.documentTypeId,
      file_url: objectPath,
      file_name: input.file.name,
      uploaded_by: userId,
      period: input.period,
      status: 'received',
    })

    if (insError) {
      throw insError
    }

    await load()
  }

  return {
    loading,
    error,
    buckets,
    counts,
    refresh: load,
    completeDeadline,
    uploadForRequirement,
  }
}
