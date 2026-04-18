import { useCallback, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import type { DocumentRow, DocumentTypeRow } from '../types/database'

export type DocumentWithType = DocumentRow & {
  document_types: Pick<DocumentTypeRow, 'id' | 'name' | 'name_en' | 'category'> | null
}

export type RequirementWithType = {
  id: string
  client_id: string
  document_type_id: string
  is_required: boolean
  added_by: 'user' | 'system'
  notes: string | null
  document_types: DocumentTypeRow | null
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_')
}

/**
 * Dokumenti klijenta i zahtjevi; upload u bucket `documents` na putanji firm_id/client_id/ts_ime.
 */
export function useDocuments(clientId: string | undefined) {
  const userId = useAuthStore((s) => s.profile?.id ?? null)
  const firmId = useAuthStore((s) => s.profile?.firm_id ?? null)

  const [documents, setDocuments] = useState<DocumentWithType[]>([])
  const [requirements, setRequirements] = useState<RequirementWithType[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDocuments = useCallback(async () => {
    if (!clientId) {
      setDocuments([])
      return
    }
    setLoading(true)
    setError(null)
    const { data, error: qError } = await supabase
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
      .eq('client_id', clientId)
      .order('uploaded_at', { ascending: false })

    if (qError) {
      setError(qError.message)
      setDocuments([])
    } else {
      setDocuments((data ?? []) as unknown as DocumentWithType[])
    }
    setLoading(false)
  }, [clientId])

  const fetchRequirements = useCallback(async () => {
    if (!clientId) {
      setRequirements([])
      return
    }
    const { data, error: qError } = await supabase
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
      .eq('client_id', clientId)

    if (qError) {
      setError(qError.message)
      setRequirements([])
    } else {
      setRequirements((data ?? []) as unknown as RequirementWithType[])
    }
  }, [clientId])

  const refreshAll = useCallback(async () => {
    await fetchRequirements()
    await fetchDocuments()
  }, [fetchDocuments, fetchRequirements])

  async function uploadDocument(input: {
    documentTypeId: string
    file: File
    period: string
  }): Promise<void> {
    if (!clientId || !firmId || !userId) {
      throw new Error('Nedostaju podaci za upload')
    }
    const safeName = sanitizeFileName(input.file.name)
    const objectPath = `${firmId}/${clientId}/${Date.now()}_${safeName}`

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(objectPath, input.file, { cacheControl: '3600', upsert: false })

    if (uploadError) {
      throw uploadError
    }

    const { error: insertError } = await supabase.from('documents').insert({
      client_id: clientId,
      document_type_id: input.documentTypeId,
      file_url: objectPath,
      file_name: input.file.name,
      uploaded_by: userId,
      period: input.period,
      status: 'received',
    })

    if (insertError) {
      throw insertError
    }

    await refreshAll()
  }

  /** Privremeni signed URL za pregled fajla (bucket je privatan). */
  async function getSignedViewUrl(storagePath: string): Promise<string> {
    const { data, error: signError } = await supabase.storage
      .from('documents')
      .createSignedUrl(storagePath, 3600)
    if (signError || !data?.signedUrl) {
      throw signError ?? new Error('Nema URL-a')
    }
    return data.signedUrl
  }

  return {
    documents,
    requirements,
    loading,
    error,
    fetchDocuments,
    fetchRequirements,
    refreshAll,
    uploadDocument,
    getSignedViewUrl,
  }
}
