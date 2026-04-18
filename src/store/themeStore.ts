import { create } from 'zustand'

const THEME_STORAGE_KEY = 'aktoflow_theme'

type ThemeState = {
  isDark: boolean
  toggleTheme: () => void
  initTheme: () => void
}

function applyThemeClass(isDark: boolean) {
  if (typeof document === 'undefined') {
    return
  }
  document.documentElement.classList.toggle('dark', isDark)
}

function persistTheme(isDark: boolean) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light')
  } catch {
    // ignore localStorage errors
  }
}

function readInitialTheme(): boolean {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === 'dark') {
      return true
    }
    if (stored === 'light') {
      return false
    }
  } catch {
    // ignore localStorage errors
  }

  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  return false
}

export const useThemeStore = create<ThemeState>((set) => ({
  isDark: false,
  toggleTheme: () =>
    set((state) => {
      const next = !state.isDark
      applyThemeClass(next)
      persistTheme(next)
      return { isDark: next }
    }),
  initTheme: () => {
    const isDark = readInitialTheme()
    applyThemeClass(isDark)
    set({ isDark })
  },
}))
