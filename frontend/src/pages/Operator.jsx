import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { useTranslation } from 'react-i18next'
import { apiGetAuth, apiPostAuth, apiPutAuth, apiUploadAuth, API_BASE_URL } from '../services/api'
import { io } from 'socket.io-client'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import MapWeather from '../components/MapWeather'

export default function Operator() {
  const { getToken } = useAuth()
  const { t } = useTranslation(['operator', 'common'])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sensors, setSensors] = useState([])
  const [report, setReport] = useState('')
  const [alerts, setAlerts] = useState([])
  const [severityColors, setSeverityColors] = useState({})
  const [recommendedActions, setRecommendedActions] = useState([])
  const [tasks, setTasks] = useState([])
  const [newTask, setNewTask] = useState({ title: '', task_type: 'inspection', priority: 'medium', description: '' })
  const [sensorId, setSensorId] = useState('')
  const [tiltMetric, setTiltMetric] = useState('tilt_deg')
  const [ppMetric, setPpMetric] = useState('pore_pressure_kpa')
  const [rainMetric, setRainMetric] = useState('rain_A24')
  const [tiltSeries, setTiltSeries] = useState([])
  const [rainPPSeries, setRainPPSeries] = useState([])
  const [corrSensorIds, setCorrSensorIds] = useState('')
  const [corrMetric, setCorrMetric] = useState('pore_pressure_kpa')
  const [corrData, setCorrData] = useState([])
  const [vibrationEvents, setVibrationEvents] = useState([])
  const [vibThreshold, setVibThreshold] = useState(50)
  const [incident, setIncident] = useState({ title: '', description: '', incident_type: 'rockfall', location_name: '', location_lat: '', location_lon: '', severity: 'high' })
  const [incidentFiles, setIncidentFiles] = useState([])
  // Map state
  const [mapSensors, setMapSensors] = useState([])
  const [mapAlerts, setMapAlerts] = useState([])
  const [showMapSensors, setShowMapSensors] = useState(true)
  const [showMapAlerts, setShowMapAlerts] = useState(true)
  const [mapHours, setMapHours] = useState(24)
  const socketRef = useRef(null)
  const [selectedLoc, setSelectedLoc] = useState(null)
  const [hubName, setHubName] = useState('')
  const [hubs, setHubs] = useState([])
  const [hubWeather, setHubWeather] = useState({})
  const [hubDem, setHubDem] = useState({})
  const [activeWeatherIds, setActiveWeatherIds] = useState([])
  const [activeDemIds, setActiveDemIds] = useState([])

  const corrLines = useMemo(() => {
    const keys = new Set()
    corrData.forEach(row => Object.keys(row).forEach(k => { if (k !== 'time') keys.add(k) }))
    return Array.from(keys).map((k, i) => (
      <Line key={k} type="monotone" dataKey={k} stroke={["#3b82f6", "#ef4444", "#22c55e", "#a855f7", "#f59e0b"][i % 5]} dot={false} name={k} />
    ))
  }, [corrData])

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const token = await getToken({ template: 'backend' })
        const data = await apiGetAuth('/api/operator/dashboard', token)
        if (!mounted) return
        setSensors(data.sensors || [])
        const meta = await apiGetAuth('/api/operator/alerts/meta', token)
        const alertsRes = await apiGetAuth('/api/operator/alerts', token)
        const tasksRes = await apiGetAuth('/api/operator/tasks', token)
        if (!mounted) return
        setSeverityColors(meta.severityColors || {})
        setRecommendedActions(meta.recommendedActions || [])
        setAlerts(alertsRes.alerts || [])
        setTasks(tasksRes.tasks || [])
        setLoading(false)
        // Preload map data once
        await loadMapData()
        await loadHubs()
      } catch (e) {
        if (!mounted) return
        setError(String(e?.message || t('messages.error_load')))
        setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [getToken])

  async function loadMapData() {
    try {
      const token = await getToken({ template: 'backend' })
      const [s, a] = await Promise.all([
        apiGetAuth(`/api/operator/map/sensors?hours=${encodeURIComponent(mapHours)}`, token),
        apiGetAuth(`/api/operator/map/alerts?hours=${encodeURIComponent(mapHours)}`, token),
      ])
      setMapSensors(s.sensors || [])
      setMapAlerts(a.alerts || [])
    } catch (e) {
      // Silent fail for map fetch; UI remains
      console.warn('Map data load failed', e)
    }
  }

  async function loadHubs() {
    try {
      const token = await getToken({ template: 'backend' })
      const res = await apiGetAuth('/api/operator/plant-hubs?mine=true', token)
      setHubs(res.hubs || [])
    } catch { }
  }

  // Real-time socket: alerts + hub streams
  useEffect(() => {
    const socket = io(API_BASE_URL, { transports: ['websocket'] })
    socketRef.current = socket
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
    function onHubWeather(payload) {
      const { hubId, current } = payload || {}
      if (!hubId) return
      setHubWeather((prev) => ({ ...prev, [hubId]: current || null }))
    }
    function onHubDem(payload) {
      const { hubId, points } = payload || {}
      if (!hubId) return
      setHubDem((prev) => ({ ...prev, [hubId]: points || [] }))
    }
    socket.on('miner_alert', onMinerAlert)
    socket.on('hub-weather:update', onHubWeather)
    socket.on('hub-dem:update', onHubDem)
    return () => {
      socket.off('miner_alert', onMinerAlert)
      socket.off('hub-weather:update', onHubWeather)
      socket.off('hub-dem:update', onHubDem)
      socket.disconnect()
    }
  }, [])

  function onLocationSelect(loc) {
    setSelectedLoc(loc)
    setHubName(loc?.label || '')
  }

  async function submitReport(e) {
    e.preventDefault()
    try {
      const token = await getToken({ template: 'backend' })
      await apiPostAuth('/api/operator/submit-report', token, { payload: { message: report } })
      setReport('')
      alert(t('messages.report_submitted'))
    } catch (e) {
      alert(t('messages.submit_failed') + ': ' + (e?.message || 'Unknown error'))
    }
  }

  async function acknowledgeAlert(id) {
    try {
      const token = await getToken({ template: 'backend' })
      const res = await apiPutAuth(`/api/operator/alerts/${id}/acknowledge`, token, {})
      setAlerts((prev) => prev.map((a) => (a.id === id ? res.alert : a)))
    } catch (e) {
      alert(t('messages.acknowledge_failed'))
    }
  }

  async function forwardAlert(id) {
    try {
      const token = await getToken({ template: 'backend' })
      const res = await apiPutAuth(`/api/operator/alerts/${id}/forward`, token, {})
      setAlerts((prev) => prev.map((a) => (a.id === id ? res.alert : a)))
      const tasksRes = await apiGetAuth('/api/operator/tasks', token)
      setTasks(tasksRes.tasks || [])
      alert(t('messages.alert_forwarded'))
    } catch (e) {
      alert(t('messages.forward_failed'))
    }
  }

  function mergeSeries(a, aKey, b, bKey) {
    const map = new Map()
    a.forEach((p) => { if (p.v != null) map.set(String(p.t), { time: new Date(p.t).toLocaleString(), [aKey]: p.v }) })
    b.forEach((p) => {
      const key = String(p.t)
      const obj = map.get(key) || { time: new Date(p.t).toLocaleString() }
      if (p.v != null) obj[bKey] = p.v
      map.set(key, obj)
    })
    return Array.from(map.values()).sort((x, y) => new Date(x.time) - new Date(y.time))
  }

  async function loadTiltSeries() {
    if (!sensorId) return
    try {
      const token = await getToken({ template: 'backend' })
      const data = await apiGetAuth(`/api/operator/insights/timeseries?sensor_id=${encodeURIComponent(sensorId)}&metric=${encodeURIComponent(tiltMetric)}`, token)
      setTiltSeries((data.series || []).map(s => ({ time: new Date(s.t).toLocaleString(), value: s.v })))
    } catch { }
  }

  async function loadRainPP() {
    if (!sensorId) return
    try {
      const token = await getToken({ template: 'backend' })
      const rain = await apiGetAuth(`/api/operator/insights/timeseries?sensor_id=${encodeURIComponent(sensorId)}&metric=${encodeURIComponent(rainMetric)}`, token)
      const pp = await apiGetAuth(`/api/operator/insights/timeseries?sensor_id=${encodeURIComponent(sensorId)}&metric=${encodeURIComponent(ppMetric)}`, token)
      setRainPPSeries(mergeSeries(rain.series || [], 'rain', pp.series || [], 'pore_pressure'))
    } catch { }
  }

  async function loadCorrelation() {
    if (!corrSensorIds) return
    try {
      const token = await getToken({ template: 'backend' })
      const data = await apiGetAuth(`/api/operator/insights/correlation?sensor_ids=${encodeURIComponent(corrSensorIds)}`, token)
      const groups = {}
      for (const row of data.data || []) {
        const t = new Date(row.measured_at).toLocaleString()
        const v = Number(row.payload?.[corrMetric]) || null
        if (v == null) continue
        if (!groups[t]) groups[t] = { time: t }
        groups[t][row.sensor_id] = v
      }
      const arr = Object.values(groups).sort((a, b) => new Date(a.time) - new Date(b.time))
      setCorrData(arr)
    } catch { }
  }

  async function loadVibration() {
    try {
      const token = await getToken({ template: 'backend' })
      const data = await apiGetAuth(`/api/operator/insights/vibration-events?threshold=${encodeURIComponent(vibThreshold)}`, token)
      setVibrationEvents(data.events || [])
    } catch { }
  }

  async function createTask(e) {
    e.preventDefault()
    try {
      const token = await getToken({ template: 'backend' })
      const res = await apiPostAuth('/api/operator/tasks', token, newTask)
      setTasks((prev) => [res.task, ...prev])
      setNewTask({ title: '', task_type: 'inspection', priority: 'medium', description: '' })
    } catch (e) {
      alert(t('messages.task_create_failed'))
    }
  }

  async function updateTaskStatus(id, status) {
    try {
      const token = await getToken({ template: 'backend' })
      const res = await apiPutAuth(`/api/operator/tasks/${id}`, token, { status })
      setTasks((prev) => prev.map((t) => (t.id === id ? res.task : t)))
    } catch (e) {
      alert(t('messages.task_update_failed'))
    }
  }

  async function submitIncident(e) {
    e.preventDefault()
    try {
      const token = await getToken({ template: 'backend' })
      const form = new FormData()
      Object.entries(incident).forEach(([k, v]) => form.append(k, v))
      for (const f of incidentFiles) form.append('files', f)
      const res = await apiUploadAuth('/api/operator/incidents', token, form)
      setIncident({ title: '', description: '', incident_type: 'rockfall', location_name: '', location_lat: '', location_lon: '', severity: 'high' })
      setIncidentFiles([])
      alert(t('messages.incident_submitted'))
    } catch (e) {
      alert(t('messages.incident_failed'))
    }
  }

  if (loading) return <div className="p-6">{t('messages.loading')}</div>
  if (error) return <div className="p-6 text-red-600">{error}</div>

  const demOverlayPoints = activeDemIds.flatMap((id) => hubDem[id] || [])

  return (
    <main className="mx-auto max-w-6xl px-4">
      <section className="py-10">
        <h1 className="mb-2">{t('title')}</h1>
        <nav className="mb-4 flex flex-wrap gap-3 text-sm">
          <a href="#map" className="btn-secondary">{t('nav.map')}</a>
          <a href="#alerts" className="btn-secondary">{t('nav.alerts')}</a>
          <a href="#tasks" className="btn-secondary">{t('nav.tasks')}</a>
          <a href="#sensors" className="btn-secondary">{t('nav.sensors')}</a>
          <a href="#reports" className="btn-secondary">{t('nav.reports')}</a>
          <a href="#incidents" className="btn-secondary">{t('nav.incident')}</a>
        </nav>
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 id="sensors" className="mb-4">{t('sections.sensors')}</h2>
          <ul className="space-y-1 text-sm">
            {sensors.map((s) => (
              <li key={s.sensor_id} className="flex justify-between">
                <span>{s.sensor_id}</span>
                <span className="text-slate-600">{s.count}</span>
              </li>
            ))}
          </ul>
        </div>

        <form id="reports" onSubmit={submitReport} className="mt-6 rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4">{t('sections.submit_report')}</h2>
          <textarea value={report} onChange={(e) => setReport(e.target.value)} className="input" rows={4} placeholder={t('placeholders.enter_report')} />
          <button className="btn-primary mt-3" type="submit">{t('actions.submit')}</button>
        </form>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div id="alerts" className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="mb-4">{t('sections.alerts')}</h2>
            <ul className="space-y-3">
              {alerts.map((a) => (
                <li key={a.id} className="rounded border p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{a.title}</span>
                      <span className="text-xs rounded px-2 py-0.5 text-white" style={{ backgroundColor: severityColors[a.severity] || '#64748b' }}>{a.severity}</span>
                    </div>
                    <div className="text-xs text-slate-500">{new Date(a.created_at).toLocaleString()}</div>
                  </div>
                  <div className="mt-1 text-sm text-slate-700">{a.description || ''}</div>
                  <div className="mt-1 text-xs text-slate-600">Sensor: {a.sensor_id || '—'}{a.location_lat && a.location_lon ? ` · (${a.location_lat}, ${a.location_lon})` : ''}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button className="btn-secondary" onClick={() => acknowledgeAlert(a.id)} disabled={a.status === 'acknowledged'}>{t('actions.acknowledge')}</button>
                    <button className="btn-primary" onClick={() => forwardAlert(a.id)} disabled={a.forwarded_to_miners}>{t('actions.forward_miners')}</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div id="tasks" className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="mb-2">{t('sections.task_management')}</h2>
            <form onSubmit={createTask} className="mb-4 grid grid-cols-1 gap-2">
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
              <button className="btn-primary" type="submit">Create</button>
            </form>
            <ul className="space-y-2">
              {tasks.map((t) => (
                <li key={t.id} className="flex items-center justify-between rounded border p-3">
                  <div>
                    <div className="font-medium">{t.title}</div>
                    <div className="text-xs text-slate-600">{t.task_type} · {t.priority} · {t.status}</div>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-secondary" onClick={() => updateTaskStatus(t.id, 'in_progress')}>{t('actions.start')}</button>
                    <button className="btn-primary" onClick={() => updateTaskStatus(t.id, 'completed')}>{t('actions.complete')}</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div id="map" className="mt-6 rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-3">Map</h2>
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <MapWeather
                onLocationSelect={onLocationSelect}
                demPoints={demOverlayPoints}
                sensorPoints={mapSensors}
                alertPoints={mapAlerts}
                showSensors={showMapSensors}
                showAlerts={showMapAlerts}
                severityColors={severityColors}
                fitToData={false}
              />
            </div>
            <div>
              <div className="rounded border p-4">
                <h3 className="font-medium mb-2">{t('map.save_hub')}</h3>
                {selectedLoc ? (
                  <form onSubmit={savePlantHub} className="space-y-2">
                    <input className="input" placeholder={t('placeholders.hub_name')} value={hubName} onChange={(e) => setHubName(e.target.value)} />
                    <div className="text-xs text-slate-600">Lat: {selectedLoc.lat.toFixed(6)} · Lon: {selectedLoc.lon.toFixed(6)}</div>
                    <button className="btn-primary w-full" type="submit">{t('actions.save_hub')}</button>
                  </form>
                ) : (
                  <div className="text-sm text-slate-500">{t('map.search_prompt')}</div>
                )}
              </div>
              <div className="mt-4 rounded border p-4">
                <h3 className="font-medium mb-2">{t('map.your_hubs')}</h3>
                <ul className="space-y-3 max-h-80 overflow-auto">
                  {hubs.map((h) => (
                    <li key={h.id} className="rounded border p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-sm">{h.name}</div>
                          <div className="text-xs text-slate-600">{h.lat.toFixed(5)}, {h.lon.toFixed(5)}</div>
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <button className="btn-secondary" onClick={() => (activeWeatherIds.includes(h.id) ? stopHubWeather(h.id) : startHubWeather(h.id))}>
                          {activeWeatherIds.includes(h.id) ? t('actions.stop_weather') : t('actions.start_weather')}
                        </button>
                        <button className="btn-secondary" onClick={() => (activeDemIds.includes(h.id) ? stopHubDem(h.id) : startHubDem(h.id))}>
                          {activeDemIds.includes(h.id) ? t('actions.stop_dem') : t('actions.start_dem')}
                        </button>
                      </div>
                      <div className="mt-3 text-xs">
                        {hubWeather[h.id] ? (
                          <div className="rounded bg-slate-50 p-2">
                            <div>{t('map.weather.temp')}: {hubWeather[h.id].temperature_2m}°C</div>
                            <div>{t('map.weather.humidity')}: {hubWeather[h.id].relative_humidity_2m}%</div>
                            <div>{t('map.weather.wind')}: {hubWeather[h.id].wind_speed_10m} km/h</div>
                          </div>
                        ) : (
                          <div className="text-slate-500">{t('map.no_weather')}</div>
                        )}
                        <div className="mt-2 rounded bg-slate-50 p-2 max-h-28 overflow-auto">
                          <div className="font-medium mb-1">{t('map.dem.patch')}</div>
                          {hubDem[h.id]?.length ? (
                            <div>
                              <div className="mb-1">{t('map.dem.points')}: {hubDem[h.id].length}</div>
                              <div className="space-y-1">
                                {hubDem[h.id].slice(0, 6).map((p, idx) => (
                                  <div key={idx}>{p.lat.toFixed(4)}, {p.lon.toFixed(4)} · {p.elevation?.toFixed?.(1) ?? '—'} m</div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="text-slate-500">{t('map.no_dem')}</div>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-4 rounded border p-4">
                <h3 className="font-medium mb-2">{t('map.overlay_controls')}</h3>
                <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
                  <label className="flex items-center gap-2"><input type="checkbox" checked={showMapSensors} onChange={(e) => setShowMapSensors(e.target.checked)} /> {t('map.show_sensors')}</label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={showMapAlerts} onChange={(e) => setShowMapAlerts(e.target.checked)} /> {t('map.show_alerts')}</label>
                  <input type="number" className="input w-28" min={1} placeholder={t('map.hours')} value={mapHours} onChange={(e) => setMapHours(Number(e.target.value) || 24)} />
                  <button className="btn-secondary" onClick={loadMapData}>{t('actions.refresh')}</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="mb-2">{t('sections.sensor_insights')}</h2>
            <div className="flex gap-2 mb-3">
              <input className="input" placeholder={t('placeholders.sensor_id')} value={sensorId} onChange={(e) => setSensorId(e.target.value)} />
              <input className="input" placeholder={t('placeholders.metric')} value={tiltMetric} onChange={(e) => setTiltMetric(e.target.value)} />
              <button className="btn-secondary" onClick={loadTiltSeries}>{t('actions.load')}</button>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={tiltSeries} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="time" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="value" stroke="#3b82f6" dot={false} name={tiltMetric} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="mb-2">{t('sections.rainfall_pp')}</h2>
            <div className="flex gap-2 mb-3">
              <input className="input" placeholder={t('placeholders.sensor_id')} value={sensorId} onChange={(e) => setSensorId(e.target.value)} />
              <input className="input" placeholder={t('placeholders.rain_metric')} value={rainMetric} onChange={(e) => setRainMetric(e.target.value)} />
              <input className="input" placeholder={t('placeholders.pp_metric')} value={ppMetric} onChange={(e) => setPpMetric(e.target.value)} />
              <button className="btn-secondary" onClick={loadRainPP}>{t('actions.load')}</button>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rainPPSeries} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="time" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="rain" stroke="#22c55e" dot={false} name={rainMetric} />
                  <Line type="monotone" dataKey="pore_pressure" stroke="#ef4444" dot={false} name={ppMetric} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="mb-2">{t('sections.correlation')}</h2>
            <div className="flex gap-2 mb-3">
              <input className="input" placeholder={t('placeholders.sensor_ids_comma')} value={corrSensorIds} onChange={(e) => setCorrSensorIds(e.target.value)} />
              <input className="input" placeholder={t('placeholders.metric')} value={corrMetric} onChange={(e) => setCorrMetric(e.target.value)} />
              <button className="btn-secondary" onClick={loadCorrelation}>{t('actions.load')}</button>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={corrData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="time" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip />
                  <Legend />
                  {corrLines}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="mb-2">{t('sections.vibration')}</h2>
            <div className="flex gap-2 mb-3">
              <input className="input" type="number" placeholder={t('placeholders.threshold')} value={vibThreshold} onChange={(e) => setVibThreshold(e.target.value)} />
              <button className="btn-secondary" onClick={loadVibration}>{t('actions.load')}</button>
            </div>
            <ul className="space-y-2 max-h-64 overflow-auto">
              {vibrationEvents.map((ev) => (
                <li key={ev.id} className="rounded border p-2 text-sm">
                  <div className="flex justify-between"><span>{ev.sensor_id}</span><span className="text-xs text-slate-600">{new Date(ev.measured_at).toLocaleString()}</span></div>
                  <div className="text-xs text-slate-700">{JSON.stringify(ev.payload)}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <form id="incidents" onSubmit={submitIncident} className="mt-6 rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4">{t('sections.incident_reporting')}</h2>
          <div className="grid gap-2 md:grid-cols-2">
            <input className="input" placeholder={t('placeholders.title')} value={incident.title} onChange={(e) => setIncident({ ...incident, title: e.target.value })} />
            <select className="input" value={incident.incident_type} onChange={(e) => setIncident({ ...incident, incident_type: e.target.value })}>
              <option value="rockfall">{t('incidents_page.types.rockfall')}</option>
              <option value="hazard">{t('incidents_page.types.hazard')}</option>
            </select>
            <input className="input" placeholder={t('placeholders.severity')} value={incident.severity} onChange={(e) => setIncident({ ...incident, severity: e.target.value })} />
            <input className="input" placeholder={t('placeholders.location_name')} value={incident.location_name} onChange={(e) => setIncident({ ...incident, location_name: e.target.value })} />
            <input className="input" placeholder={t('placeholders.latitude')} value={incident.location_lat} onChange={(e) => setIncident({ ...incident, location_lat: e.target.value })} />
            <input className="input" placeholder={t('placeholders.longitude')} value={incident.location_lon} onChange={(e) => setIncident({ ...incident, location_lon: e.target.value })} />
          </div>
          <textarea className="input mt-2" rows={3} placeholder={t('placeholders.description')} value={incident.description} onChange={(e) => setIncident({ ...incident, description: e.target.value })} />
          <input className="input mt-2" type="file" multiple onChange={(e) => setIncidentFiles(Array.from(e.target.files || []))} />
          <button className="btn-primary mt-3" type="submit">{t('actions.submit_incident')}</button>
        </form>
      </section>
    </main>
  )
}

