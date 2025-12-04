import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { apiGetAuth, apiPostAuth, apiPutAuth } from '../../services/api'

export default function OperatorTasks() {
  const { getToken } = useAuth()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newTask, setNewTask] = useState({ title: '', task_type: 'inspection', priority: 'medium', description: '' })

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const token = await getToken({ template: 'backend' })
        const tasksRes = await apiGetAuth('/api/operator/tasks', token)
        if (!mounted) return
        setTasks(tasksRes.tasks || [])
        setLoading(false)
      } catch (e) {
        if (!mounted) return
        setError(e?.message || 'Failed to load tasks')
        setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [getToken])

  async function createTask(e) {
    e.preventDefault()
    try {
      const token = await getToken({ template: 'backend' })
      const res = await apiPostAuth('/api/operator/tasks', token, newTask)
      setTasks((prev) => [res.task, ...prev])
      setNewTask({ title: '', task_type: 'inspection', priority: 'medium', description: '' })
    } catch {}
  }

  async function updateTaskStatus(id, status) {
    try {
      const token = await getToken({ template: 'backend' })
      const res = await apiPutAuth(`/api/operator/tasks/${id}`, token, { status })
      setTasks((prev) => prev.map((t) => (t.id === id ? res.task : t)))
    } catch {}
  }

  if (loading) return <div>Loading…</div>
  if (error) return <div className="text-red-600">{error}</div>

  return (
    <div className="section">
      <div className="section-header">
        <h2>Task Management</h2>
        <div className="muted text-xs">Create and track tasks</div>
      </div>
      <div className="card-subtle">
        <form onSubmit={createTask} className="grid grid-cols-1 gap-2">
          <input className="input" placeholder="Title" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} />
          <input className="input" placeholder="Description" value={newTask.description} onChange={(e) => setNewTask({ ...newTask, description: e.target.value })} />
          <div className="flex gap-2">
            <select className="input" value={newTask.task_type} onChange={(e) => setNewTask({ ...newTask, task_type: e.target.value })}>
              <option value="inspection">inspection</option>
              <option value="alert_response">alert_response</option>
              <option value="incident_review">incident_review</option>
            </select>
            <select className="input" value={newTask.priority} onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}>
              <option value="critical">critical</option>
              <option value="high">high</option>
              <option value="medium">medium</option>
              <option value="low">low</option>
            </select>
          </div>
          <button className="btn-primary" type="submit">Create</button>
        </form>
      </div>
      <ul className="list-pane">
        {tasks.map((t) => (
          <li key={t.id} className="list-item">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium">{t.title}</div>
                <div className="text-xs text-slate-600">{t.task_type} · <span className="badge badge-amber">{t.priority}</span> · <span className={`badge ${t.status==='completed' ? 'badge-green' : 'badge-primary'}`}>{t.status}</span></div>
              </div>
              <div className="flex gap-2">
                <button className="btn-secondary" onClick={() => updateTaskStatus(t.id, 'in_progress')}>Start</button>
                <button className="btn-primary" onClick={() => updateTaskStatus(t.id, 'completed')}>Complete</button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
