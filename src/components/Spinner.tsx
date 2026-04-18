type SpinnerProps = {
  label?: string
  fullPage?: boolean
}

/** Jedinstveni loading indikator za celu aplikaciju. */
export function Spinner({ label, fullPage = false }: SpinnerProps) {
  return (
    <div
      className={
        fullPage
          ? 'flex min-h-[40vh] items-center justify-center'
          : 'flex items-center justify-center'
      }
      role="status"
      aria-live="polite"
    >
      <div
        className="size-10 animate-spin rounded-full border-2 border-primary border-t-transparent"
        aria-hidden
      />
      <span className="sr-only">{label ?? 'Loading'}</span>
    </div>
  )
}
