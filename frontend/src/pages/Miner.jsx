import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { apiGetAuth, apiPutAuth, API_BASE_URL } from '../services/api'
import { io } from 'socket.io-client'

export default function Miner() {
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
        const data = await apiGetAuth('/api/miner/tasks', token)
        const alertsRes = await apiGetAuth('/api/miner/alerts', token)
        if (!mounted) return
        setTasks(data.tasks || [])
        setAlerts(alertsRes.alerts || [])
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

  // Realtime: receive forwarded alerts
  useEffect(() => {
    const socket = io(API_BASE_URL, { transports: ['websocket'] })
    function onMinerAlert(payload) {
      setAlerts((prev) => [{
        id: payload.id,
        severity: payload.severity,
        title: payload.title,
        description: payload.recommended_action || '',
        status: 'pending',
        forwarded_to_miners: true,
        created_at: new Date().toISOString(),
      }, ...prev])
    }
    socket.on('miner_alert', onMinerAlert)
    return () => {
      socket.off('miner_alert', onMinerAlert)
      socket.disconnect()
    }
  }, [])

  async function updateStatus(taskId, status) {
    try {
      const token = await getToken({ template: 'backend' })
      const res = await apiPutAuth(`/api/operator/tasks/${taskId}`, token, { status })
      setTasks((prev) => prev.map((t) => (t.id === taskId ? res.task : t)))
    } catch (e) {
      alert('Failed to update: ' + (e?.message || 'Unknown error'))
    }
  }

  async function acknowledgeAlert(id) {
    try {
      const token = await getToken({ template: 'backend' })
      await apiPutAuth(`/api/operator/alerts/${id}/acknowledge`, token, {})
      setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, status: 'acknowledged' } : a)))
    } catch (e) {
      alert('Failed to acknowledge alert')
    }
  }

  if (loading) return <div className="p-6">Loading…</div>
  if (error) return <div className="p-6 text-red-600">{error}</div>

  return (
    <main className="mx-auto max-w-6xl px-4">
      <section className="py-10">
        <h1 className="mb-2">Miner</h1>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="mb-4">My Tasks</h2>
            <ul className="space-y-2">
              {tasks.map((t) => (
                <li key={t.id} className="flex items-center justify-between rounded border p-3">
                  <div>
                    <div className="font-medium">{t.title}</div>
                    <div className="text-xs text-slate-600">Status: {t.status}</div>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-secondary" onClick={() => updateStatus(t.id, 'in_progress')}>Start</button>
                    <button className="btn-primary" onClick={() => updateStatus(t.id, 'completed')}>Complete</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="mb-4">Forwarded Alerts</h2>
            <ul className="space-y-2">
              {alerts.map((a) => (
                <li key={a.id} className="rounded border p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{a.title}</div>
                    <div className="text-xs text-slate-600">{new Date(a.created_at).toLocaleString()}</div>
                  </div>
                  <div className="text-xs text-slate-700">{a.description || ''}</div>
                  <div className="mt-2 flex gap-2">
                    <button className="btn-secondary" onClick={() => acknowledgeAlert(a.id)} disabled={a.status === 'acknowledged'}>Acknowledge</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </main>
  )
}

