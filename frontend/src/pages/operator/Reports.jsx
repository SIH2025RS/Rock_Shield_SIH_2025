import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { apiGetAuth, apiPostAuth } from '../../services/api'
import { Sparkles, Plus, RefreshCcw } from 'lucide-react'

export default function OperatorReports() {
  const { getToken } = useAuth()
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('general')
  const [report, setReport] = useState('')
  const [status, setStatus] = useState('idle')
  const MAX = 1000
  const count = report.length
  const tooLong = count > MAX

  async function loadReports() {
    try {
      setLoading(true)
      const token = await getToken({ template: 'backend' })
      const res = await apiGetAuth('/api/operator/reports?limit=200', token)
      setReports(res.reports || [])
    } catch (e) {
      // soft-fail
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true
    ;(async () => { if (mounted) await loadReports() })()
    return () => { mounted = false }
  }, [getToken])

  async function submitReport(e) {
    e.preventDefault()
    try {
      setStatus('submitting')
      const token = await getToken({ template: 'backend' })
      await apiPostAuth('/api/operator/submit-report', token, { payload: { title, category, message: report } })
      setTitle('')
      setCategory('general')
      setReport('')
      setStatus('success')
      setTimeout(() => setStatus('idle'), 1500)
      await loadReports()
    } catch (e) {
      setStatus(e?.message || 'error')
    }
  }

  function addTemplate(kind) {
    const t = kind === 'weather'
      ? 'Weather note: Light rain, gusty winds near bench 3.'
      : kind === 'rockface'
      ? 'Rockface observation: Fresh cracks observed, minor debris at toe.'
      : 'Equipment issue: Loader vibrating under load; schedule inspection.'
    setReport((r) => (r ? r + '\n' : '') + t)
  }

  return (
    <div className="section">
      <div className="flex flex-wrap items-center justify-between mb-4">
        <div>
          <h2>Reports</h2>
          <div className="muted text-xs">View and submit field reports</div>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={() => loadReports()} disabled={loading}><RefreshCcw size={14} /> Refresh</button>
          <button className={`btn-primary ${showForm ? 'btn-ghost' : ''}`} onClick={() => setShowForm(!showForm)}>{showForm ? 'Close' : (<span className="inline-flex items-center gap-1"><Plus size={14} /> Add Report</span>)}</button>
        </div>
      </div>

      {showForm && (
        <div className="grid gap-6 md:grid-cols-3 mb-6">
          <div className="card-subtle md:col-span-2">
            <form onSubmit={submitReport}>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <input className="input mt-1 w-full" placeholder="Short title" value={title} onChange={(e)=>setTitle(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <select className="input mt-1 w-full" value={category} onChange={(e)=>setCategory(e.target.value)}>
                    <option value="general">general</option>
                    <option value="observation">observation</option>
                    <option value="hazard">hazard</option>
                    <option value="maintenance">maintenance</option>
                  </select>
                </div>
              </div>
              <div className="mt-3">
                <label className="text-sm font-medium">Details</label>
                <textarea value={report} onChange={(e) => setReport(e.target.value)} className="input mt-1 w-full" rows={6} placeholder="Enter report details" />
                <div className="mt-1 flex items-center justify-between text-xs">
                  <div className={`font-mono ${tooLong ? 'text-red-600' : 'text-slate-500'}`}>{count}/{MAX}</div>
                  <div className="flex items-center gap-2">
                    <button className="btn-secondary" type="button" onClick={()=>addTemplate('weather')}><Sparkles size={14} /> Weather</button>
                    <button className="btn-secondary" type="button" onClick={()=>addTemplate('rockface')}><Sparkles size={14} /> Rockface</button>
                    <button className="btn-secondary" type="button" onClick={()=>addTemplate('equipment')}><Sparkles size={14} /> Equipment</button>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <button className="btn-primary" type="submit" disabled={status==='submitting' || !title || !report || tooLong}>
                  {status==='submitting' ? 'Submitting…' : 'Submit'}
                </button>
                {status==='success' && <span className="badge badge-green">Submitted</span>}
                {status!=='idle' && status!=='success' && status!=='submitting' && <span className="badge badge-red">{String(status)}</span>}
              </div>
            </form>
          </div>
          <div className="card-subtle">
            <h3 className="font-medium mb-2">Guidance</h3>
            <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
              <li>Add a short, clear title.</li>
              <li>Pick a category to aid triage.</li>
              <li>Provide specific details and context.</li>
            </ul>
          </div>
        </div>
      )}

      <div className="card-subtle">
        <h3 className="font-medium mb-3">Recent Reports</h3>
        {loading && <div className="text-sm text-slate-500">Loading…</div>}
        {!loading && reports.length === 0 && <div className="text-sm text-slate-500">No reports yet</div>}
        <ul className="space-y-2 max-h-[520px] overflow-auto">
          {reports.map((r) => (
            <li key={r.id} className="rounded border p-3">
              <div className="flex items-center justify-between">
                <div className="font-medium">{r.title || 'Untitled'}</div>
                <div className="text-xs text-slate-500">{new Date(r.measured_at).toLocaleString()}</div>
              </div>
              <div className="mt-1 text-xs"><span className="badge">{r.category || 'general'}</span></div>
              <div className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">{r.message || ''}</div>
              {typeof r.lat === 'number' && typeof r.lon === 'number' && (
                <div className="mt-1 text-xs text-slate-500">{r.lat.toFixed(5)}, {r.lon.toFixed(5)}</div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
