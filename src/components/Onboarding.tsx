import {
  CheckCircle,
  LayoutDashboard,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react'
import { type ReactNode, useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'

export const ONBOARDING_STORAGE_KEY = 'aktoflow_onboarding_done'

const TOTAL_STEPS = 5

function markOnboardingDone(): void {
  try {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, '1')
  } catch {
    // ignore
  }
}

/** Jednokratni onboarding vodič (samo /dashboard), localStorage `aktoflow_onboarding_done`. */
export function Onboarding() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const [storageChecked, setStorageChecked] = useState(false)
  const [dismissed, setDismissed] = useState(true)
  const [step, setStep] = useState(0)

  useEffect(() => {
    try {
      setDismissed(!!localStorage.getItem(ONBOARDING_STORAGE_KEY))
    } catch {
      setDismissed(true)
    }
    setStorageChecked(true)
  }, [])

  const closeAndSave = useCallback(() => {
    markOnboardingDone()
    setDismissed(true)
  }, [])

  const handleSkip = useCallback(() => {
    closeAndSave()
  }, [closeAndSave])

  const goNext = useCallback(() => {
    if (step < TOTAL_STEPS - 1) {
      setStep((s) => s + 1)
    }
  }, [step])

  const goBack = useCallback(() => {
    if (step > 0) {
      setStep((s) => s - 1)
    }
  }, [step])

  const finishToClients = useCallback(() => {
    closeAndSave()
    navigate('/clients')
  }, [closeAndSave, navigate])

  const finishToDashboard = useCallback(() => {
    closeAndSave()
    navigate('/dashboard')
  }, [closeAndSave, navigate])

  if (!storageChecked || dismissed || location.pathname !== '/dashboard') {
    return null
  }

  const progress = ((step + 1) / TOTAL_STEPS) * 100

  return (
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center bg-black/50 px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleSkip}
          className="absolute right-4 top-4 text-xs font-medium text-slate-500 underline-offset-2 transition hover:text-slate-800 hover:underline dark:text-slate-400 dark:hover:text-slate-200"
        >
          {t('onboarding.skip')}
        </button>

        <div className="px-6 pb-2 pt-12">
          <div className="mb-3 flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>
              {t('onboarding.progress', { current: step + 1, total: TOTAL_STEPS })}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-600">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div key={step} className="onboarding-step-enter px-6 pb-6 pt-2">
          {step === 0 && (
            <StepBody
              icon={<Sparkles className="size-14 text-accent" aria-hidden />}
              title={t('onboarding.step1.title')}
              text={t('onboarding.step1.text')}
            />
          )}
          {step === 1 && (
            <StepBody
              icon={<Users className="size-14 text-primary" aria-hidden />}
              title={t('onboarding.step2.title')}
              text={t('onboarding.step2.text')}
              preview={<PreviewClientCard />}
            />
          )}
          {step === 2 && (
            <StepBody
              icon={<Zap className="size-14 text-amber-400" aria-hidden />}
              title={t('onboarding.step3.title')}
              text={t('onboarding.step3.text')}
              preview={<PreviewKanbanMissing />}
            />
          )}
          {step === 3 && (
            <StepBody
              icon={<LayoutDashboard className="size-14 text-primary" aria-hidden />}
              title={t('onboarding.step4.title')}
              text={t('onboarding.step4.text')}
              preview={<PreviewRadarColumns />}
            />
          )}
          {step === 4 && (
            <StepBody
              icon={<CheckCircle className="size-14 text-emerald-500" aria-hidden />}
              titleId="onboarding-title"
              title={t('onboarding.step5.title')}
              text={t('onboarding.step5.text')}
            />
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              {step > 0 ? (
                <button
                  type="button"
                  onClick={goBack}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
                >
                  {t('onboarding.back')}
                </button>
              ) : null}
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              {step < 4 ? (
                <button
                  type="button"
                  onClick={goNext}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
                >
                  {step === 0
                    ? t('onboarding.step1.cta')
                    : step === 1
                      ? t('onboarding.step2.cta')
                      : step === 2
                        ? t('onboarding.step3.cta')
                        : t('onboarding.step4.cta')}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={finishToClients}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
                  >
                    {t('onboarding.addClient')}
                  </button>
                  <button
                    type="button"
                    onClick={finishToDashboard}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
                  >
                    {t('onboarding.goDashboard')}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

type StepBodyProps = {
  icon: ReactNode
  title: string
  text: string
  titleId?: string
  preview?: ReactNode
}

function StepBody({ icon, title, text, titleId = 'onboarding-title', preview }: StepBodyProps) {
  return (
    <div className="text-center">
      <div className="flex justify-center">{icon}</div>
      <h2 id={titleId} className="mt-4 text-xl font-bold text-slate-900 dark:text-slate-100">
        {title}
      </h2>
      <p className="mt-3 text-left text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        {text}
      </p>
      {preview ? <div className="mt-5">{preview}</div> : null}
    </div>
  )
}

function PreviewClientCard() {
  return (
    <div className="mx-auto max-w-sm rounded-xl border border-slate-200 bg-slate-50 p-3 text-left shadow-sm dark:border-slate-600 dark:bg-slate-700/60">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Primjer d.o.o.
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">123-456-789</p>
        </div>
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
          Aktivan
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
          PDV
        </span>
        <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] text-purple-800 dark:bg-purple-900/40 dark:text-purple-200">
          Porez
        </span>
      </div>
    </div>
  )
}

function PreviewKanbanMissing() {
  return (
    <div className="mx-auto flex max-w-md gap-1 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 p-1 dark:border-slate-600 dark:bg-slate-900">
      <div className="hidden min-w-0 flex-1 flex-col rounded bg-white/80 p-1 dark:bg-slate-800/80 sm:flex">
        <div className="rounded bg-[#ef4444] px-1 py-0.5 text-[8px] font-semibold text-white">
          …
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col rounded border-2 border-[#eab308] bg-white p-1 shadow-sm dark:bg-slate-800">
        <div className="rounded-t bg-[#eab308] px-1 py-0.5 text-center text-[8px] font-semibold text-white">
          Nedostaje
        </div>
        <div className="mt-1 rounded border border-slate-200 bg-slate-50 p-1.5 text-left dark:border-slate-600 dark:bg-slate-700/80">
          <p className="text-[9px] font-bold text-slate-800 dark:text-slate-100">Klijent A</p>
          <p className="text-[8px] text-slate-600 dark:text-slate-400">PDV prijava</p>
        </div>
      </div>
      <div className="hidden min-w-0 flex-1 flex-col rounded bg-white/80 p-1 dark:bg-slate-800/80 sm:flex">
        <div className="rounded bg-[#22c55e] px-1 py-0.5 text-[8px] font-semibold text-white">
          …
        </div>
      </div>
    </div>
  )
}

function PreviewRadarColumns() {
  const cols = [
    { label: 'Zakašnjelo', bg: 'bg-[#ef4444]' },
    { label: 'Uskoro', bg: 'bg-[#f97316]' },
    { label: 'Nedostaje', bg: 'bg-[#eab308]' },
    { label: 'Završeno', bg: 'bg-[#22c55e]' },
  ]
  return (
    <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
      {cols.map((c) => (
        <div
          key={c.label}
          className="flex min-h-[52px] flex-col overflow-hidden rounded border border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-700"
        >
          <div className={`px-1 py-1 text-center text-[7px] font-semibold text-white ${c.bg}`}>
            {c.label}
          </div>
          <div className="flex-1 bg-slate-50 dark:bg-slate-800/80" />
        </div>
      ))}
    </div>
  )
}
