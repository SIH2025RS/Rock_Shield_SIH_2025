import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { apiGetAuth } from '../../services/api'
import { MapPin, Search as SearchIcon, RefreshCcw, Radio } from 'lucide-react'

import { useTranslation } from 'react-i18next'

export default function OperatorSensors() {
  const { t } = useTranslation(['operator', 'common'])
  const { getToken } = useAuth()
  const [sensors, setSensors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const token = await getToken({ template: 'backend' })
        const data = await apiGetAuth('/api/operator/sensors?limit=1000', token)
        if (!mounted) return
        setSensors(Array.isArray(data.sensors) ? data.sensors : [])
        setLoading(false)
      } catch (e) {
        if (!mounted) return
        setError(e?.message || 'Failed to load sensors')
        setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [getToken])

  const filtered = useMemo(() => {
    const q = (query || '').toLowerCase().trim()
    return (sensors || [])
      .filter(s => !q || [s.name, s.sensor_id, s.sensor_type, s.status].some(v => String(v || '').toLowerCase().includes(q)))
      .filter(s => !typeFilter || String(s.sensor_type || '').toLowerCase() === String(typeFilter).toLowerCase())
      .filter(s => !statusFilter || String(s.status || '').toLowerCase() === String(statusFilter).toLowerCase())
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
  }, [sensors, query, typeFilter, statusFilter])

  if (loading) return <div className="p-6">{t('common:loading')}</div>
  if (error) return <div className="p-6 text-red-600">{error}</div>

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('sensors_page.title')}</h2>
          <div className="text-sm text-slate-600 dark:text-slate-400">{t('sensors_page.subtitle', { filtered: filtered.length, total: sensors.length })}</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <SearchIcon size={16} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input pl-8 w-56" placeholder={t('sensors_page.search_placeholder')} value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <select className="input w-36" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">{t('sensors_page.all_types')}</option>
            <option value="tilt">{t('sensors_page.types.tilt')}</option>
            <option value="vibration">{t('sensors_page.types.vibration')}</option>
            <option value="weather">{t('sensors_page.types.weather')}</option>
            <option value="camera">{t('sensors_page.types.camera')}</option>
            <option value="other">{t('sensors_page.types.other')}</option>
          </select>
          <select className="input w-32" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">{t('sensors_page.any_status')}</option>
            <option value="green">{t('sensors_page.status.green')}</option>
            <option value="yellow">{t('sensors_page.status.yellow')}</option>
            <option value="red">{t('sensors_page.status.red')}</option>
          </select>
          <button className="btn-secondary inline-flex items-center gap-2" onClick={async () => {
            try {
              setRefreshing(true)
              const token = await getToken({ template: 'backend' })
              const data = await apiGetAuth('/api/operator/sensors?limit=1000', token)
              setSensors(Array.isArray(data.sensors) ? data.sensors : [])
            } finally { setRefreshing(false) }
          }} disabled={refreshing}>
            <RefreshCcw size={16} className={refreshing ? 'animate-spin' : ''} /> {t('sensors_page.refresh')}
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((s) => {
          const status = String(s.status || '').toLowerCase()
          const color = status === 'green' ? 'bg-green-100 text-green-700 border-green-200' : status === 'yellow' ? 'bg-amber-100 text-amber-700 border-amber-200' : status === 'red' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-slate-100 text-slate-700 border-slate-200'
          const lat = Number(s.lat); const lon = Number(s.lon)
          return (
            <div key={s.id} className="rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-800 p-4 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-slate-900">{s.name || s.sensor_id || t('map.sensor')}</div>
                  <div className="text-xs text-slate-600">{t('sensors_page.id')}: {s.sensor_id || '—'}</div>
                </div>
                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${color}`}>
                  <Radio size={14} /> {status || t('sensors_page.unknown')}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">{String(s.sensor_type || 'other')}</span>
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm text-slate-700">
                <MapPin size={16} className="text-blue-600" /> {isFinite(lat) && isFinite(lon) ? `${lat.toFixed(5)}, ${lon.toFixed(5)}` : '—'}
              </div>
              {s.created_at && (
                <div className="mt-1 text-xs text-slate-500">{t('sensors_page.added')} {new Date(s.created_at).toLocaleString()}</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
