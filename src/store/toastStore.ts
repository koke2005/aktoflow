import { create } from 'zustand'

export type ToastKind = 'success' | 'error' | 'info'

export interface ToastItem {
  id: string
  kind: ToastKind
  message: string
}

interface ToastState {
  toasts: ToastItem[]
  /** Prikazuje toast i automatski uklanja posle 3s. */
  show: (kind: ToastKind, message: string) => void
  dismiss: (id: string) => void
}

function randomId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  show: (kind, message) => {
    const id = randomId()
    set((s) => ({ toasts: [...s.toasts, { id, kind, message }] }))
    window.setTimeout(() => {
      get().dismiss(id)
    }, 3000)
  },

  dismiss: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
  },
}))
