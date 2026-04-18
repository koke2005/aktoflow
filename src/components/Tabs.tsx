type TabItem = {
  id: string
  label: string
}

type TabsProps = {
  tabs: TabItem[]
  active: string
  onChange: (id: string) => void
}

/** Jednostavni tabovi sa donjom granicom za aktivni tab. */
export function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-slate-200">
      {tabs.map((tab) => {
        const isActive = tab.id === active
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={[
              '-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-all duration-200',
              isActive
                ? 'border-accent font-semibold text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-800',
            ].join(' ')}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
