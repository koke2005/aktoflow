/** Minimalne TypeScript definicije za Supabase tabele (proširuj po potrebi). */

export type UserRole = 'solo' | 'team_member' | 'admin'

export type FirmPlan = 'solo' | 'team' | 'agency'

export interface FirmRow {
  id: string
  name: string
  plan: FirmPlan
  owner_id: string
  created_at: string
}

export interface AppUserRow {
  id: string
  email: string
  full_name: string
  role: UserRole
  firm_id: string
  created_at: string
}

export type FirmInsert = Pick<FirmRow, 'name' | 'owner_id'> & {
  plan?: FirmPlan
}

export type AppUserInsert = Pick<
  AppUserRow,
  'id' | 'email' | 'full_name' | 'firm_id'
> & {
  role?: UserRole
}

export type BusinessType = 'doo' | 'sp' | 'other'

export type ServiceType = 'pdv' | 'porez' | 'godisnji' | 'ostalo'

export type ClientStatus = 'active' | 'inactive'

export interface ClientRow {
  id: string
  firm_id: string
  name: string
  pib: string | null
  address: string | null
  contact_email: string | null
  contact_phone: string | null
  business_type: BusinessType
  services: ServiceType[]
  status: ClientStatus
  created_at: string
}

export type ClientInsert = {
  firm_id: string
  name: string
  pib: string
  address?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  business_type: BusinessType
  services: ServiceType[]
  status: ClientStatus
}

export interface DocumentTypeRow {
  id: string
  name: string
  name_en: string
  category: string
  is_system: boolean
}

export type DocumentStatus = 'received' | 'missing'

export interface DocumentRow {
  id: string
  client_id: string
  document_type_id: string
  file_url: string
  file_name: string
  uploaded_by: string
  uploaded_at: string
  period: string
  status: DocumentStatus
}

export interface ClientDocumentRequirementRow {
  id: string
  client_id: string
  document_type_id: string
  is_required: boolean
  added_by: 'user' | 'system'
  notes: string | null
}

export type DeadlineType = 'pdv' | 'porez' | 'godisnji' | 'custom'

export type DeadlineStatus = 'pending' | 'overdue' | 'completed'

export interface DeadlineRow {
  id: string
  client_id: string
  title: string
  due_date: string
  type: DeadlineType
  status: DeadlineStatus
  assigned_to: string | null
  notes: string | null
  created_at: string
}
