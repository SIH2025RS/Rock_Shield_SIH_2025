import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { apiGetAuth, apiPutAuth } from '../../services/api'
import { Bell, Activity } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function CaveMinerDashboard() {
  const { t } = useTranslation(['dashboard', 'common'])
  const { getToken } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tasks, setTasks] = useState([])
  const [alerts, setAlerts] = useState([])

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const token = await getToken({ template: 'backend' })
        const [t, a] = await Promise.all([
          apiGetAuth('/api/miner/tasks', token),
          apiGetAuth('/api/miner/alerts', token),
        ])
        if (!mounted) return
        setTasks(t.tasks || [])
        setAlerts(a.alerts || [])
        setLoading(false)
      } catch (e) {
        if (!mounted) return
        setError(String(e?.message || t('common:error_load') || 'Failed to load'))
        setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [getToken])

  async function acknowledgeAlert(id) {
    try {
      const token = await getToken({ template: 'backend' })
      await apiPutAuth(`/api/operator/alerts/${id}/acknowledge`, token, {})
      setAlerts(prev => prev.map(a => (a.id === id ? { ...a, status: 'acknowledged' } : a)))
    } catch (e) {
      // soft-fail
    }
  }

  if (loading) return <div className="p-6">{t('common:loading')}</div>
  if (error) return <div className="p-6 text-red-600">{error}</div>

  const acked = alerts.filter(a => a.status === 'acknowledged').length

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="mb-1 text-3xl font-bold text-slate-900 dark:text-white">{t('dashboard:cave_miner.title')}</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">{t('dashboard:cave_miner.subtitle')}</p>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-800 p-6 shadow-sm">
            <div className="text-slate-500 text-sm">{t('dashboard:cave_miner.my_tasks')}</div>
            <div className="mt-1 flex items-center justify-between">
              <div className="text-3xl font-bold text-blue-600">{tasks.length}</div>
              <div className="rounded-full p-3 bg-blue-50"><Activity className="w-6 h-6 text-blue-600" /></div>
            </div>
          </div>
          <div className="rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-800 p-6 shadow-sm">
            <div className="text-slate-500 text-sm">{t('dashboard:cave_miner.forwarded_alerts')}</div>
            <div className="mt-1 flex items-center justify-between">
              <div className="text-3xl font-bold text-amber-600">{alerts.length}</div>
              <div className="rounded-full p-3 bg-amber-50"><Bell className="w-6 h-6 text-amber-600" /></div>
            </div>
          </div>
          <div className="rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-800 p-6 shadow-sm">
            <div className="text-slate-500 text-sm">{t('dashboard:cave_miner.acknowledged')}</div>
            <div className="mt-1 flex items-center justify-between">
              <div className="text-3xl font-bold text-emerald-600">{acked}</div>
              <div className="rounded-full p-3 bg-emerald-50"><Bell className="w-6 h-6 text-emerald-600" /></div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-800 p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-3">{t('dashboard:cave_miner.my_tasks')}</h2>
            <ul className="space-y-2 max-h-80 overflow-auto">
              {tasks.map(t => (
                <li key={t.id} className="rounded-xl border p-3 flex items-center justify-between bg-white dark:bg-slate-900">
                  <div>
                    <div className="font-medium">{t.title}</div>
                    <div className="text-xs text-slate-600">{t('dashboard:cave_miner.status') || 'Status'}: {t.status}</div>
                  </div>
                </li>
              ))}
              {tasks.length === 0 && <div className="text-sm text-slate-500">{t('dashboard:cave_miner.no_tasks')}</div>}
            </ul>
          </div>
          <div className="rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-800 p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-3">{t('dashboard:cave_miner.forwarded_alerts')}</h2>
            <ul className="space-y-2 max-h-80 overflow-auto">
              {alerts.map(a => (
                <li key={a.id} className="rounded-xl border p-3 bg-white dark:bg-slate-900">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{a.title}</div>
                    <div className="text-xs text-slate-600">{new Date(a.created_at).toLocaleString()}</div>
                  </div>
                  <div className="text-xs text-slate-700">{a.description || ''}</div>
                  <div className="mt-2">
                    <button className="btn-secondary" onClick={() => acknowledgeAlert(a.id)} disabled={a.status === 'acknowledged'}>
                      {a.status === 'acknowledged' ? t('dashboard:cave_miner.acknowledged') : t('common:actions.acknowledge') || 'Acknowledge'}
                    </button>
                  </div>
                </li>
              ))}
              {alerts.length === 0 && <div className="text-sm text-slate-500">{t('dashboard:cave_miner.no_alerts')}</div>}
            </ul>
          </div>
        </div>
      </section>
    </main>
  )
}
