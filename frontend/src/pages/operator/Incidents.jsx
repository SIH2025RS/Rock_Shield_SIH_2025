import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { apiGetAuth, apiUploadAuth, API_BASE_URL } from '../../services/api'
import { MapPin, Paperclip, Plus, RefreshCcw } from 'lucide-react'

export default function OperatorIncidents() {
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
      // soft-fail
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true
    ;(async () => { if (mounted) await loadIncidents() })()
    return () => { mounted = false }
  }, [getToken])

  async function submitIncident(e) {
    e.preventDefault()
    try {
      setStatus('submitting')
      const token = await getToken({ template: 'backend' })
      const form = new FormData()
      Object.entries(incident).forEach(([k,v]) => form.append(k, v))
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
    <div className="section">
      <div className="flex flex-wrap items-center justify-between mb-4">
        <div>
          <h2>Incidents</h2>
          <div className="muted text-xs">View and report incidents with attachments</div>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={() => loadIncidents()} disabled={loading}><RefreshCcw size={14} /> Refresh</button>
          <button className={`btn-primary ${showForm ? 'btn-ghost' : ''}`} onClick={() => setShowForm(!showForm)}>{showForm ? 'Close' : (<span className="inline-flex items-center gap-1"><Plus size={14} /> Add Incident</span>)}</button>
        </div>
      </div>

      {showForm && (
        <div className="grid gap-6 md:grid-cols-3 mb-6">
          <div className="card-subtle md:col-span-2">
            <form onSubmit={submitIncident}>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <input className="input mt-1 w-full" placeholder="Short incident title" value={incident.title} onChange={(e) => setIncident({ ...incident, title: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <select className="input mt-1 w-full" value={incident.incident_type} onChange={(e) => setIncident({ ...incident, incident_type: e.target.value })}>
                    <option value="rockfall">rockfall</option>
                    <option value="hazard">hazard</option>
                    <option value="near_miss">near_miss</option>
                    <option value="equipment">equipment</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Severity</label>
                  <select className="input mt-1 w-full" value={incident.severity} onChange={(e) => setIncident({ ...incident, severity: e.target.value })}>
                    <option value="low">low</option>
                    <option value="medium">medium</option>
                    <option value="high">high</option>
                    <option value="critical">critical</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Location name</label>
                  <div className="relative mt-1">
                    <input className="input w-full pl-8" placeholder="Bench, pit, landmark" value={incident.location_name} onChange={(e) => setIncident({ ...incident, location_name: e.target.value })} />
                    <MapPin size={16} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Latitude</label>
                  <input className="input mt-1 w-full" placeholder="e.g. 20.5937" value={incident.location_lat} onChange={(e) => setIncident({ ...incident, location_lat: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium">Longitude</label>
                  <input className="input mt-1 w-full" placeholder="e.g. 78.9629" value={incident.location_lon} onChange={(e) => setIncident({ ...incident, location_lon: e.target.value })} />
                </div>
              </div>
              <div className="mt-3">
                <label className="text-sm font-medium">Description</label>
                <textarea className="input mt-1 w-full" rows={4} placeholder="Describe what happened, when, and any contributing factors" value={incident.description} onChange={(e) => setIncident({ ...incident, description: e.target.value })} />
              </div>
              <div className="mt-3">
                <label className="text-sm font-medium">Attachments</label>
                <div className="mt-1 rounded-lg border border-dashed p-4 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Paperclip size={16} />
                    <span>Upload images, videos, or PDFs</span>
                  </div>
                  <input className="mt-2" type="file" multiple onChange={(e) => setIncidentFiles(Array.from(e.target.files || []))} />
                  {incidentFiles.length > 0 && (
                    <ul className="mt-2 space-y-1 text-xs">
                      {incidentFiles.map((f, idx) => (
                        <li key={idx} className="flex items-center justify-between gap-3 border-b py-1 last:border-0">
                          <span className="truncate">{f.name}</span>
                          <button type="button" className="text-slate-500 hover:text-red-600" onClick={() => removeFile(idx)}>Remove</button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <button className="btn-primary" type="submit" disabled={status==='submitting' || !incident.title || !incident.description}>
                  {status==='submitting' ? 'Submitting…' : 'Submit Incident'}
                </button>
                {status==='success' && <span className="badge badge-green">Submitted</span>}
                {status!=='idle' && status!=='success' && status!=='submitting' && <span className="badge badge-red">{String(status)}</span>}
              </div>
            </form>
          </div>
          <div className="card-subtle">
            <h3 className="font-medium mb-2">Tips for clear reports</h3>
            <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
              <li>Provide specific location and time.</li>
              <li>Describe conditions (weather, terrain, equipment).</li>
              <li>Attach clear photos or videos when safe.</li>
              <li>Use severity to indicate urgency.</li>
            </ul>
            <div className="mt-4 text-xs text-slate-500">System admins will review and acknowledge your report.</div>
          </div>
        </div>
      )}

      <div className="card-subtle">
        <h3 className="font-medium mb-3">Recent Incidents</h3>
        {loading && <div className="text-sm text-slate-500">Loading…</div>}
        {!loading && incidents.length === 0 && <div className="text-sm text-slate-500">No incidents yet</div>}
        <ul className="space-y-3 max-h-[640px] overflow-auto">
          {incidents.map((inc) => (
            <li key={inc.id} className="rounded border p-3">
              <div className="flex items-center justify-between">
                <div className="font-medium">{inc.title}</div>
                <div className="text-xs text-slate-600">{new Date(inc.created_at).toLocaleString()}</div>
              </div>
              <div className="text-xs text-slate-600 mt-1">{inc.incident_type} · {inc.severity || '—'} · {inc.status}</div>
              <div className="text-sm text-slate-700 mt-1">{inc.description || ''}</div>
              {Array.isArray(inc.attachments) && inc.attachments.length > 0 && (
                <div className="mt-2 grid gap-2 grid-cols-3">
                  {inc.attachments.filter(a => (a.mimetype || '').startsWith('image/')).slice(0,9).map((a, idx) => (
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
