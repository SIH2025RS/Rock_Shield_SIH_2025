import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { apiGetAuth, apiPutAuth, apiPostAuth } from '../../services/api'

export default function OperatorAlerts() {
  const { getToken } = useAuth()
  const [alerts, setAlerts] = useState([])
  const [severityColors, setSeverityColors] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newAlert, setNewAlert] = useState({ severity: 'high', title: '', description: '', sensor_id: '', location_lat: '', location_lon: '', recommended_action: '' })
  const [forwardNow, setForwardNow] = useState(true)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const token = await getToken({ template: 'backend' })
        const meta = await apiGetAuth('/api/operator/alerts/meta', token)
        const alertsRes = await apiGetAuth('/api/operator/alerts', token)
        if (!mounted) return
        setSeverityColors(meta.severityColors || {})
        setAlerts(alertsRes.alerts || [])
        setLoading(false)
      } catch (e) {
        if (!mounted) return
        setError(e?.message || 'Failed to load alerts')
        setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [getToken])

  async function acknowledgeAlert(id) {
    try {
      const token = await getToken({ template: 'backend' })
      const res = await apiPutAuth(`/api/operator/alerts/${id}/acknowledge`, token, {})
      setAlerts((prev) => prev.map((a) => (a.id === id ? res.alert : a)))
    } catch {}
  }

  async function forwardAlert(id) {
    try {
      const token = await getToken({ template: 'backend' })
      const res = await apiPutAuth(`/api/operator/alerts/${id}/forward`, token, {})
      setAlerts((prev) => prev.map((a) => (a.id === id ? res.alert : a)))
    } catch {}
  }

  if (loading) return <div>Loading…</div>
  if (error) return <div className="text-red-600">{error}</div>

  return (
    <div className="section">
      <div className="section-header">
        <h2>Alerts</h2>
        <div className="muted text-xs">Latest alerts with severities</div>
      </div>
      <div className="card-subtle">
        <div className="flex items-center justify-between">
          <div className="font-medium">Create a new alert</div>
          <button className="btn-primary" onClick={() => setShowCreate((v) => !v)}>{showCreate ? 'Close' : 'New Alert'}</button>
        </div>
        {showCreate && (
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              try {
                setCreating(true)
                const token = await getToken({ template: 'backend' })
                const lat = newAlert.location_lat !== '' ? parseFloat(newAlert.location_lat) : null
                const lon = newAlert.location_lon !== '' ? parseFloat(newAlert.location_lon) : null
                const payload = {
                  severity: newAlert.severity,
                  title: newAlert.title,
                  description: newAlert.description || null,
                  source: 'manual',
                  sensor_id: newAlert.sensor_id || null,
                  location_lat: Number.isFinite(lat) ? lat : null,
                  location_lon: Number.isFinite(lon) ? lon : null,
                  recommended_action: newAlert.recommended_action || null,
                  metadata: {},
                }
                const created = await apiPostAuth('/api/operator/alerts', token, payload)
                const createdAlert = created.alert
                setAlerts((prev) => [createdAlert, ...prev])
                if (forwardNow && createdAlert?.id) {
                  await apiPutAuth(`/api/operator/alerts/${createdAlert.id}/forward`, token, {})
                }
                setNewAlert({ severity: 'high', title: '', description: '', sensor_id: '', location_lat: '', location_lon: '', recommended_action: '' })
                setShowCreate(false)
              } catch {
              } finally {
                setCreating(false)
              }
            }}
            className="mt-3 grid gap-2 md:grid-cols-2"
          >
            <select className="input" value={newAlert.severity} onChange={(e) => setNewAlert({ ...newAlert, severity: e.target.value })}>
              <option value="critical">critical</option>
              <option value="high">high</option>
              <option value="medium">medium</option>
              <option value="low">low</option>
            </select>
            <input className="input" placeholder="Title" value={newAlert.title} onChange={(e) => setNewAlert({ ...newAlert, title: e.target.value })} />
            <input className="input" placeholder="Sensor ID (optional)" value={newAlert.sensor_id} onChange={(e) => setNewAlert({ ...newAlert, sensor_id: e.target.value })} />
            <input className="input" placeholder="Recommended action (optional)" value={newAlert.recommended_action} onChange={(e) => setNewAlert({ ...newAlert, recommended_action: e.target.value })} />
            <input className="input" placeholder="Latitude (optional)" value={newAlert.location_lat} onChange={(e) => setNewAlert({ ...newAlert, location_lat: e.target.value })} />
            <input className="input" placeholder="Longitude (optional)" value={newAlert.location_lon} onChange={(e) => setNewAlert({ ...newAlert, location_lon: e.target.value })} />
            <textarea className="input md:col-span-2" rows={3} placeholder="Description (optional)" value={newAlert.description} onChange={(e) => setNewAlert({ ...newAlert, description: e.target.value })} />
            <div className="md:col-span-2 flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={forwardNow} onChange={(e) => setForwardNow(e.target.checked)} /> Forward to miners</label>
              <button className="btn-primary" type="submit" disabled={creating}>{creating ? 'Creating…' : 'Create alert'}</button>
            </div>
          </form>
        )}
      </div>
      <ul className="list-pane">
        {alerts.map((a) => (
          <li key={a.id} className="list-item">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold truncate max-w-[50vw]">{a.title}</span>
                  <span className="badge" style={{ backgroundColor: '#f1f5f9', color: severityColors[a.severity] || '#334155', border: `1px solid ${severityColors[a.severity] || '#cbd5e1'}` }}>{a.severity}</span>
                </div>
                <div className="mt-1 text-sm text-slate-700 break-words">{a.description || ''}</div>
                <div className="mt-1 text-xs text-slate-600">Sensor: {a.sensor_id || '—'}{a.location_lat && a.location_lon ? ` · (${a.location_lat}, ${a.location_lon})` : ''}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500">{new Date(a.created_at).toLocaleString()}</div>
                <div className="mt-2 flex flex-wrap justify-end gap-2">
                  <button className="btn-secondary" onClick={() => acknowledgeAlert(a.id)} disabled={a.status === 'acknowledged'}>Acknowledge</button>
                  <button className="btn-primary" onClick={() => forwardAlert(a.id)} disabled={a.forwarded_to_miners}>Forward</button>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
