import { Calendar, Check, FileText, FileUp, Sparkles, X } from 'lucide-react'
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Modal } from '../components/Modal'
import { Tabs } from '../components/Tabs'
import { useClient } from '../hooks/useClient'
import { useDeadlines } from '../hooks/useDeadlines'
import { useDocuments } from '../hooks/useDocuments'
import {
  addCustomDocumentRequirement,
  addRequirementFromType,
  analyzeRequirementsForPeriod,
  currentMonthPeriod,
  filterSuggestedTypes,
  useSmartSummary,
} from '../hooks/useSmartDetector'
import { supabase } from '../lib/supabase'
import { useToastStore } from '../store/toastStore'
import type { BusinessType, ClientStatus, DeadlineType, DocumentTypeRow, ServiceType } from '../types/database'

const PIB_REGEX = /^\d{9,13}$/

function serviceClass(s: ServiceType): string {
  switch (s) {
    case 'pdv':
      return 'bg-blue-100 text-blue-800'
    case 'porez':
      return 'bg-purple-100 text-purple-800'
    case 'godisnji':
      return 'bg-emerald-100 text-emerald-800'
    case 'ostalo':
      return 'bg-slate-100 text-slate-700'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

export function ClientDetailPage() {
  const { t, i18n } = useTranslation()
  const { clientId } = useParams<{ clientId: string }>()
  const navigate = useNavigate()
  const toast = useToastStore((s) => s.show)

  const { client, loading: clientLoading, error: clientError, updateClient } = useClient(clientId)

  const {
    documents,
    requirements,
    loading: docLoading,
    refreshAll,
    uploadDocument,
    getSignedViewUrl,
  } = useDocuments(clientId)

  const {
    deadlines,
    loading: dlLoading,
    fetchDeadlines,
    fetchFirmMeta,
    addDeadline,
    updateDeadlineStatus,
    firmPlan,
    teamMembers,
  } = useDeadlines(clientId)

  const [tab, setTab] = useState<
    'overview' | 'documents' | 'deadlines' | 'smart'
  >('overview')

  const [systemTypes, setSystemTypes] = useState<DocumentTypeRow[]>([])
  const [editOpen, setEditOpen] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadTypeId, setUploadTypeId] = useState<string | null>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadPeriod, setUploadPeriod] = useState(currentMonthPeriod())
  const [uploading, setUploading] = useState(false)

  const [customOpen, setCustomOpen] = useState(false)
  const [customNameSr, setCustomNameSr] = useState('')
  const [customNameEn, setCustomNameEn] = useState('')

  const [dlTitle, setDlTitle] = useState('')
  const [dlDate, setDlDate] = useState('')
  const [dlType, setDlType] = useState<DeadlineType>('pdv')
  const [dlNotes, setDlNotes] = useState('')
  const [dlAssign, setDlAssign] = useState<string>('')
  const [dlSubmitting, setDlSubmitting] = useState(false)

  const period = currentMonthPeriod()
  const analysisRows = useMemo(
    () => analyzeRequirementsForPeriod(requirements, documents, period),
    [requirements, documents, period],
  )
  const summary = useSmartSummary(analysisRows)

  const existingReqTypeIds = useMemo(
    () => new Set(requirements.map((r) => r.document_type_id)),
    [requirements],
  )

  const suggestedTypes = useMemo(() => {
    if (!client) {
      return []
    }
    return filterSuggestedTypes(systemTypes, client, existingReqTypeIds)
  }, [systemTypes, client, existingReqTypeIds])

  useEffect(() => {
    void refreshAll()
  }, [refreshAll])

  useEffect(() => {
    void fetchDeadlines()
    void fetchFirmMeta()
  }, [fetchDeadlines, fetchFirmMeta])

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from('document_types').select('*').eq('is_system', true)
      setSystemTypes((data ?? []) as DocumentTypeRow[])
    })()
  }, [])

  const docName = useCallback(
    (dt: Pick<DocumentTypeRow, 'name' | 'name_en'> | null | undefined) => {
      if (!dt) {
        return '—'
      }
      return i18n.language === 'en' ? dt.name_en : dt.name
    },
    [i18n.language],
  )

  async function openView(storagePath: string) {
    try {
      const url = await getSignedViewUrl(storagePath)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch {
      toast('error', t('clientDetail.documents.viewError'))
    }
  }

  async function handleUpload(e: FormEvent) {
    e.preventDefault()
    if (!uploadTypeId || !uploadFile) {
      return
    }
    setUploading(true)
    try {
      await uploadDocument({
        documentTypeId: uploadTypeId,
        file: uploadFile,
        period: uploadPeriod,
      })
      toast('success', t('clientDetail.documents.uploadSuccess'))
      setUploadOpen(false)
      setUploadFile(null)
      setUploadTypeId(null)
    } catch {
      toast('error', t('clientDetail.documents.uploadError'))
    } finally {
      setUploading(false)
    }
  }

  async function onAddSuggestion(dt: DocumentTypeRow) {
    if (!clientId) {
      return
    }
    try {
      await addRequirementFromType(clientId, dt.id)
      toast('success', t('clientDetail.smart.addedReq'))
      await refreshAll()
    } catch {
      toast('error', t('clientDetail.smart.addReqError'))
    }
  }

  async function onAddCustom(e: FormEvent) {
    e.preventDefault()
    if (!clientId) {
      return
    }
    try {
      await addCustomDocumentRequirement(clientId, customNameSr, customNameEn)
      toast('success', t('clientDetail.smart.addedCustom'))
      setCustomOpen(false)
      setCustomNameSr('')
      setCustomNameEn('')
      await refreshAll()
    } catch {
      toast('error', t('clientDetail.smart.addCustomError'))
    }
  }

  async function onAddDeadline(e: FormEvent) {
    e.preventDefault()
    setDlSubmitting(true)
    try {
      await addDeadline({
        title: dlTitle,
        dueDate: dlDate,
        type: dlType,
        notes: dlNotes || null,
        assignedTo:
          firmPlan === 'team' || firmPlan === 'agency' ? dlAssign || null : null,
      })
      toast('success', t('clientDetail.deadlines.addSuccess'))
      setDlTitle('')
      setDlDate('')
      setDlNotes('')
      setDlAssign('')
    } catch {
      toast('error', t('clientDetail.deadlines.addError'))
    } finally {
      setDlSubmitting(false)
    }
  }

  const tabItems = useMemo(
    () => [
      { id: 'overview', label: t('clientDetail.tabs.overview') },
      { id: 'documents', label: t('clientDetail.tabs.documents') },
      { id: 'deadlines', label: t('clientDetail.tabs.deadlines') },
      { id: 'smart', label: t('clientDetail.tabs.smart') },
    ],
    [t],
  )

  if (clientLoading || !clientId) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="size-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (clientError || !client) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800">
        {clientError ?? t('clientDetail.notFound')}
        <button
          type="button"
          onClick={() => navigate('/clients')}
          className="mt-4 text-sm font-medium underline"
        >
          {t('clientDetail.backToList')}
        </button>
      </div>
    )
  }

  return (
    <div>
      <nav className="text-sm text-slate-600">
        <Link to="/clients" className="text-accent hover:underline">
          {t('nav.clients')}
        </Link>
        <span className="mx-2 text-slate-400">/</span>
        <span className="font-medium text-slate-900">{client.name}</span>
      </nav>

      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">{client.name}</h1>
          <p className="mt-1 text-sm text-slate-500">PIB: {client.pib ?? '—'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {client.services.map((s) => (
            <span
              key={s}
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${serviceClass(s)}`}
            >
              {t(`clients.servicesShort.${s}`)}
            </span>
          ))}
          <span
            className={
              client.status === 'active'
                ? 'rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800'
                : 'rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600'
            }
          >
            {t(`clients.status.${client.status}`)}
          </span>
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-primary hover:bg-slate-50"
          >
            {t('clientDetail.edit')}
          </button>
        </div>
      </div>

      <div className="mt-8">
        <Tabs tabs={tabItems} active={tab} onChange={(id) => setTab(id as typeof tab)} />

        {tab === 'overview' && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-500">
                {t('clientDetail.overview.basic')}
              </h3>
              <dl className="mt-3 space-y-2 text-sm">
                <div>
                  <dt className="text-slate-500">{t('clients.form.name')}</dt>
                  <dd className="font-medium">{client.name}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">{t('clients.col.pib')}</dt>
                  <dd>{client.pib ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">{t('clients.form.address')}</dt>
                  <dd>{client.address ?? '—'}</dd>
                </div>
              </dl>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-500">
                {t('clientDetail.overview.contact')}
              </h3>
              <dl className="mt-3 space-y-2 text-sm">
                <div>
                  <dt className="text-slate-500">{t('clients.form.contactEmail')}</dt>
                  <dd>{client.contact_email ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">{t('clients.form.contactPhone')}</dt>
                  <dd>{client.contact_phone ?? '—'}</dd>
                </div>
              </dl>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-500">
                {t('clientDetail.overview.typeServices')}
              </h3>
              <p className="mt-2 text-sm">
                {t(`clients.businessType.${client.business_type}`)}
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {client.services.map((s) => (
                  <span key={s} className={`rounded px-2 py-0.5 text-xs ${serviceClass(s)}`}>
                    {t(`clients.services.${s}`)}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-500">
                {t('clientDetail.overview.meta')}
              </h3>
              <dl className="mt-3 space-y-2 text-sm">
                <div>
                  <dt className="text-slate-500">{t('clients.col.status')}</dt>
                  <dd>{t(`clients.status.${client.status}`)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">{t('clientDetail.overview.created')}</dt>
                  <dd>{new Date(client.created_at).toLocaleDateString()}</dd>
                </div>
              </dl>
            </div>
          </div>
        )}

        {tab === 'documents' && (
          <div className="mt-6 space-y-4">
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setTab('smart')}
                className="text-sm font-medium text-accent hover:underline"
              >
                {t('clientDetail.documents.goSmart')}
              </button>
            </div>
            {docLoading ? (
              <p className="text-slate-500">{t('common.loading')}</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full min-w-[800px] text-left text-sm">
                  <thead className="border-b bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-3 py-2">{t('clientDetail.documents.col.type')}</th>
                      <th className="px-3 py-2">{t('clientDetail.documents.col.period')}</th>
                      <th className="px-3 py-2">{t('clientDetail.documents.col.status')}</th>
                      <th className="px-3 py-2">{t('clientDetail.documents.col.uploaded')}</th>
                      <th className="px-3 py-2">{t('clients.col.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requirements.map((req) => {
                      const dt = req.document_types
                      const docForPeriod = documents.find(
                        (d) =>
                          d.document_type_id === req.document_type_id && d.period === period,
                      )
                      return (
                        <tr key={req.id} className="border-b border-slate-100">
                          <td className="px-3 py-2 font-medium">{docName(dt)}</td>
                          <td className="px-3 py-2">{period}</td>
                          <td className="px-3 py-2">
                            {docForPeriod ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600">
                                <Check className="size-4" /> {t('clientDetail.documents.received')}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-red-600">
                                <X className="size-4" /> {t('clientDetail.documents.missing')}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-slate-600">
                            {docForPeriod
                              ? new Date(docForPeriod.uploaded_at).toLocaleString()
                              : '—'}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setUploadTypeId(req.document_type_id)
                                  setUploadPeriod(period)
                                  setUploadOpen(true)
                                }}
                                className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
                              >
                                <FileUp className="size-4" />
                                {t('clientDetail.documents.upload')}
                              </button>
                              {docForPeriod ? (
                                <button
                                  type="button"
                                  onClick={() => void openView(docForPeriod.file_url)}
                                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                                >
                                  <FileText className="size-4" />
                                  {t('clientDetail.documents.view')}
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 'deadlines' && (
          <div className="mt-6 space-y-8">
            <form
              onSubmit={onAddDeadline}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <h3 className="text-sm font-semibold text-primary">
                {t('clientDetail.deadlines.addTitle')}
              </h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-600">
                    {t('clientDetail.deadlines.title')} *
                  </label>
                  <input
                    required
                    value={dlTitle}
                    onChange={(e) => setDlTitle(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600">
                    {t('clientDetail.deadlines.due')} *
                  </label>
                  <input
                    type="date"
                    required
                    value={dlDate}
                    onChange={(e) => setDlDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600">
                    {t('clientDetail.deadlines.type')} *
                  </label>
                  <select
                    value={dlType}
                    onChange={(e) => setDlType(e.target.value as DeadlineType)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  >
                    <option value="pdv">{t('clientDetail.deadlineTypes.pdv')}</option>
                    <option value="porez">{t('clientDetail.deadlineTypes.porez')}</option>
                    <option value="godisnji">{t('clientDetail.deadlineTypes.godisnji')}</option>
                    <option value="custom">{t('clientDetail.deadlineTypes.ostalo')}</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-600">
                    {t('clientDetail.deadlines.notes')}
                  </label>
                  <input
                    value={dlNotes}
                    onChange={(e) => setDlNotes(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </div>
                {(firmPlan === 'team' || firmPlan === 'agency') && teamMembers.length > 0 ? (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-600">
                      {t('clientDetail.deadlines.assign')}
                    </label>
                    <select
                      value={dlAssign}
                      onChange={(e) => setDlAssign(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                    >
                      <option value="">{t('clientDetail.deadlines.assignNone')}</option>
                      {teamMembers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.full_name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
              </div>
              <button
                type="submit"
                disabled={dlSubmitting}
                className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
              >
                {dlSubmitting ? t('auth.submitting') : t('clientDetail.deadlines.addBtn')}
              </button>
            </form>

            {dlLoading ? (
              <p>{t('common.loading')}</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="border-b bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-3 py-2">{t('clientDetail.deadlines.title')}</th>
                      <th className="px-3 py-2">{t('clientDetail.deadlines.type')}</th>
                      <th className="px-3 py-2">{t('clientDetail.deadlines.due')}</th>
                      <th className="px-3 py-2">{t('clients.col.status')}</th>
                      <th className="px-3 py-2">{t('clientDetail.deadlines.assign')}</th>
                      <th className="px-3 py-2">{t('clients.col.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deadlines.map((d) => (
                      <tr key={d.id} className="border-b border-slate-100">
                        <td className="px-3 py-2 font-medium">{d.title}</td>
                        <td className="px-3 py-2">
                          {t(
                            `clientDetail.deadlineTypes.${d.type === 'custom' ? 'ostalo' : d.type}`,
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="size-4 text-slate-400" />
                            {d.due_date}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={
                              d.status === 'completed'
                                ? 'rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800'
                                : d.status === 'overdue'
                                  ? 'rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800'
                                  : 'rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900'
                            }
                          >
                            {t(`clientDetail.deadlineStatus.${d.status}`)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {d.assigned_to
                            ? teamMembers.find((m) => m.id === d.assigned_to)?.full_name ?? '—'
                            : '—'}
                        </td>
                        <td className="px-3 py-2">
                          {d.status !== 'completed' ? (
                            <button
                              type="button"
                              onClick={() =>
                                void updateDeadlineStatus(d.id, 'completed').catch(() =>
                                  toast('error', t('clientDetail.deadlines.completeError')),
                                )
                              }
                              className="text-sm font-medium text-accent hover:underline"
                            >
                              {t('clientDetail.deadlines.complete')}
                            </button>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 'smart' && (
          <div className="mt-6 space-y-6">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Sparkles className="size-4 text-accent" />
              {t('clientDetail.smart.analysisFor', { period })}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
                <div className="text-2xl font-bold text-emerald-700">{summary.received}</div>
                <div className="text-xs font-medium text-emerald-800">
                  {t('clientDetail.smart.received')}
                </div>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
                <div className="text-2xl font-bold text-red-700">{summary.missing}</div>
                <div className="text-xs font-medium text-red-800">
                  {t('clientDetail.smart.missing')}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
                <div className="text-2xl font-bold text-primary">{summary.total}</div>
                <div className="text-xs font-medium text-slate-600">
                  {t('clientDetail.smart.total')}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white">
              <h3 className="border-b px-4 py-3 text-sm font-semibold text-slate-800">
                {t('clientDetail.smart.listTitle')}
              </h3>
              <ul className="divide-y divide-slate-100">
                {analysisRows.map((row) => (
                  <li key={row.requirement.id} className="flex items-center gap-3 px-4 py-3">
                    {row.hasDocument ? (
                      <Check className="size-5 shrink-0 text-emerald-500" />
                    ) : (
                      <X className="size-5 shrink-0 text-red-500" />
                    )}
                    <span className="flex-1 font-medium">
                      {docName(row.requirement.document_types)}
                    </span>
                  </li>
                ))}
                {analysisRows.length === 0 ? (
                  <li className="px-4 py-6 text-center text-slate-500">
                    {t('clientDetail.smart.noRequirements')}
                  </li>
                ) : null}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-primary">
                {t('clientDetail.smart.suggestedTitle')}
              </h3>
              <ul className="mt-3 space-y-2">
                {suggestedTypes.map((dt) => (
                  <li
                    key={dt.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                  >
                    <div>
                      <div className="font-medium">{docName(dt)}</div>
                      <div className="text-xs text-slate-500">{dt.category}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void onAddSuggestion(dt)}
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
                    >
                      {t('clientDetail.smart.addPlus')}
                    </button>
                  </li>
                ))}
                {suggestedTypes.length === 0 ? (
                  <li className="text-sm text-slate-500">{t('clientDetail.smart.noSuggestions')}</li>
                ) : null}
              </ul>
            </div>

            <button
              type="button"
              onClick={() => setCustomOpen(true)}
              className="rounded-lg border border-dashed border-accent px-4 py-2 text-sm font-medium text-accent hover:bg-orange-50"
            >
              {t('clientDetail.smart.customBtn')}
            </button>
          </div>
        )}
      </div>

      <EditClientModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        client={client}
        updateClient={updateClient}
        onSaved={() => toast('success', t('clientDetail.editSaved'))}
      />

      <Modal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title={t('clientDetail.documents.uploadTitle')}
      >
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-700">
              {t('clientDetail.documents.file')}
            </label>
            <input
              type="file"
              required
              onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
              className="mt-1 w-full text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-700">
              {t('clientDetail.documents.periodMonth')}
            </label>
            <input
              type="month"
              value={uploadPeriod}
              onChange={(e) => setUploadPeriod(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>
          <button
            type="submit"
            disabled={uploading}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {uploading ? t('auth.submitting') : t('clientDetail.documents.saveUpload')}
          </button>
        </form>
      </Modal>

      <Modal
        open={customOpen}
        onClose={() => setCustomOpen(false)}
        title={t('clientDetail.smart.customTitle')}
      >
        <form onSubmit={onAddCustom} className="space-y-3">
          <div>
            <label className="text-sm text-slate-700">{t('clientDetail.smart.nameSr')} *</label>
            <input
              required
              value={customNameSr}
              onChange={(e) => setCustomNameSr(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="text-sm text-slate-700">{t('clientDetail.smart.nameEn')}</label>
            <input
              value={customNameEn}
              onChange={(e) => setCustomNameEn(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>
          <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm text-white">
            {t('clientDetail.smart.customSave')}
          </button>
        </form>
      </Modal>
    </div>
  )
}

type EditProps = {
  open: boolean
  onClose: () => void
  client: import('../types/database').ClientRow
  updateClient: (p: Partial<import('../types/database').ClientInsert>) => Promise<void>
  onSaved: () => void
}

function EditClientModal({ open, onClose, client, updateClient, onSaved }: EditProps) {
  const { t } = useTranslation()
  const [name, setName] = useState(client.name)
  const [pib, setPib] = useState(client.pib ?? '')
  const [address, setAddress] = useState(client.address ?? '')
  const [contactEmail, setContactEmail] = useState(client.contact_email ?? '')
  const [contactPhone, setContactPhone] = useState(client.contact_phone ?? '')
  const [businessType, setBusinessType] = useState<BusinessType>(client.business_type)
  const [services, setServices] = useState<Set<ServiceType>>(new Set(client.services))
  const [status, setStatus] = useState<ClientStatus>(client.status)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setName(client.name)
      setPib(client.pib ?? '')
      setAddress(client.address ?? '')
      setContactEmail(client.contact_email ?? '')
      setContactPhone(client.contact_phone ?? '')
      setBusinessType(client.business_type)
      setServices(new Set(client.services))
      setStatus(client.status)
      setErr(null)
    }
  }, [open, client])

  function toggleService(s: ServiceType) {
    setServices((prev) => {
      const n = new Set(prev)
      if (n.has(s)) {
        n.delete(s)
      } else {
        n.add(s)
      }
      return n
    })
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setErr(null)
    const pibDigits = pib.replace(/\s/g, '')
    if (!PIB_REGEX.test(pibDigits)) {
      setErr(t('clients.validation.pibInvalid'))
      return
    }
    setSaving(true)
    try {
      await updateClient({
        name: name.trim(),
        pib: pibDigits,
        address: address.trim() || null,
        contact_email: contactEmail.trim() || null,
        contact_phone: contactPhone.trim() || null,
        business_type: businessType,
        services: Array.from(services),
        status,
      })
      onSaved()
      onClose()
    } catch {
      setErr(t('clientDetail.editError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t('clientDetail.editTitle')} size="lg">
      <form onSubmit={submit} className="space-y-3">
        {err ? <p className="text-sm text-red-600">{err}</p> : null}
        <div>
          <label className="text-sm">{t('clients.form.name')} *</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="text-sm">{t('clients.form.pib')} *</label>
          <input
            required
            value={pib}
            onChange={(e) => setPib(e.target.value.replace(/\D/g, ''))}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="text-sm">{t('clients.form.address')}</label>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-sm">{t('clients.form.contactEmail')}</label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="text-sm">{t('clients.form.contactPhone')}</label>
            <input
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>
        </div>
        <div>
          <label className="text-sm">{t('clients.form.businessType')}</label>
          <select
            value={businessType}
            onChange={(e) => setBusinessType(e.target.value as BusinessType)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          >
            <option value="doo">{t('clients.businessType.doo')}</option>
            <option value="sp">{t('clients.businessType.sp')}</option>
            <option value="other">{t('clients.businessType.other')}</option>
          </select>
        </div>
        <fieldset>
          <legend className="text-sm">{t('clients.form.services')}</legend>
          <div className="mt-2 flex flex-wrap gap-3">
            {(['pdv', 'porez', 'godisnji', 'ostalo'] as const).map((key) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={services.has(key)}
                  onChange={() => toggleService(key)}
                />
                {t(`clients.services.${key}`)}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="flex items-center gap-2">
          <span className="text-sm">{t('clients.form.status')}</span>
          <button
            type="button"
            onClick={() => setStatus((s) => (s === 'active' ? 'inactive' : 'active'))}
            className={`rounded-full px-3 py-1 text-xs ${status === 'active' ? 'bg-primary text-white' : 'bg-slate-200'}`}
          >
            {t(`clients.status.${status}`)}
          </button>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-primary px-4 py-2 text-sm text-white disabled:opacity-60"
        >
          {saving ? t('clients.form.saving') : t('clients.form.save')}
        </button>
      </form>
    </Modal>
  )
}
