import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import i18n, { LANGUAGE_STORAGE_KEY, type AppLanguage } from '../i18n'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { useThemeStore } from '../store/themeStore'
import { useToastStore } from '../store/toastStore'
import type { FirmPlan } from '../types/database'

export function SettingsPage() {
  const { t } = useTranslation()
  const toast = useToastStore((s) => s.show)
  const profile = useAuthStore((s) => s.profile)
  const loadProfile = useAuthStore((s) => s.loadProfile)
  const isDark = useThemeStore((s) => s.isDark)
  const toggleTheme = useThemeStore((s) => s.toggleTheme)

  const [firmName, setFirmName] = useState('')
  const [plan, setPlan] = useState<FirmPlan>('solo')
  const [savingFirm, setSavingFirm] = useState(false)
  const [fullName, setFullName] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  const [teamUsers, setTeamUsers] = useState<
    { id: string; full_name: string; email: string; role: string }[]
  >([])

  const loadFirm = useCallback(async () => {
    if (!profile?.firm_id) {
      return
    }
    const { data, error } = await supabase
      .from('firms')
      .select('name, plan')
      .eq('id', profile.firm_id)
      .maybeSingle()
    if (!error && data) {
      setFirmName(data.name ?? '')
      setPlan((data.plan as FirmPlan) ?? 'solo')
    }
  }, [profile?.firm_id])

  useEffect(() => {
    setFullName(profile?.full_name ?? '')
  }, [profile?.full_name])

  const loadTeamUsers = useCallback(async () => {
    if (!profile?.firm_id) {
      return
    }
    const { data: firm } = await supabase
      .from('firms')
      .select('plan')
      .eq('id', profile.firm_id)
      .maybeSingle()
    const p = firm?.plan as FirmPlan | undefined
    if (p !== 'team' && p !== 'agency') {
      setTeamUsers([])
      return
    }
    const { data } = await supabase
      .from('users')
      .select('id, full_name, email, role')
      .eq('firm_id', profile.firm_id)
      .order('full_name')
    setTeamUsers((data ?? []) as typeof teamUsers)
  }, [profile?.firm_id])

  useEffect(() => {
    void loadFirm()
    void loadTeamUsers()
  }, [loadFirm, loadTeamUsers])

  async function saveFirm(e: FormEvent) {
    e.preventDefault()
    if (!profile?.firm_id || !firmName.trim()) {
      return
    }
    setSavingFirm(true)
    const { error } = await supabase
      .from('firms')
      .update({ name: firmName.trim() })
      .eq('id', profile.firm_id)
    setSavingFirm(false)
    if (error) {
      toast('error', t('settings.firmSaveError'))
      return
    }
    toast('success', t('settings.firmSaveSuccess'))
  }

  async function saveProfile(e: FormEvent) {
    e.preventDefault()
    if (!profile?.id || !fullName.trim()) {
      return
    }
    setSavingProfile(true)
    const { error } = await supabase
      .from('users')
      .update({ full_name: fullName.trim() })
      .eq('id', profile.id)
    setSavingProfile(false)
    if (error) {
      toast('error', t('settings.profileSaveError'))
      return
    }
    await loadProfile()
    toast('success', t('settings.profileSaveSuccess'))
  }

  function setLanguage(lng: AppLanguage) {
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lng)
    } catch {
      // ignore
    }
    void i18n.changeLanguage(lng)
    toast('success', t('settings.languageSaved'))
  }

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <div>
        <h2 className="text-xl font-semibold text-primary">{t('settings.title')}</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t('settings.subtitle')}</p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t('settings.profileSection')}</h3>
        <form onSubmit={saveProfile} className="mt-4 space-y-4">
          <div>
            <label htmlFor="profile-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              {t('settings.profileName')}
            </label>
            <input
              id="profile-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            />
          </div>
          <button
            type="submit"
            disabled={savingProfile}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {savingProfile ? t('auth.submitting') : t('settings.profileSave')}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t('settings.firmSection')}</h3>
        <form onSubmit={saveFirm} className="mt-4 space-y-4">
          <div>
            <label htmlFor="firm-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              {t('settings.firmName')}
            </label>
            <input
              id="firm-name"
              value={firmName}
              onChange={(e) => setFirmName(e.target.value)}
              className="mt-1 w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            />
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t('settings.planLabel')}:{' '}
            <span className="font-medium text-slate-900 dark:text-slate-100">{t(`settings.plan.${plan}`)}</span>
          </p>
          <button
            type="submit"
            disabled={savingFirm}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {savingFirm ? t('auth.submitting') : t('settings.firmSave')}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t('settings.languageSection')}</h3>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{t('settings.languageHint')}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setLanguage('sr')}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
          >
            {t('languageModal.sr')}
          </button>
          <button
            type="button"
            onClick={() => setLanguage('en')}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
          >
            {t('languageModal.en')}
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t('settings.teamSection')}</h3>
        {plan === 'team' || plan === 'agency' ? (
          <>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{t('settings.teamHint')}</p>
            {teamUsers.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{t('settings.teamEmpty')}</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[400px] text-left text-sm">
                  <thead className="border-b border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300">
                    <tr>
                      <th className="py-2 pr-4">{t('settings.teamName')}</th>
                      <th className="py-2 pr-4">{t('settings.teamEmail')}</th>
                      <th className="py-2">{t('settings.teamRole')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamUsers.map((u) => (
                      <tr key={u.id} className="border-b border-slate-100 dark:border-slate-700">
                        <td className="py-2 pr-4 font-medium dark:text-slate-100">{u.full_name}</td>
                        <td className="py-2 pr-4 text-slate-700 dark:text-slate-300">{u.email}</td>
                        <td className="py-2 text-slate-600 dark:text-slate-400">{u.role}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{t('settings.teamSoloOnly')}</p>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t('settings.appearance')}</h3>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{t('settings.darkModeDesc')}</p>
        <div className="mt-4 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-600 dark:bg-slate-700">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('settings.darkMode')}</span>
          <button
            type="button"
            role="switch"
            aria-checked={isDark}
            onClick={toggleTheme}
            className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors ${isDark ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-500'}`}
          >
            <span
              className={`pointer-events-none inline-block size-6 translate-y-0.5 rounded-full bg-white shadow transition ${isDark ? 'translate-x-5' : 'translate-x-1'}`}
            />
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 dark:border-slate-600 dark:bg-slate-800/60">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t('settings.billingSection')}</h3>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{t('settings.billingPlaceholder')}</p>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">{t('settings.billingLemon')}</p>
      </section>
    </div>
  )
}
