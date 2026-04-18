import { type FormEvent, useMemo, useState } from 'react'
import { ClipboardList } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { Modal } from '../components/Modal'
import { Spinner } from '../components/Spinner'
import { useClients } from '../hooks/useClients'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { useToastStore } from '../store/toastStore'
import type { BusinessType, ClientStatus, ServiceType } from '../types/database'
import { exportClientsList } from '../utils/pdfExport'

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

function formatPib(pib: string | null): string {
  if (!pib) {
    return '—'
  }
  const digits = pib.replace(/\D/g, '')
  if (digits.length !== 9) {
    return pib
  }
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
}

export function ClientsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toast = useToastStore((s) => s.show)
  const profile = useAuthStore((s) => s.profile)
  const { clients, loading, error, firmId, addClient } = useClients()

  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [name, setName] = useState('')
  const [pib, setPib] = useState('')
  const [address, setAddress] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [businessType, setBusinessType] = useState<BusinessType>('doo')
  const [services, setServices] = useState<Set<ServiceType>>(new Set())
  const [status, setStatus] = useState<ClientStatus>('active')
  const [formError, setFormError] = useState<string | null>(null)

  function resetForm() {
    setName('')
    setPib('')
    setAddress('')
    setContactEmail('')
    setContactPhone('')
    setBusinessType('doo')
    setServices(new Set())
    setStatus('active')
    setFormError(null)
  }

  function toggleService(s: ServiceType) {
    setServices((prev) => {
      const next = new Set(prev)
      if (next.has(s)) {
        next.delete(s)
      } else {
        next.add(s)
      }
      return next
    })
  }

  const serviceOptions = useMemo(
    () =>
      (['pdv', 'porez', 'godisnji', 'ostalo'] as const).map((key) => ({
        key,
        label: t(`clients.services.${key}`),
      })),
    [t],
  )

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    const trimmedName = name.trim()
    const pibDigits = pib.replace(/\s/g, '')
    if (!trimmedName) {
      setFormError(t('clients.validation.nameRequired'))
      return
    }
    if (!PIB_REGEX.test(pibDigits)) {
      setFormError(t('clients.validation.pibInvalid'))
      return
    }
    if (!firmId) {
      setFormError(t('clients.validation.noFirm'))
      return
    }

    setSubmitting(true)
    try {
      await addClient({
        name: trimmedName,
        pib: pibDigits,
        address: address.trim() || null,
        contact_email: contactEmail.trim() || null,
        contact_phone: contactPhone.trim() || null,
        business_type: businessType,
        services: Array.from(services),
        status,
      })
      toast('success', t('clients.addSuccess'))
      setModalOpen(false)
      resetForm()
    } catch {
      toast('error', t('clients.addError'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleExportPdf() {
    toast('info', t('export.generating'))
    let firmName = t('nav.firmName')
    if (profile?.firm_id) {
      const { data } = await supabase
        .from('firms')
        .select('name')
        .eq('id', profile.firm_id)
        .maybeSingle()
      if (data?.name) {
        firmName = data.name
      }
    }
    exportClientsList(
      clients.map((c) => ({
        name: c.name,
        pib: c.pib,
        businessType: t(`clients.businessType.${c.business_type}`),
        services: c.services.map((s) => t(`clients.servicesShort.${s}`)).join(', '),
        status: t(`clients.status.${c.status}`),
      })),
      firmName,
    )
  }

  return (
    <div className="dark:text-slate-100">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{t('clients.title')}</h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleExportPdf}
            className="inline-flex justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
          >
            {t('export.clients')}
          </button>
          <button
            type="button"
            onClick={() => {
              resetForm()
              setModalOpen(true)
            }}
            className="inline-flex justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
          >
            {t('clients.addButton')}
          </button>
        </div>
      </div>

      {error ? (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <Spinner label={t('common.loading')} fullPage />
      ) : clients.length === 0 ? (
        <EmptyState icon={ClipboardList} message={t('clients.empty')} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3 font-medium">{t('clients.col.name')}</th>
                <th className="px-4 py-3 font-medium">{t('clients.col.pib')}</th>
                <th className="px-4 py-3 font-medium">{t('clients.col.businessType')}</th>
                <th className="px-4 py-3 font-medium">{t('clients.col.services')}</th>
                <th className="px-4 py-3 font-medium">{t('clients.col.status')}</th>
                <th className="px-4 py-3 font-medium">{t('clients.col.openItems')}</th>
                <th className="px-4 py-3 font-medium">{t('clients.col.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr
                  key={c.id}
                  className="cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50 last:border-0 dark:border-slate-700 dark:hover:bg-slate-700"
                  onClick={() => navigate(`/clients/${c.id}`)}
                >
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{c.name}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{formatPib(c.pib)}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                    {t(`clients.businessType.${c.business_type}`)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {c.services.length === 0 ? (
                        <span className="text-slate-400 dark:text-slate-500">—</span>
                      ) : (
                        c.services.map((s) => (
                          <span
                            key={s}
                            className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${serviceClass(s)}`}
                          >
                            {t(`clients.servicesShort.${s}`)}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        c.status === 'active'
                          ? 'inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800'
                          : 'inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600'
                      }
                    >
                      {t(`clients.status.${c.status}`)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">0</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/clients/${c.id}`)
                      }}
                      className="font-medium text-accent hover:underline"
                    >
                      {t('clients.open')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={t('clients.modalTitle')}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{formError}</p>
          ) : null}

          <div>
            <label htmlFor="c-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              {t('clients.form.name')} *
            </label>
            <input
              id="c-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            />
          </div>

          <div>
            <label htmlFor="c-pib" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              {t('clients.form.pib')} *
            </label>
            <input
              id="c-pib"
              required
              inputMode="numeric"
              value={pib}
              onChange={(e) => setPib(e.target.value.replace(/\D/g, ''))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('clients.form.pibHint')}</p>
          </div>

          <div>
            <label htmlFor="c-addr" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              {t('clients.form.address')}
            </label>
            <input
              id="c-addr"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="c-email" className="block text-sm font-medium text-slate-700">
                {t('clients.form.contactEmail')}
              </label>
              <input
                id="c-email"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              />
            </div>
            <div>
              <label htmlFor="c-phone" className="block text-sm font-medium text-slate-700">
                {t('clients.form.contactPhone')}
              </label>
              <input
                id="c-phone"
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              />
            </div>
          </div>

          <div>
            <label htmlFor="c-bt" className="block text-sm font-medium text-slate-700">
              {t('clients.form.businessType')}
            </label>
            <select
              id="c-bt"
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value as BusinessType)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            >
              <option value="doo">{t('clients.businessType.doo')}</option>
              <option value="sp">{t('clients.businessType.sp')}</option>
              <option value="other">{t('clients.businessType.other')}</option>
            </select>
          </div>

          <fieldset>
            <legend className="text-sm font-medium text-slate-700">{t('clients.form.services')}</legend>
            <div className="mt-2 flex flex-wrap gap-4">
              {serviceOptions.map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 text-sm text-slate-800">
                  <input
                    type="checkbox"
                    checked={services.has(key)}
                    onChange={() => toggleService(key)}
                    className="size-4 rounded border-slate-300 text-primary focus:ring-primary"
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <span className="text-sm font-medium text-slate-700">{t('clients.form.status')}</span>
            <button
              type="button"
              role="switch"
              aria-checked={status === 'active'}
              onClick={() => setStatus((s) => (s === 'active' ? 'inactive' : 'active'))}
              className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors ${
                status === 'active' ? 'bg-primary' : 'bg-slate-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block size-6 translate-y-0.5 rounded-full bg-white shadow transition ${
                  status === 'active' ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-sm text-slate-600">{t(`clients.status.${status}`)}</span>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {t('clients.form.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
            >
              {submitting ? t('clients.form.saving') : t('clients.form.save')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
