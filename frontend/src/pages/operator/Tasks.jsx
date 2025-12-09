import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { apiGetAuth, apiPostAuth, apiPutAuth } from '../../services/api'

import { useTranslation } from 'react-i18next'

export default function OperatorTasks() {
  const { t } = useTranslation(['operator', 'common'])
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
    } catch { }
  }

  async function updateTaskStatus(id, status) {
    try {
      const token = await getToken({ template: 'backend' })
      const res = await apiPutAuth(`/api/operator/tasks/${id}`, token, { status })
      setTasks((prev) => prev.map((t) => (t.id === id ? res.task : t)))
    } catch { }
  }

  if (loading) return <div>{t('common:loading')}</div>
  if (error) return <div className="text-red-600">{error}</div>

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{t('tasks_page.title')}</h2>
        <div className="text-sm text-slate-600 dark:text-slate-400">{t('tasks_page.subtitle')}</div>
      </div>
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800 mb-6">
        <form onSubmit={createTask} className="grid grid-cols-1 gap-2">
          <input className="input" placeholder={t('placeholders.title')} value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} />
          <input className="input" placeholder={t('placeholders.description')} value={newTask.description} onChange={(e) => setNewTask({ ...newTask, description: e.target.value })} />
          <div className="flex gap-2">
            <select className="input" value={newTask.task_type} onChange={(e) => setNewTask({ ...newTask, task_type: e.target.value })}>
              <option value="inspection">{t('tasks_page.types.inspection')}</option>
              <option value="alert_response">{t('tasks_page.types.alert_response')}</option>
              <option value="incident_review">{t('tasks_page.types.incident_review')}</option>
            </select>
            <select className="input" value={newTask.priority} onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}>
              <option value="critical">{t('tasks_page.priorities.critical')}</option>
              <option value="high">{t('tasks_page.priorities.high')}</option>
              <option value="medium">{t('tasks_page.priorities.medium')}</option>
              <option value="low">{t('tasks_page.priorities.low')}</option>
            </select>
          </div>
          <button className="btn-primary" type="submit">{t('tasks_page.create_btn')}</button>
        </form>
      </div>
      <ul className="space-y-3 max-h-[600px] overflow-auto">
        {tasks.map((t) => (
          <li key={t.id} className="rounded-xl border p-4 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium">{t.title}</div>
                <div className="text-xs text-slate-600">{t(`tasks_page.types.${t.task_type}`)} · <span className="badge badge-amber">{t(`tasks_page.priorities.${t.priority}`)}</span> · <span className={`badge ${t.status === 'completed' ? 'badge-green' : 'badge-primary'}`}>{t(`common:status.${t.status}`) || t.status}</span></div>
              </div>
              <div className="flex gap-2">
                <button className="btn-secondary" onClick={() => updateTaskStatus(t.id, 'in_progress')}>{t('actions.start')}</button>
                <button className="btn-primary" onClick={() => updateTaskStatus(t.id, 'completed')}>{t('actions.complete')}</button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
