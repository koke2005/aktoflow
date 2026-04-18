import { CalendarDays, Trash2 } from 'lucide-react'
import { type FormEvent, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { EmptyState } from '../components/EmptyState'
import { Modal } from '../components/Modal'
import { Spinner } from '../components/Spinner'
import {
  deriveDeadlineVisualStatus,
  useFirmDeadlines,
  type DeadlineWithClient,
} from '../hooks/useDeadlines'
import { useClients } from '../hooks/useClients'
import { useToastStore } from '../store/toastStore'
import type { DeadlineType } from '../types/database'

function todayISODateLocal(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDaysLocal(isoDate: string, days: number): string {
  const [y, mo, da] = isoDate.split('-').map(Number)
  const dt = new Date(y, mo - 1, da)
  dt.setDate(dt.getDate() + days)
  const yy = dt.getFullYear()
  const mm = `${dt.getMonth() + 1}`.padStart(2, '0')
  const dd = `${dt.getDate()}`.padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

/** Dani u mesecu za mini kalendar (prazna polja za poravnanje). */
function getMonthGrid(year: number, monthIndex: number): (number | null)[] {
  const first = new Date(year, monthIndex, 1)
  const last = new Date(year, monthIndex + 1, 0)
  const startPad = (first.getDay() + 6) % 7
  const daysInMonth = last.getDate()
  const cells: (number | null)[] = []
  for (let i = 0; i < startPad; i++) {
    cells.push(null)
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(d)
  }
  while (cells.length % 7 !== 0) {
    cells.push(null)
  }
  return cells
}

function dateKey(year: number, monthIndex: number, day: number): string {
  const m = `${monthIndex + 1}`.padStart(2, '0')
  const d = `${day}`.padStart(2, '0')
  return `${year}-${m}-${d}`
}

function dayCellClass(
  deadlines: DeadlineWithClient[],
  dayKey: string,
  today: string,
): string {
  const list = deadlines.filter((x) => x.due_date === dayKey)
  if (list.length === 0) {
    return 'border-slate-100 bg-white'
  }
  let hasOver = false
  let hasPending = false
  let hasDone = false
  for (const row of list) {
    const v = deriveDeadlineVisualStatus(row, today)
    if (v === 'overdue') {
      hasOver = true
    } else if (v === 'completed') {
      hasDone = true
    } else {
      hasPending = true
    }
  }
  if (hasOver) {
    return 'border-red-300 bg-red-100'
  }
  if (hasPending) {
    return 'border-amber-300 bg-amber-100'
  }
  if (hasDone) {
    return 'border-emerald-300 bg-emerald-100'
  }
  return 'border-slate-100 bg-slate-50'
}

type StatusFilter = 'all' | 'pending' | 'overdue' | 'completed'

export function DeadlinesPage() {
  const { t, i18n } = useTranslation()
  const toast = useToastStore((s) => s.show)
  const { clients, loading: clientsLoading } = useClients()
  const {
    deadlines,
    loading,
    error,
    deleteDeadline,
    addFirmDeadline,
    updateDeadlineStatus,
  } = useFirmDeadlines()

  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formClientId, setFormClientId] = useState('')
  const [formTitle, setFormTitle] = useState('')
  const [formDate, setFormDate] = useState('')
  const [formType, setFormType] = useState<DeadlineType>('pdv')

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [clientFilter, setClientFilter] = useState<string>('all')
  const [calendarDayFilter, setCalendarDayFilter] = useState<string | null>(null)

  const now = new Date()
  const calYear = now.getFullYear()
  const calMonth = now.getMonth()

  const today = todayISODateLocal()
  const plus7 = addDaysLocal(today, 7)

  const summary = useMemo(() => {
    let overdue = 0
    let soon = 0
    let done = 0
    for (const d of deadlines) {
      const vis = deriveDeadlineVisualStatus(d, today)
      if (vis === 'completed') {
        done += 1
      } else if (vis === 'overdue') {
        overdue += 1
      } else if (d.due_date >= today && d.due_date <= plus7) {
        soon += 1
      }
    }
    return { overdue, soon, done }
  }, [deadlines, today, plus7])

  const filteredRows = useMemo(() => {
    let rows = [...deadlines]

    if (calendarDayFilter) {
      rows = rows.filter((r) => r.due_date === calendarDayFilter)
    }

    if (clientFilter !== 'all') {
      rows = rows.filter((r) => r.client_id === clientFilter)
    }

    if (statusFilter !== 'all') {
      rows = rows.filter((r) => {
        const vis = deriveDeadlineVisualStatus(r, today)
        if (statusFilter === 'completed') {
          return vis === 'completed'
        }
        if (statusFilter === 'overdue') {
          return vis === 'overdue'
        }
        if (statusFilter === 'pending') {
          return vis === 'pending'
        }
        return true
      })
    }

    rows.sort((a, b) => a.due_date.localeCompare(b.due_date))
    return rows
  }, [deadlines, statusFilter, clientFilter, calendarDayFilter, today])

  const monthGrid = useMemo(() => getMonthGrid(calYear, calMonth), [calYear, calMonth])
  const locale = i18n.language === 'en' ? 'en-US' : 'sr-Latn-RS'
  const weekdayLabels = t('calendar.days', { returnObjects: true }) as string[]
  const monthLabels = t('calendar.months', { returnObjects: true }) as string[]
  const monthTitleFromLocale = new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
  }).format(new Date(calYear, calMonth, 1))
  const monthTitle =
    monthLabels[calMonth] && i18n.language === 'sr'
      ? `${monthLabels[calMonth]} ${calYear}`
      : monthTitleFromLocale

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!formClientId || !formTitle.trim() || !formDate) {
      return
    }
    setSubmitting(true)
    try {
      await addFirmDeadline({
        clientId: formClientId,
        title: formTitle,
        dueDate: formDate,
        type: formType,
      })
      toast('success', t('deadlinesPage.addSuccess'))
      setModalOpen(false)
      setFormClientId('')
      setFormTitle('')
      setFormDate('')
      setFormType('pdv')
    } catch {
      toast('error', t('deadlinesPage.addError'))
    } finally {
      setSubmitting(false)
    }
  }

  async function onComplete(row: DeadlineWithClient) {
    try {
      await updateDeadlineStatus(row.id, 'completed')
      toast('success', t('deadlinesPage.completeSuccess'))
    } catch {
      toast('error', t('deadlinesPage.completeError'))
    }
  }

  async function onDelete(row: DeadlineWithClient) {
    if (!window.confirm(t('deadlinesPage.deleteConfirm'))) {
      return
    }
    try {
      await deleteDeadline(row.id)
      toast('success', t('deadlinesPage.deleteSuccess'))
    } catch {
      toast('error', t('deadlinesPage.deleteError'))
    }
  }

  function statusBadgeClass(vis: ReturnType<typeof deriveDeadlineVisualStatus>): string {
    if (vis === 'completed') {
      return 'bg-emerald-100 text-emerald-800'
    }
    if (vis === 'overdue') {
      return 'bg-red-100 text-red-800'
    }
    return 'bg-amber-100 text-amber-900'
  }

  function typeTagClass(): string {
    return 'inline-flex rounded px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-800'
  }

  if (loading || clientsLoading) {
    return <Spinner label={t('common.loading')} fullPage />
  }

  if (error) {
    return (
      <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
        {error}
      </p>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold text-slate-900">{t('deadlinesPage.title')}</h2>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
        >
          {t('deadlinesPage.addButton')}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="flex items-center gap-3 rounded-xl border-l-4 border-[#ef4444] bg-white px-4 py-3 shadow-sm">
          <span className="text-2xl font-bold text-[#ef4444]">{summary.overdue}</span>
          <span className="text-sm font-medium text-slate-700">
            {t('deadlinesPage.summaryOverdue')}
          </span>
        </div>
        <div className="flex items-center gap-3 rounded-xl border-l-4 border-[#f97316] bg-white px-4 py-3 shadow-sm">
          <span className="text-2xl font-bold text-[#f97316]">{summary.soon}</span>
          <span className="text-sm font-medium text-slate-700">
            {t('deadlinesPage.summarySoon')}
          </span>
        </div>
        <div className="flex items-center gap-3 rounded-xl border-l-4 border-[#22c55e] bg-white px-4 py-3 shadow-sm">
          <span className="text-2xl font-bold text-[#22c55e]">{summary.done}</span>
          <span className="text-sm font-medium text-slate-700">
            {t('deadlinesPage.summaryDone')}
          </span>
        </div>
      </div>

      <section>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <span>{t('deadlinesPage.filterStatus')}</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
            >
              <option value="all">{t('deadlinesPage.filterAll')}</option>
              <option value="pending">{t('deadlinesPage.filterPending')}</option>
              <option value="overdue">{t('deadlinesPage.filterOverdue')}</option>
              <option value="completed">{t('deadlinesPage.filterCompleted')}</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <span>{t('deadlinesPage.filterClient')}</span>
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="min-w-[180px] rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
            >
              <option value="all">{t('deadlinesPage.filterAllClients')}</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          {calendarDayFilter ? (
            <button
              type="button"
              onClick={() => setCalendarDayFilter(null)}
              className="text-sm font-medium text-accent hover:underline"
            >
              {t('deadlinesPage.clearDayFilter', { date: calendarDayFilter })}
            </button>
          ) : null}
        </div>

        {filteredRows.length === 0 ? (
          <EmptyState icon={CalendarDays} message={t('deadlinesPage.tableEmpty')} />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2 font-medium">{t('deadlinesPage.col.client')}</th>
                  <th className="px-3 py-2 font-medium">{t('deadlinesPage.col.title')}</th>
                  <th className="px-3 py-2 font-medium">{t('deadlinesPage.col.type')}</th>
                  <th className="px-3 py-2 font-medium">{t('deadlinesPage.col.date')}</th>
                  <th className="px-3 py-2 font-medium">{t('deadlinesPage.col.status')}</th>
                  <th className="px-3 py-2 font-medium">{t('deadlinesPage.col.assigned')}</th>
                  <th className="px-3 py-2 font-medium">{t('deadlinesPage.col.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => {
                  const vis = deriveDeadlineVisualStatus(row, today)
                  const canComplete =
                    vis === 'pending' || vis === 'overdue'
                  return (
                    <tr key={row.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-3 py-2 font-medium text-slate-900">{row.client_name}</td>
                      <td className="px-3 py-2">{row.title}</td>
                      <td className="px-3 py-2">
                        <span className={typeTagClass()}>
                          {t(`clientDetail.deadlineTypes.${row.type === 'custom' ? 'ostalo' : row.type}`)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-700">{row.due_date}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(vis)}`}
                        >
                          {t(`clientDetail.deadlineStatus.${vis}`)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {row.assigned_name ?? '—'}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          {canComplete ? (
                            <button
                              type="button"
                              onClick={() => void onComplete(row)}
                              className="text-xs font-medium text-accent hover:underline"
                            >
                              {t('deadlinesPage.actionComplete')}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => void onDelete(row)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:underline"
                          >
                            <Trash2 className="size-3.5" aria-hidden />
                            {t('deadlinesPage.actionDelete')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold text-primary">
          {t('deadlinesPage.calendarTitle')}
        </h3>
        <div className="max-w-md rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-center text-sm font-medium text-slate-700">
            {monthTitle}
          </p>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-500">
            {weekdayLabels.map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {monthGrid.map((day, idx) => {
              if (day === null) {
                return <div key={`e-${idx}`} className="aspect-square" />
              }
              const key = dateKey(calYear, calMonth, day)
              const isSelected = calendarDayFilter === key
              const isToday = key === today
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() =>
                    setCalendarDayFilter((prev) => (prev === key ? null : key))
                  }
                  className={[
                    'flex aspect-square items-center justify-center rounded-lg border text-sm font-medium transition',
                    dayCellClass(deadlines, key, today),
                    isSelected ? 'ring-2 ring-primary ring-offset-1' : 'hover:opacity-90',
                    isToday ? 'font-bold' : '',
                  ].join(' ')}
                >
                  {day}
                </button>
              )
            })}
          </div>
          <p className="mt-3 text-xs text-slate-500">{t('deadlinesPage.calendarHint')}</p>
        </div>
      </section>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={t('deadlinesPage.modalTitle')}
      >
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              {t('deadlinesPage.formClient')} *
            </label>
            <select
              required
              value={formClientId}
              onChange={(e) => setFormClientId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="">{t('deadlinesPage.formClientPlaceholder')}</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              {t('deadlinesPage.formTitle')} *
            </label>
            <input
              required
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              {t('deadlinesPage.formDate')} *
            </label>
            <input
              type="date"
              required
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              {t('deadlinesPage.formType')} *
            </label>
            <select
              value={formType}
              onChange={(e) => setFormType(e.target.value as DeadlineType)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="pdv">{t('clientDetail.deadlineTypes.pdv')}</option>
              <option value="porez">{t('clientDetail.deadlineTypes.porez')}</option>
              <option value="godisnji">{t('clientDetail.deadlineTypes.godisnji')}</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {submitting ? t('auth.submitting') : t('deadlinesPage.modalSubmit')}
          </button>
        </form>
      </Modal>
    </div>
  )
}
