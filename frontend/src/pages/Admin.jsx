import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { apiGetAuth, apiPostAuth, apiPutAuth } from '../services/api'
import { Users as UsersIcon, AlertTriangle, Radio, Activity } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const ROLES = ['system_admin', 'operator', 'miner']

export default function Admin() {
  const { t } = useTranslation(['admin', 'common'])
  const { getToken } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [users, setUsers] = useState([])
  const [incidents, setIncidents] = useState([])
  const [ackBusy, setAckBusy] = useState({})
  const [alerts, setAlerts] = useState([])
  const [sensors, setSensors] = useState([])

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const token = await getToken({ template: 'backend' })
        const data = await apiGetAuth('/api/admin/users', token)
        const inc = await apiGetAuth('/api/operator/incidents?limit=100', token)
        const alertsRes = await apiGetAuth('/api/operator/alerts', token)
        const sensorsRes = await apiGetAuth('/api/operator/sensors?limit=1000', token)
        if (!mounted) return
        setUsers(data.users || [])
        setIncidents(Array.isArray(inc.incidents) ? inc.incidents : [])
        setAlerts(Array.isArray(alertsRes.alerts) ? alertsRes.alerts : [])
        setSensors(Array.isArray(sensorsRes.sensors) ? sensorsRes.sensors : [])
        setLoading(false)
      } catch (e) {
        if (!mounted) return
        setError(String(e?.message || t('errors.load')))
        setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [getToken])

  async function changeRole(clerkUserId, role) {
    try {
      const token = await getToken({ template: 'backend' })
      await apiPostAuth('/api/admin/update-role', token, { clerkUserId, role })
      setUsers((prev) => prev.map((u) => (u.clerkUserId === clerkUserId ? { ...u, role } : u)))
    } catch (e) {
      alert(t('errors.role_update') + ': ' + (e?.message || t('errors.unknown')))
    }
  }

  async function acknowledgeIncident(id) {
    try {
      setAckBusy((prev) => ({ ...prev, [id]: true }))
      const token = await getToken({ template: 'backend' })
      const res = await apiPutAuth(`/api/operator/incidents/${id}/acknowledge`, token, {})
      setIncidents((prev) => prev.map((i) => (i.id === id ? (res.incident || i) : i)))
    } catch (e) {
      alert(t('errors.acknowledge') + ': ' + (e?.message || t('errors.unknown')))
    } finally {
      setAckBusy((prev) => ({ ...prev, [id]: false }))
    }
  }

  if (loading) return <div className="p-6">{t('common:loading')}</div>
  if (error) return <div className="p-6 text-red-600">{error}</div>

  return (
    <main className="mx-auto max-w-6xl px-4">
      <section className="py-10">
        <h1 className="mb-2">{t('title')}</h1>
        <p className="text-slate-600">{t('subtitle')}</p>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-slate-500 text-sm">{t('total_users')}</div>
                <div className="text-3xl font-bold text-slate-900">{users.length}</div>
              </div>
              <div className="rounded-full p-3 bg-slate-100">
                <UsersIcon className="w-6 h-6 text-slate-700" />
              </div>
            </div>
          </div>
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-slate-500 text-sm">{t('open_incidents')}</div>
                <div className="text-3xl font-bold text-amber-600">{incidents.filter(i => i.status !== 'acknowledged').length}</div>
              </div>
              <div className="rounded-full p-3 bg-amber-50">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </div>
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-slate-500 text-sm">{t('recent_alerts')}</div>
                <div className="text-3xl font-bold text-red-600">{alerts.length}</div>
              </div>
              <div className="rounded-full p-3 bg-red-50">
                <Activity className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-slate-500 text-sm">{t('registered_sensors')}</div>
                <div className="text-3xl font-bold text-blue-600">{sensors.length}</div>
              </div>
              <div className="rounded-full p-3 bg-blue-50">
                <Radio className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-xl border bg-white p-6 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-600">
                  <th className="py-2 pr-4">{t('table.user')}</th>
                  <th className="py-2 pr-4">{t('table.email')}</th>
                  <th className="py-2 pr-4">{t('table.role')}</th>
                  <th className="py-2 pr-4">{t('table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.clerkUserId} className="border-t">
                    <td className="py-2 pr-4">{u.fullName || u.clerkUserId}</td>
                    <td className="py-2 pr-4">{u.email || '—'}</td>
                    <td className="py-2 pr-4 font-mono">{u.role}</td>
                    <td className="py-2 pr-4">
                      <select
                        className="input"
                        value={u.role}
                        onChange={(e) => changeRole(u.clerkUserId, e.target.value)}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8 rounded-xl border bg-white p-6 shadow-sm">
          <div className="mb-3">
            <h2 className="text-lg font-semibold">{t('incidents.title')}</h2>
            <div className="text-slate-600 text-sm">{t('incidents.subtitle')}</div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-600">
                  <th className="py-2 pr-4">{t('incidents.headers.title')}</th>
                  <th className="py-2 pr-4">{t('incidents.headers.type')}</th>
                  <th className="py-2 pr-4">{t('incidents.headers.severity')}</th>
                  <th className="py-2 pr-4">{t('incidents.headers.status')}</th>
                  <th className="py-2 pr-4">{t('incidents.headers.reported_by')}</th>
                  <th className="py-2 pr-4">{t('incidents.headers.created')}</th>
                  <th className="py-2 pr-4">{t('incidents.headers.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((i) => (
                  <tr key={i.id} className="border-t">
                    <td className="py-2 pr-4">
                      <div className="font-medium">{i.title}</div>
                      <div className="text-xs text-slate-500 line-clamp-2 max-w-md">{i.description}</div>
                    </td>
                    <td className="py-2 pr-4 font-mono">{i.incident_type || '—'}</td>
                    <td className="py-2 pr-4 font-mono">{i.severity || '—'}</td>
                    <td className="py-2 pr-4 font-mono">{i.status || 'submitted'}</td>
                    <td className="py-2 pr-4">{i.reported_by_name || '—'}</td>
                    <td className="py-2 pr-4">{i.created_at ? new Date(i.created_at).toLocaleString() : '—'}</td>
                    <td className="py-2 pr-4">
                      {i.status !== 'acknowledged' ? (
                        <button className="btn-secondary" disabled={!!ackBusy[i.id]} onClick={() => acknowledgeIncident(i.id)}>
                          {ackBusy[i.id] ? t('actions.acknowledging') : t('actions.acknowledge')}
                        </button>
                      ) : (
                        <span className="badge badge-green">{t('actions.acknowledged')}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  )
}
