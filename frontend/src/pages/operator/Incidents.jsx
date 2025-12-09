import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { apiGetAuth, apiUploadAuth, API_BASE_URL } from '../../services/api'
import { MapPin, Paperclip, Plus, RefreshCcw } from 'lucide-react'

import { useTranslation } from 'react-i18next'

export default function OperatorIncidents() {
  const { t } = useTranslation(['operator', 'common'])
  const { getToken } = useAuth()
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [incident, setIncident] = useState({ title: '', description: '', incident_type: 'rockfall', location_name: '', location_lat: '', location_lon: '', severity: 'high' })
  const [incidentFiles, setIncidentFiles] = useState([])
  const [status, setStatus] = useState('idle')

  async function loadIncidents() {
    try {
      setLoading(true)
      const token = await getToken({ template: 'backend' })
      const res = await apiGetAuth('/api/operator/incidents?limit=200', token)
      setIncidents(res.incidents || [])
    } catch (e) {
      setLoading(true)
      const token = await getToken({ template: 'backend' })
      const res = await apiGetAuth('/api/operator/incidents?limit=200', token)
      setIncidents(res.incidents || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true
      ; (async () => { if (mounted) await loadIncidents() })()
    return () => { mounted = false }
  }, [getToken])

  async function submitIncident(e) {
    e.preventDefault()
    try {
      setStatus('submitting')
      const token = await getToken({ template: 'backend' })
      const form = new FormData()
      Object.entries(incident).forEach(([k, v]) => form.append(k, v))
      for (const f of incidentFiles) form.append('files', f)
      await apiUploadAuth('/api/operator/incidents', token, form)
      setIncident({ title: '', description: '', incident_type: 'rockfall', location_name: '', location_lat: '', location_lon: '', severity: 'high' })
      setIncidentFiles([])
      setStatus('success')
      setTimeout(() => setStatus('idle'), 1500)
      await loadIncidents()
      setShowForm(false)
    } catch (e) {
      setStatus(e?.message || 'error')
    }
  }

  function removeFile(idx) {
    setIncidentFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('incidents_page.title')}</h2>
          <div className="text-sm text-slate-600 dark:text-slate-400">{t('incidents_page.subtitle')}</div>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={() => loadIncidents()} disabled={loading}><RefreshCcw size={14} /> {t('common:actions.refresh')}</button>
          <button className={`btn-primary ${showForm ? 'btn-ghost' : ''}`} onClick={() => setShowForm(!showForm)}>{showForm ? t('common:close') : (<span className="inline-flex items-center gap-1"><Plus size={14} /> {t('incidents_page.add_btn')}</span>)}</button>
        </div>
      </div>

      {showForm && (
        <div className="grid gap-6 md:grid-cols-3 mb-6">
          <div className="rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-800 p-6 shadow-sm md:col-span-2">
            <form onSubmit={submitIncident}>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">{t('incidents_page.form.title')}</label>
                  <input className="input mt-1 w-full" placeholder={t('placeholders.title')} value={incident.title} onChange={(e) => setIncident({ ...incident, title: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium">{t('incidents_page.form.type')}</label>
                  <select className="input mt-1 w-full" value={incident.incident_type} onChange={(e) => setIncident({ ...incident, incident_type: e.target.value })}>
                    <option value="rockfall">{t('incidents_page.types.rockfall')}</option>
                    <option value="hazard">{t('incidents_page.types.hazard')}</option>
                    <option value="near_miss">{t('incidents_page.types.near_miss')}</option>
                    <option value="equipment">{t('incidents_page.types.equipment')}</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">{t('incidents_page.form.severity')}</label>
                  <select className="input mt-1 w-full" value={incident.severity} onChange={(e) => setIncident({ ...incident, severity: e.target.value })}>
                    <option value="low">{t('tasks_page.priorities.low')}</option>
                    <option value="medium">{t('tasks_page.priorities.medium')}</option>
                    <option value="high">{t('tasks_page.priorities.high')}</option>
                    <option value="critical">{t('tasks_page.priorities.critical')}</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">{t('incidents_page.form.location_name')}</label>
                  <div className="relative mt-1">
                    <input className="input w-full pl-8" placeholder="Bench, pit, landmark" value={incident.location_name} onChange={(e) => setIncident({ ...incident, location_name: e.target.value })} />
                    <MapPin size={16} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">{t('incidents_page.form.lat')}</label>
                  <input className="input mt-1 w-full" placeholder="e.g. 20.5937" value={incident.location_lat} onChange={(e) => setIncident({ ...incident, location_lat: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium">{t('incidents_page.form.lon')}</label>
                  <input className="input mt-1 w-full" placeholder="e.g. 78.9629" value={incident.location_lon} onChange={(e) => setIncident({ ...incident, location_lon: e.target.value })} />
                </div>
              </div>
              <div className="mt-3">
                <label className="text-sm font-medium">{t('incidents_page.form.desc')}</label>
                <textarea className="input mt-1 w-full" rows={4} placeholder={t('placeholders.description')} value={incident.description} onChange={(e) => setIncident({ ...incident, description: e.target.value })} />
              </div>
              <div className="mt-3">
                <label className="text-sm font-medium">{t('incidents_page.form.attachments')}</label>
                <div className="mt-1 rounded-lg border border-dashed p-4 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Paperclip size={16} />
                    <span>{t('incidents_page.form.upload_prompt')}</span>
                  </div>
                  <input className="mt-2" type="file" multiple onChange={(e) => setIncidentFiles(Array.from(e.target.files || []))} />
                  {incidentFiles.length > 0 && (
                    <ul className="mt-2 space-y-1 text-xs">
                      {incidentFiles.map((f, idx) => (
                        <li key={idx} className="flex items-center justify-between gap-3 border-b py-1 last:border-0">
                          <span className="truncate">{f.name}</span>
                          <button type="button" className="text-slate-500 hover:text-red-600" onClick={() => removeFile(idx)}>{t('common:delete')}</button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <button className="btn-primary" type="submit" disabled={status === 'submitting' || !incident.title || !incident.description}>
                  {status === 'submitting' ? t('reports_page.form.submitting') : t('incidents_page.form.submit')}
                </button>
                {status === 'success' && <span className="badge badge-green">{t('reports_page.form.submitted')}</span>}
                {status !== 'idle' && status !== 'success' && status !== 'submitting' && <span className="badge badge-red">{String(status)}</span>}
              </div>
            </form>
          </div>
          <div className="rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-800 p-6 shadow-sm">
            <h3 className="font-medium mb-2">{t('incidents_page.tips_title')}</h3>
            <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
              <li>{t('incidents_page.tips.one')}</li>
              <li>{t('incidents_page.tips.two')}</li>
              <li>{t('incidents_page.tips.three')}</li>
              <li>{t('incidents_page.tips.four')}</li>
            </ul>
            <div className="mt-4 text-xs text-slate-500">{t('incidents_page.admin_note')}</div>
          </div>
        </div>
      )}

      <div className="rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-800 p-6 shadow-sm">
        <h3 className="font-medium mb-3">{t('incidents_page.recent_title')}</h3>
        {loading && <div className="text-sm text-slate-500">{t('messages.loading')}</div>}
        {!loading && incidents.length === 0 && <div className="text-sm text-slate-500">{t('incidents_page.no_incidents')}</div>}
        <ul className="space-y-3 max-h-[640px] overflow-auto">
          {incidents.map((inc) => (
            <li key={inc.id} className="rounded-xl border p-3 bg-white dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <div className="font-medium">{inc.title}</div>
                <div className="text-xs text-slate-600">{new Date(inc.created_at).toLocaleString()}</div>
              </div>
              <div className="text-xs text-slate-600 mt-1">{inc.incident_type} · {inc.severity || '—'} · {inc.status}</div>
              <div className="text-sm text-slate-700 mt-1">{inc.description || ''}</div>
              {Array.isArray(inc.attachments) && inc.attachments.length > 0 && (
                <div className="mt-2 grid gap-2 grid-cols-3">
                  {inc.attachments.filter(a => (a.mimetype || '').startsWith('image/')).slice(0, 9).map((a, idx) => (
                    <img key={idx} className="h-28 w-full object-cover rounded border" src={`${API_BASE_URL}/${a.path}`} alt={a.originalname || 'attachment'} />
                  ))}
                </div>
              )}
              {typeof inc.location_lat === 'number' && typeof inc.location_lon === 'number' && (
                <div className="text-xs text-slate-500 mt-1">{inc.location_lat.toFixed(5)}, {inc.location_lon.toFixed(5)}</div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
