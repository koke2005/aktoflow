import { useTranslation } from 'react-i18next'
import i18n, { LANGUAGE_STORAGE_KEY, type AppLanguage } from '../i18n'

type LanguagePickerModalProps = {
  open: boolean
  onClose: () => void
}

/**
 * Prvi izbor jezika (onboarding). Čuva `aktoflow_language` i sinhronizuje i18n.
 */
export function LanguagePickerModal({ open, onClose }: LanguagePickerModalProps) {
  const { t } = useTranslation()

  if (!open) {
    return null
  }

  function pickLanguage(lng: AppLanguage) {
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lng)
    } catch {
      // localStorage nedostupan
    }
    void i18n.changeLanguage(lng)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lang-modal-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl dark:bg-slate-800">
        <p className="text-center text-lg font-bold tracking-tight text-accent">{t('app.name')}</p>
        <h2
          id="lang-modal-title"
          className="mt-3 text-center text-xl font-semibold text-primary md:text-2xl"
        >
          {t('languageModal.title')}
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-300">{t('languageModal.descriptionSr')}</p>
        <p className="text-center text-sm text-slate-600 dark:text-slate-300">{t('languageModal.descriptionEn')}</p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center sm:gap-4">
          <button
            type="button"
            onClick={() => pickLanguage('sr')}
            className="flex-1 rounded-xl bg-primary px-6 py-4 text-base font-semibold text-white shadow-md transition hover:bg-[#152a45] focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
          >
            🇷🇸 {t('languageModal.sr')}
          </button>
          <button
            type="button"
            onClick={() => pickLanguage('en')}
            className="flex-1 rounded-xl bg-primary px-6 py-4 text-base font-semibold text-white shadow-md transition hover:bg-[#152a45] focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
          >
            🇬🇧 {t('languageModal.en')}
          </button>
        </div>
      </div>
    </div>
  )
}
