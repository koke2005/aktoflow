import {
  CalendarDays,
  LayoutGrid,
  LogOut,
  Settings,
  Users,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { ToastViewport } from './Toast'

/** Glavni layout sa sidebarom za ulogovane korisnike. */
export function Layout() {
  const { t } = useTranslation()
  const { profile, signOut } = useAuth()
  const location = useLocation()
  const [firmName, setFirmName] = useState<string | null>(null)

  useEffect(() => {
    if (!profile?.firm_id) {
      setFirmName(null)
      return
    }
    let cancelled = false
    void (async () => {
      const { data, error } = await supabase
        .from('firms')
        .select('name')
        .eq('id', profile.firm_id)
        .maybeSingle()
      if (!cancelled && !error && data?.name) {
        setFirmName(data.name)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [profile?.firm_id])

  const pageTitleKey = useMemo(() => {
    const p = location.pathname
    if (p === '/dashboard' || p.startsWith('/dashboard')) return 'nav.dashboard'
    if (p === '/clients') return 'nav.clients'
    if (p.startsWith('/clients/')) return 'nav.clientDetail'
    if (p.startsWith('/deadlines')) return 'nav.deadlines'
    if (p.startsWith('/settings')) return 'nav.settings'
    return 'nav.dashboard'
  }, [location.pathname])

  const navClass = ({ isActive }: { isActive: boolean }) =>
    [
      'flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
      isActive
        ? 'bg-primary text-white'
        : 'text-slate-700 hover:bg-[#1e3a5f]/10',
    ].join(' ')

  return (
    <div className="flex min-h-dvh bg-slate-50">
      <aside className="flex w-[240px] shrink-0 flex-col border-r border-slate-200 bg-[#f8fafc]">
        <div className="border-b border-slate-200/80 px-4 py-5">
          <span className="text-lg font-bold tracking-tight text-primary">Akto</span>
          <span className="text-lg font-bold tracking-tight text-accent">Flow</span>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-3">
          <NavLink to="/dashboard" className={navClass} end>
            <LayoutGrid className="size-5 shrink-0 opacity-90" aria-hidden />
            {t('nav.dashboard')}
          </NavLink>
          <NavLink to="/clients" className={navClass}>
            <Users className="size-5 shrink-0 opacity-90" aria-hidden />
            {t('nav.clients')}
          </NavLink>
          <NavLink to="/deadlines" className={navClass}>
            <CalendarDays className="size-5 shrink-0 opacity-90" aria-hidden />
            {t('nav.deadlines')}
          </NavLink>
          <NavLink to="/settings" className={navClass}>
            <Settings className="size-5 shrink-0 opacity-90" aria-hidden />
            {t('nav.settings')}
          </NavLink>
        </nav>

        <div className="border-t border-slate-200 p-3">
          <p className="truncate text-sm font-medium text-slate-900">
            {profile?.full_name ?? '—'}
          </p>
          <p className="truncate text-xs text-slate-500">{profile?.email ?? ''}</p>
          <button
            type="button"
            onClick={() => void signOut()}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            <LogOut className="size-4" aria-hidden />
            {t('nav.logout')}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <h1 className="text-lg font-semibold text-primary">{t(pageTitleKey)}</h1>
          <p className="max-w-[50%] truncate text-right text-sm text-slate-600">
            <span className="text-slate-400">{t('nav.firmName')}: </span>
            <span className="font-medium text-slate-800">{firmName ?? '—'}</span>
          </p>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
      <ToastViewport />
    </div>
  )
}
