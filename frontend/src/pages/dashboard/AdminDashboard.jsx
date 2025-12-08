import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { apiGetAuth } from '../../services/api'
import { Users as UsersIcon, AlertTriangle, Radio, Activity } from 'lucide-react'

export default function AdminDashboard() {
  const { getToken } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [users, setUsers] = useState([])
  const [incidents, setIncidents] = useState([])
  const [alerts, setAlerts] = useState([])
  const [sensors, setSensors] = useState([])

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const token = await getToken({ template: 'backend' })
        const [u, inc, a, s] = await Promise.all([
          apiGetAuth('/api/admin/users', token),
          apiGetAuth('/api/operator/incidents?limit=100', token),
          apiGetAuth('/api/operator/alerts', token),
          apiGetAuth('/api/operator/sensors?limit=1000', token),
        ])
        if (!mounted) return
        setUsers(u.users || [])
        setIncidents(Array.isArray(inc.incidents) ? inc.incidents : [])
        setAlerts(Array.isArray(a.alerts) ? a.alerts : [])
        setSensors(Array.isArray(s.sensors) ? s.sensors : [])
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

  if (loading) return <div className="p-6">Loading…</div>
  if (error) return <div className="p-6 text-red-600">{error}</div>

  const openIncidents = incidents.filter(i => i.status !== 'acknowledged')

  return (
    <main className="mx-auto max-w-6xl px-4">
      <section className="py-10">
        <h1 className="mb-2">System Admin</h1>
        <p className="text-slate-600">Overview of users, sensors, alerts, and incidents</p>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-slate-500 text-sm">Total Users</div>
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
                <div className="text-slate-500 text-sm">Open Incidents</div>
                <div className="text-3xl font-bold text-amber-600">{openIncidents.length}</div>
              </div>
              <div className="rounded-full p-3 bg-amber-50">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </div>
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-slate-500 text-sm">Recent Alerts</div>
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
                <div className="text-slate-500 text-sm">Registered Sensors</div>
                <div className="text-3xl font-bold text-blue-600">{sensors.length}</div>
              </div>
              <div className="rounded-full p-3 bg-blue-50">
                <Radio className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-3">Users</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-600">
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">Email</th>
                    <th className="py-2 pr-4">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {users.slice(0, 6).map(u => (
                    <tr key={u.clerkUserId} className="border-t">
                      <td className="py-2 pr-4">{u.fullName || u.clerkUserId}</td>
                      <td className="py-2 pr-4">{u.email || '—'}</td>
                      <td className="py-2 pr-4 font-mono">{u.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-3">Recent Incidents</h2>
            <ul className="space-y-2 max-h-64 overflow-auto">
              {incidents.slice(0, 8).map(i => (
                <li key={i.id} className="rounded border p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{i.title}</div>
                    <div className="text-xs text-slate-500">{i.created_at ? new Date(i.created_at).toLocaleString() : '—'}</div>
                  </div>
                  <div className="text-xs text-slate-600 mt-1">{i.incident_type} · {i.severity || '—'} · {i.status || 'submitted'}</div>
                </li>
              ))}
              {incidents.length === 0 && <div className="text-sm text-slate-500">No incidents</div>}
            </ul>
          </div>
          <div className="md:col-span-2 rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-3">Recent Alerts</h2>
            <ul className="space-y-2 max-h-72 overflow-auto">
              {alerts.slice(0, 10).map(a => (
                <li key={a.id} className="rounded border p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{a.title}</div>
                    <span className="badge" style={{ backgroundColor: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1' }}>{a.severity}</span>
                  </div>
                  <div className="text-xs text-slate-600 mt-1">{new Date(a.created_at).toLocaleString()}</div>
                </li>
              ))}
              {alerts.length === 0 && <div className="text-sm text-slate-500">No alerts</div>}
            </ul>
          </div>
        </div>
      </section>
    </main>
  )
}
