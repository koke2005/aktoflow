import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Modal } from '../components/Modal'
import {
  type DashboardDeadlineItem,
  type DashboardDocumentMissingItem,
  type DashboardDoneDeadlineItem,
  type DashboardDoneDocumentItem,
  type DashboardRequirementGapItem,
  useDashboard,
} from '../hooks/useDashboard'
import { useToastStore } from '../store/toastStore'

function pickTitle(sr: string, en: string, lang: string): string {
  return lang === 'en' ? en : sr
}

type ColumnProps = {
  titleKey: string
  headerClass: string
  count: number
  children: React.ReactNode
}

function Column({ titleKey, headerClass, count, children }: ColumnProps) {
  const { t } = useTranslation()
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div
        className={`flex shrink-0 items-center justify-between px-3 py-2.5 text-white ${headerClass}`}
      >
        <span className="text-sm font-semibold">{t(titleKey)}</span>
        <span
          className="min-w-[1.75rem] rounded-full bg-black/15 px-2 py-0.5 text-center text-xs font-bold"
          aria-label={t('dashboard.radar.badgeAria', { count })}
        >
          {count}
        </span>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">{children}</div>
    </div>
  )
}

type CardShellProps = {
  clientName: string
  subtitle: string
  meta: string
  actionLabel: string
  onAction: () => void
  actionVariant?: 'primary' | 'neutral'
}

function CardShell({
  clientName,
  subtitle,
  meta,
  actionLabel,
  onAction,
  actionVariant = 'primary',
}: CardShellProps) {
  const btnClass =
    actionVariant === 'primary'
      ? 'w-full rounded-lg bg-primary py-1.5 text-xs font-medium text-white hover:opacity-90'
      : 'w-full rounded-lg border border-slate-200 bg-white py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50'
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-3 shadow-sm">
      <p className="font-bold text-slate-900">{clientName}</p>
      <p className="mt-1 text-sm text-slate-700">{subtitle}</p>
      <p className="mt-0.5 text-xs text-slate-500">{meta}</p>
      <button type="button" onClick={onAction} className={`mt-3 ${btnClass}`}>
        {actionLabel}
      </button>
    </div>
  )
}

export function DashboardPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const toast = useToastStore((s) => s.show)
  const {
    loading,
    error,
    buckets,
    counts,
    completeDeadline,
    uploadForRequirement,
  } = useDashboard()

  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadCtx, setUploadCtx] = useState<{
    clientId: string
    documentTypeId: string
    period: string
    docTitleSr: string
    docTitleEn: string
  } | null>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadPeriod, setUploadPeriod] = useState('')
  const [uploading, setUploading] = useState(false)

  function openUpload(
    clientId: string,
    documentTypeId: string,
    period: string,
    docTitleSr: string,
    docTitleEn: string,
  ) {
    setUploadCtx({ clientId, documentTypeId, period, docTitleSr, docTitleEn })
    setUploadPeriod(period)
    setUploadFile(null)
    setUploadOpen(true)
  }

  async function handleUploadSubmit(e: FormEvent) {
    e.preventDefault()
    if (!uploadCtx || !uploadFile) {
      return
    }
    setUploading(true)
    try {
      await uploadForRequirement({
        clientId: uploadCtx.clientId,
        documentTypeId: uploadCtx.documentTypeId,
        period: uploadPeriod,
        file: uploadFile,
      })
      toast('success', t('dashboard.radar.uploadSuccess'))
      setUploadOpen(false)
      setUploadCtx(null)
    } catch {
      toast('error', t('dashboard.radar.uploadError'))
    } finally {
      setUploading(false)
    }
  }

  async function onComplete(id: string) {
    try {
      await completeDeadline(id)
      toast('success', t('dashboard.radar.completeSuccess'))
    } catch {
      toast('error', t('dashboard.radar.completeError'))
    }
  }

  function docLabel(
    item:
      | DashboardDocumentMissingItem
      | DashboardRequirementGapItem
      | DashboardDoneDocumentItem,
  ): string {
    return pickTitle(item.docTitle, item.docTitleEn, i18n.language)
  }

  function renderDeadlineCard(
    d: DashboardDeadlineItem,
    key: string,
  ): React.ReactNode {
    return (
      <CardShell
        key={key}
        clientName={d.clientName}
        subtitle={d.title}
        meta={t('dashboard.radar.metaDue', { date: d.dueDate })}
        actionLabel={t('dashboard.radar.actionComplete')}
        onAction={() => void onComplete(d.id)}
      />
    )
  }

  function renderDocMissingCard(d: DashboardDocumentMissingItem, key: string) {
    return (
      <CardShell
        key={key}
        clientName={d.clientName}
        subtitle={docLabel(d)}
        meta={t('dashboard.radar.metaPeriod', { period: d.period })}
        actionLabel={t('dashboard.radar.actionUpload')}
        onAction={() =>
          openUpload(
            d.clientId,
            d.documentTypeId,
            d.period,
            d.docTitle,
            d.docTitleEn,
          )
        }
      />
    )
  }

  function renderGapCard(g: DashboardRequirementGapItem, key: string) {
    return (
      <CardShell
        key={key}
        clientName={g.clientName}
        subtitle={docLabel(g)}
        meta={t('dashboard.radar.metaPeriod', { period: g.period })}
        actionLabel={t('dashboard.radar.actionUpload')}
        onAction={() =>
          openUpload(
            g.clientId,
            g.documentTypeId,
            g.period,
            g.docTitle,
            g.docTitleEn,
          )
        }
      />
    )
  }

  function renderDoneDeadline(d: DashboardDoneDeadlineItem, key: string) {
    return (
      <CardShell
        key={key}
        clientName={d.clientName}
        subtitle={d.title}
        meta={t('dashboard.radar.metaDue', { date: d.dateLabel })}
        actionLabel={t('dashboard.radar.actionView')}
        actionVariant="neutral"
        onAction={() => navigate(`/clients/${d.clientId}`)}
      />
    )
  }

  function renderDoneDocument(d: DashboardDoneDocumentItem, key: string) {
    return (
      <CardShell
        key={key}
        clientName={d.clientName}
        subtitle={docLabel(d)}
        meta={t('dashboard.radar.metaUploaded', { date: d.dateLabel })}
        actionLabel={t('dashboard.radar.actionView')}
        actionVariant="neutral"
        onAction={() => navigate(`/clients/${d.clientId}`)}
      />
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="size-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (error) {
    return (
      <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
        {error}
      </p>
    )
  }

  if (!buckets) {
    return (
      <p className="text-slate-600">{t('dashboard.radar.noFirm')}</p>
    )
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div>
        <h2 className="text-xl font-semibold text-primary">{t('dashboard.radar.pageTitle')}</h2>
        <p className="mt-1 text-sm text-slate-600">{t('dashboard.radar.pageSubtitle')}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="flex items-center gap-3 rounded-xl border-l-4 border-[#ef4444] bg-white px-4 py-3 shadow-sm">
          <span className="text-2xl font-bold text-[#ef4444]">{counts.overdue}</span>
          <span className="text-sm font-medium text-slate-700">
            {t('dashboard.radar.summaryOverdue')}
          </span>
        </div>
        <div className="flex items-center gap-3 rounded-xl border-l-4 border-[#f97316] bg-white px-4 py-3 shadow-sm">
          <span className="text-2xl font-bold text-[#f97316]">{counts.soon}</span>
          <span className="text-sm font-medium text-slate-700">
            {t('dashboard.radar.summarySoon')}
          </span>
        </div>
        <div className="flex items-center gap-3 rounded-xl border-l-4 border-[#eab308] bg-white px-4 py-3 shadow-sm">
          <span className="text-2xl font-bold text-[#eab308]">{counts.missing}</span>
          <span className="text-sm font-medium text-slate-700">
            {t('dashboard.radar.summaryMissing')}
          </span>
        </div>
        <div className="flex items-center gap-3 rounded-xl border-l-4 border-[#22c55e] bg-white px-4 py-3 shadow-sm">
          <span className="text-2xl font-bold text-[#22c55e]">{counts.done}</span>
          <span className="text-sm font-medium text-slate-700">
            {t('dashboard.radar.summaryDone')}
          </span>
        </div>
      </div>

      <div className="grid h-[calc(100vh-140px)] min-h-[280px] w-full min-w-0 grid-cols-1 gap-3 overflow-x-hidden lg:grid-cols-4">
        <Column
          titleKey="dashboard.radar.col.overdue"
          headerClass="rounded-t-xl bg-[#ef4444]"
          count={counts.overdue}
        >
          {buckets.overdue.deadlines.map((d) => renderDeadlineCard(d, `odl-${d.id}`))}
          {buckets.overdue.documents.map((d) => renderDocMissingCard(d, `odd-${d.id}`))}
          {counts.overdue === 0 ? (
            <p className="px-1 py-4 text-center text-xs text-slate-500">
              {t('dashboard.radar.empty')}
            </p>
          ) : null}
        </Column>

        <Column
          titleKey="dashboard.radar.col.soon"
          headerClass="rounded-t-xl bg-[#f97316]"
          count={counts.soon}
        >
          {buckets.soon.deadlines.map((d) => renderDeadlineCard(d, `sdl-${d.id}`))}
          {buckets.soon.documents.map((d) => renderDocMissingCard(d, `sdd-${d.id}`))}
          {counts.soon === 0 ? (
            <p className="px-1 py-4 text-center text-xs text-slate-500">
              {t('dashboard.radar.empty')}
            </p>
          ) : null}
        </Column>

        <Column
          titleKey="dashboard.radar.col.missing"
          headerClass="rounded-t-xl bg-[#eab308]"
          count={counts.missing}
        >
          {buckets.missingGrouped.map((group) => (
            <div key={group.clientId} className="mb-3 last:mb-0">
              <p className="sticky top-0 z-[1] bg-[#eab308]/20 px-2 py-1 text-xs font-bold text-slate-900">
                {group.clientName}
              </p>
              <div className="mt-1 space-y-2 pl-1">
                {group.items.map((g) => renderGapCard(g, `gap-${g.requirementId}`))}
              </div>
            </div>
          ))}
          {counts.missing === 0 ? (
            <p className="px-1 py-4 text-center text-xs text-slate-500">
              {t('dashboard.radar.empty')}
            </p>
          ) : null}
        </Column>

        <Column
          titleKey="dashboard.radar.col.done"
          headerClass="rounded-t-xl bg-[#22c55e]"
          count={counts.done}
        >
          {buckets.done.deadlines.map((d) => renderDoneDeadline(d, `dd-${d.id}`))}
          {buckets.done.documents.map((d) => renderDoneDocument(d, `dfd-${d.id}`))}
          {counts.done === 0 ? (
            <p className="px-1 py-4 text-center text-xs text-slate-500">
              {t('dashboard.radar.empty')}
            </p>
          ) : null}
        </Column>
      </div>

      <Modal
        open={uploadOpen}
        onClose={() => {
          setUploadOpen(false)
          setUploadCtx(null)
        }}
        title={t('dashboard.radar.uploadModalTitle')}
      >
        {uploadCtx ? (
          <form onSubmit={handleUploadSubmit} className="space-y-4">
            <p className="text-sm text-slate-600">
              {pickTitle(uploadCtx.docTitleSr, uploadCtx.docTitleEn, i18n.language)}
            </p>
            <div>
              <label className="block text-sm text-slate-700">
                {t('dashboard.radar.uploadFile')}
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
                {t('dashboard.radar.uploadPeriod')}
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
              {uploading ? t('auth.submitting') : t('dashboard.radar.uploadSave')}
            </button>
          </form>
        ) : null}
      </Modal>
    </div>
  )
}
