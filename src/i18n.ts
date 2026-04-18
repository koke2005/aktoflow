import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import sr from './locales/sr.json'

/** Ključ u localStorage za izabrani jezik (modal iz onboardinga koristi isti ključ u kasnijim koracima). */
export const LANGUAGE_STORAGE_KEY = 'aktoflow_language'

export type AppLanguage = 'sr' | 'en'

function readStoredLanguage(): AppLanguage | null {
  try {
    const raw = localStorage.getItem(LANGUAGE_STORAGE_KEY)
    if (raw === 'sr' || raw === 'en') {
      return raw
    }
  } catch {
    // localStorage nedostupan (npr. private mode) — ostaje default
  }
  return null
}

void i18n.use(initReactI18next).init({
  resources: {
    sr: { translation: sr },
    en: { translation: en },
  },
  lng: readStoredLanguage() ?? 'sr',
  fallbackLng: 'sr',
  interpolation: {
    escapeValue: false,
  },
})

i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng === 'en' ? 'en' : 'sr'
})

document.documentElement.lang = i18n.language === 'en' ? 'en' : 'sr'

export default i18n
