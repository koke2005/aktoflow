import { useToastStore } from '../store/toastStore'

/** Fiksni kontejner za toast poruke (success / error / info). */
export function ToastViewport() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  if (toasts.length === 0) {
    return null
  }

  return (
    <div
      className="pointer-events-none fixed bottom-6 right-6 z-[200] flex max-w-sm flex-col gap-2"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => dismiss(t.id)}
          className={[
            'pointer-events-auto w-full rounded-lg border px-4 py-3 text-left text-sm font-medium shadow-lg transition',
            t.kind === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-900',
            t.kind === 'error' && 'border-red-200 bg-red-50 text-red-900',
            t.kind === 'info' &&
              'border-slate-200 bg-white text-slate-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {t.message}
        </button>
      ))}
    </div>
  )
}
