import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { apiGetAuth, apiPostAuth } from '../services/api'

export default function Miner() {
  const { getToken } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tasks, setTasks] = useState([])

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const token = await getToken({ template: 'backend' })
        const data = await apiGetAuth('/api/miner/tasks', token)
        if (!mounted) return
        setTasks(data.tasks || [])
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

  async function updateStatus(taskId, status) {
    try {
      const token = await getToken({ template: 'backend' })
      await apiPostAuth('/api/miner/update-status', token, { taskId, status })
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)))
    } catch (e) {
      alert('Failed to update: ' + (e?.message || 'Unknown error'))
    }
  }

  if (loading) return <div className="p-6">Loading…</div>
  if (error) return <div className="p-6 text-red-600">{error}</div>

  return (
    <main className="mx-auto max-w-6xl px-4">
      <section className="py-10">
        <h1 className="mb-2">Miner</h1>
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
                  <button className="btn-primary" onClick={() => updateStatus(t.id, 'done')}>Complete</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  )
}
