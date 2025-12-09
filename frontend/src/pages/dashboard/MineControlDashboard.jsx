import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { apiGetAuth } from '../../services/api'
import { Activity, AlertTriangle, Radio, Bell } from 'lucide-react'

export default function MineControlDashboard() {
  const { getToken } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sensors, setSensors] = useState([])
  const [alerts24, setAlerts24] = useState([])
  const [incidents, setIncidents] = useState([])

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const token = await getToken({ template: 'backend' })
        const [s, a24, inc] = await Promise.all([
          apiGetAuth('/api/operator/sensors?limit=1000', token),
          apiGetAuth('/api/operator/map/alerts?hours=24', token),
          apiGetAuth('/api/operator/incidents?limit=200', token),
        ])
        if (!mounted) return
        setSensors(Array.isArray(s.sensors) ? s.sensors : [])
        setAlerts24(Array.isArray(a24.alerts) ? a24.alerts : [])
        setIncidents(Array.isArray(inc.incidents) ? inc.incidents : [])
        setLoading(false)
      } catch (e) {
        if (!mounted) return
        setError(String(e?.message || 'Failed to load'))
        setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [getToken])

  const incidents7d = useMemo(() => {
    const since = Date.now() - 7 * 24 * 3600 * 1000
    return incidents.filter(i => {
      const t = new Date(i.created_at).getTime()
      return Number.isFinite(t) && t >= since
    })
  }, [incidents])

  const criticalAlerts = alerts24.filter(a => a.severity === 'critical')

  if (loading) return <div className="p-6">Loading…</div>
  if (error) return <div className="p-6 text-red-600">{error}</div>

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="mb-1 text-3xl font-bold text-slate-900 dark:text-white">Mine Control</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">Live operations overview for sensors, alerts and incidents.</p>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-800 p-6 shadow-sm">
            <div className="text-slate-500 text-sm">Active Sensors</div>
            <div className="mt-1 flex items-center justify-between">
              <div className="text-3xl font-bold text-blue-600">{sensors.length}</div>
              <div className="rounded-full p-3 bg-blue-50"><Radio className="w-6 h-6 text-blue-600" /></div>
            </div>
          </div>
          <div className="rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-800 p-6 shadow-sm">
            <div className="text-slate-500 text-sm">Alerts (24h)</div>
            <div className="mt-1 flex items-center justify-between">
              <div className="text-3xl font-bold text-red-600">{alerts24.length}</div>
              <div className="rounded-full p-3 bg-red-50"><Bell className="w-6 h-6 text-red-600" /></div>
            </div>
          </div>
          <div className="rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-800 p-6 shadow-sm">
            <div className="text-slate-500 text-sm">Incidents (7d)</div>
            <div className="mt-1 flex items-center justify-between">
              <div className="text-3xl font-bold text-amber-600">{incidents7d.length}</div>
              <div className="rounded-full p-3 bg-amber-50"><AlertTriangle className="w-6 h-6 text-amber-600" /></div>
            </div>
          </div>
          <div className="rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-800 p-6 shadow-sm">
            <div className="text-slate-500 text-sm">Critical Alerts</div>
            <div className="mt-1 flex items-center justify-between">
              <div className="text-3xl font-bold text-rose-600">{criticalAlerts.length}</div>
              <div className="rounded-full p-3 bg-rose-50"><Activity className="w-6 h-6 text-rose-600" /></div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-800 p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-3">Recent Alerts</h2>
            <ul className="space-y-2 max-h-80 overflow-auto">
              {alerts24.slice(0, 12).map(a => (
                <li key={a.id} className="rounded-xl border p-3 bg-white dark:bg-slate-900">
                  <div className="flex items-center justify-between">
                    <div className="font-medium truncate mr-2">{a.title}</div>
                    <span className="badge" style={{ backgroundColor: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1' }}>{a.severity}</span>
                  </div>
                  <div className="text-xs text-slate-600 mt-1">{new Date(a.created_at).toLocaleString()}</div>
                </li>
              ))}
              {alerts24.length === 0 && <div className="text-sm text-slate-500">No alerts in last 24 hours</div>}
            </ul>
          </div>
          <div className="rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-800 p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-3">Registered Sensors</h2>
            <ul className="space-y-2 max-h-80 overflow-auto">
              {sensors.slice(0, 12).map(s => (
                <li key={s.id} className="rounded-xl border p-3 bg-white dark:bg-slate-900">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{s.name || s.sensor_id || 'Sensor'}</div>
                    <div className="text-xs text-slate-600">{s.created_at ? new Date(s.created_at).toLocaleString() : '—'}</div>
                  </div>
                  <div className="text-xs text-slate-600 mt-1">{String(s.sensor_type || 'other')} · {String(s.status || 'unknown')}</div>
                </li>
              ))}
              {sensors.length === 0 && <div className="text-sm text-slate-500">No registered sensors</div>}
            </ul>
          </div>
        </div>
      </section>
    </main>
  )
}
