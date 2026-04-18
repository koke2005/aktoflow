import { useMemo } from 'react'
import { supabase } from '../lib/supabase'
import type { ClientRow, DocumentTypeRow } from '../types/database'
import type { DocumentWithType, RequirementWithType } from './useDocuments'

/** Tekući obračunski period (kalendarski mesec). */
export function currentMonthPeriod(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  return `${y}-${m}`
}

/**
 * Da li sistemski tip dokumenta važi za klijenta (poslovna pravila iz specifikacije).
 */
export function isSystemSuggestionForClient(
  dt: DocumentTypeRow,
  client: ClientRow,
): boolean {
  if (!dt.is_system) {
    return false
  }
  switch (dt.category) {
    case 'always':
      return true
    case 'pdv_extra':
      return client.services.includes('pdv')
    case 'doo_extra':
      return (
        client.business_type === 'doo' || client.services.includes('godisnji')
      )
    case 'sp_extra':
      return client.business_type === 'sp'
    case 'porez_extra':
      return client.services.includes('porez')
    default:
      return false
  }
}

export type RequirementAnalysisRow = {
  requirement: RequirementWithType
  hasDocument: boolean
  matchingDocument: DocumentWithType | null
}

export function analyzeRequirementsForPeriod(
  requirements: RequirementWithType[],
  documents: DocumentWithType[],
  period: string,
): RequirementAnalysisRow[] {
  return requirements
    .filter((r) => r.is_required && r.document_types)
    .map((requirement) => {
      const match = documents.find(
        (d) =>
          d.document_type_id === requirement.document_type_id && d.period === period,
      )
      return {
        requirement,
        hasDocument: Boolean(match),
        matchingDocument: match ?? null,
      }
    })
}

export function filterSuggestedTypes(
  systemTypes: DocumentTypeRow[],
  client: ClientRow,
  existingRequirementTypeIds: Set<string>,
): DocumentTypeRow[] {
  return systemTypes.filter(
    (dt) =>
      isSystemSuggestionForClient(dt, client) &&
      !existingRequirementTypeIds.has(dt.id),
  )
}

export function useSmartSummary(
  analysis: RequirementAnalysisRow[],
): { received: number; missing: number; total: number } {
  return useMemo(() => {
    let received = 0
    let missing = 0
    for (const row of analysis) {
      if (row.hasDocument) {
        received += 1
      } else {
        missing += 1
      }
    }
    return { received, missing, total: analysis.length }
  }, [analysis])
}

/** Dodaje zahtev za postojeći tip dokumenta. */
export async function addRequirementFromType(
  clientId: string,
  documentTypeId: string,
): Promise<void> {
  const { error } = await supabase.from('client_document_requirements').insert({
    client_id: clientId,
    document_type_id: documentTypeId,
    is_required: true,
    added_by: 'user',
  })
  if (error) {
    throw error
  }
}

/** Kreira nestandardni tip + zahtev. */
export async function addCustomDocumentRequirement(
  clientId: string,
  nameSr: string,
  nameEn: string,
): Promise<void> {
  const trimmedSr = nameSr.trim()
  const trimmedEn = nameEn.trim() || trimmedSr
  if (!trimmedSr) {
    throw new Error('Naziv je obavezan')
  }

  const { data, error: dtError } = await supabase
    .from('document_types')
    .insert({
      name: trimmedSr,
      name_en: trimmedEn,
      category: 'custom',
      is_system: false,
    })
    .select('id')
    .single()

  if (dtError) {
    throw dtError
  }

  const id = data?.id as string
  await addRequirementFromType(clientId, id)
}
