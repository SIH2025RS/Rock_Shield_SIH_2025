import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { apiGetAuth, apiPostAuth } from '../../services/api'
import { Sparkles, Plus, RefreshCcw } from 'lucide-react'

import { useTranslation } from 'react-i18next'

export default function OperatorReports() {
  const { t } = useTranslation(['operator', 'common'])
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
      ; (async () => { if (mounted) await loadReports() })()
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
    const tVal = kind === 'weather'
      ? t('reports_page.templates_text.weather')
      : kind === 'rockface'
        ? t('reports_page.templates_text.rockface')
        : t('reports_page.templates_text.equipment')
    setReport((r) => (r ? r + '\n' : '') + tVal)
  }

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('reports_page.title')}</h2>
          <div className="text-sm text-slate-600 dark:text-slate-400">{t('reports_page.subtitle')}</div>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={() => loadReports()} disabled={loading}><RefreshCcw size={14} /> {t('common:actions.refresh')}</button>
          <button className={`btn-primary ${showForm ? 'btn-ghost' : ''}`} onClick={() => setShowForm(!showForm)}>{showForm ? t('reports_page.close_btn') : (<span className="inline-flex items-center gap-1"><Plus size={14} /> {t('reports_page.add_btn')}</span>)}</button>
        </div>
      </div>

      {showForm && (
        <div className="grid gap-6 md:grid-cols-3 mb-6">
          <div className="rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-800 p-6 shadow-sm md:col-span-2">
            <form onSubmit={submitReport}>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">{t('reports_page.form.title')}</label>
                  <input className="input mt-1 w-full" placeholder={t('reports_page.form.placeholder_title')} value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium">{t('reports_page.form.category')}</label>
                  <select className="input mt-1 w-full" value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="general">{t('reports_page.categories.general')}</option>
                    <option value="observation">{t('reports_page.categories.observation')}</option>
                    <option value="hazard">{t('reports_page.categories.hazard')}</option>
                    <option value="maintenance">{t('reports_page.categories.maintenance')}</option>
                  </select>
                </div>
              </div>
              <div className="mt-3">
                <label className="text-sm font-medium">{t('reports_page.form.details')}</label>
                <textarea value={report} onChange={(e) => setReport(e.target.value)} className="input mt-1 w-full" rows={6} placeholder={t('reports_page.form.placeholder_details')} />
                <div className="mt-1 flex items-center justify-between text-xs">
                  <div className={`font-mono ${tooLong ? 'text-red-600' : 'text-slate-500'}`}>{count}/{MAX}</div>
                  <div className="flex items-center gap-2">
                    <button className="btn-secondary" type="button" onClick={() => addTemplate('weather')}><Sparkles size={14} /> {t('reports_page.templates.weather')}</button>
                    <button className="btn-secondary" type="button" onClick={() => addTemplate('rockface')}><Sparkles size={14} /> {t('reports_page.templates.rockface')}</button>
                    <button className="btn-secondary" type="button" onClick={() => addTemplate('equipment')}><Sparkles size={14} /> {t('reports_page.templates.equipment')}</button>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <button className="btn-primary" type="submit" disabled={status === 'submitting' || !title || !report || tooLong}>
                  {status === 'submitting' ? t('reports_page.form.submitting') : t('reports_page.form.submit')}
                </button>
                {status === 'success' && <span className="badge badge-green">{t('reports_page.form.submitted')}</span>}
                {status !== 'idle' && status !== 'success' && status !== 'submitting' && <span className="badge badge-red">{String(status)}</span>}
              </div>
            </form>
          </div>
          <div className="rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-800 p-6 shadow-sm">
            <h3 className="font-medium mb-2">{t('reports_page.guidance_title')}</h3>
            <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
              <li>{t('reports_page.tips.one')}</li>
              <li>{t('reports_page.tips.two')}</li>
              <li>{t('reports_page.tips.three')}</li>
            </ul>
          </div>
        </div>
      )}

      <div className="rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-800 p-6 shadow-sm">
        <h3 className="font-medium mb-3">{t('reports_page.recent_title')}</h3>
        {loading && <div className="text-sm text-slate-500">{t('messages.loading')}</div>}
        {!loading && reports.length === 0 && <div className="text-sm text-slate-500">{t('reports_page.no_reports')}</div>}
        <ul className="space-y-2 max-h-[520px] overflow-auto">
          {reports.map((r) => (
            <li key={r.id} className="rounded-xl border p-3 bg-white dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <div className="font-medium">{r.title || t('common:untitled')}</div>
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
