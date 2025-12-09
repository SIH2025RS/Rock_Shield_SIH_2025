import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { apiGetAuth, apiPutAuth, apiPostAuth } from '../../services/api'

import { useTranslation } from 'react-i18next'

export default function OperatorAlerts() {
  const { t } = useTranslation(['operator', 'common'])
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
    } catch { }
  }

  async function forwardAlert(id) {
    try {
      const token = await getToken({ template: 'backend' })
      const res = await apiPutAuth(`/api/operator/alerts/${id}/forward`, token, {})
      setAlerts((prev) => prev.map((a) => (a.id === id ? res.alert : a)))
    } catch { }
  }

  if (loading) return <div>{t('common:loading')}</div>
  if (error) return <div className="text-red-600">{error}</div>

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{t('alerts_page.title')}</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">{t('alerts_page.subtitle')}</p>
      </div>
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="font-semibold text-slate-900 dark:text-white">{t('alerts_page.create_new')}</div>
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors" onClick={() => setShowCreate((v) => !v)}>{showCreate ? t('common:cancel') : t('alerts_page.create_new')}</button>
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
              <option value="critical">{t('common:severity.critical')}</option>
              <option value="high">{t('common:severity.high')}</option>
              <option value="medium">{t('common:severity.medium')}</option>
              <option value="low">{t('common:severity.low')}</option>
            </select>
            <input className="input" placeholder={t('alerts_page.pk_title')} value={newAlert.title} onChange={(e) => setNewAlert({ ...newAlert, title: e.target.value })} />
            <input className="input" placeholder={t('alerts_page.pk_sensor_optional')} value={newAlert.sensor_id} onChange={(e) => setNewAlert({ ...newAlert, sensor_id: e.target.value })} />
            <input className="input" placeholder={t('alerts_page.pk_action_optional')} value={newAlert.recommended_action} onChange={(e) => setNewAlert({ ...newAlert, recommended_action: e.target.value })} />
            <input className="input" placeholder={t('alerts_page.pk_lat_optional')} value={newAlert.location_lat} onChange={(e) => setNewAlert({ ...newAlert, location_lat: e.target.value })} />
            <input className="input" placeholder={t('alerts_page.pk_lon_optional')} value={newAlert.location_lon} onChange={(e) => setNewAlert({ ...newAlert, location_lon: e.target.value })} />
            <textarea className="input md:col-span-2" rows={3} placeholder={t('alerts_page.pk_desc_optional')} value={newAlert.description} onChange={(e) => setNewAlert({ ...newAlert, description: e.target.value })} />
            <div className="md:col-span-2 flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={forwardNow} onChange={(e) => setForwardNow(e.target.checked)} /> {t('actions.forward_miners')}</label>
              <button className="btn-primary" type="submit" disabled={creating}>{creating ? t('alerts_page.creating') : t('alerts_page.create_btn')}</button>
            </div>
          </form>
        )}
      </div>
      <ul className="space-y-3 max-h-[600px] overflow-auto">
        {alerts.map((a) => (
          <li key={a.id} className="rounded-xl border p-4 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold truncate max-w-[50vw]">{a.title}</span>
                  <span className="badge" style={{ backgroundColor: '#f1f5f9', color: severityColors[a.severity] || '#334155', border: `1px solid ${severityColors[a.severity] || '#cbd5e1'}` }}>{t(`common:severity.${a.severity}`) || a.severity}</span>
                </div>
                <div className="mt-1 text-sm text-slate-700 break-words">{a.description || ''}</div>
                <div className="mt-1 text-xs text-slate-600">{t('alerts_page.sensor_label')} {a.sensor_id || '—'}{a.location_lat && a.location_lon ? ` · (${a.location_lat}, ${a.location_lon})` : ''}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500">{new Date(a.created_at).toLocaleString()}</div>
                <div className="mt-2 flex flex-wrap justify-end gap-2">
                  <button className="btn-secondary" onClick={() => acknowledgeAlert(a.id)} disabled={a.status === 'acknowledged'}>{t('actions.acknowledge')}</button>
                  <button className="btn-primary" onClick={() => forwardAlert(a.id)} disabled={a.forwarded_to_miners}>{t('alerts_page.forward_btn')}</button>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
