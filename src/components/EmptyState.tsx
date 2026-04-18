import type { LucideIcon } from 'lucide-react'

type EmptyStateProps = {
  icon: LucideIcon
  message: string
}

/** Konzistentni prikaz praznog stanja (ikonica + poruka). */
export function EmptyState({ icon: Icon, message }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
      <Icon className="mb-3 size-12 text-slate-300" aria-hidden />
      <p className="max-w-md text-slate-600">{message}</p>
    </div>
  )
}
