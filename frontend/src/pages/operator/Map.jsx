import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { apiGetAuth, apiPostAuth, API_BASE_URL } from '../../services/api'
import { io } from 'socket.io-client'
import Map3D from '../../components/map/Map3D'
import MapSatellite from '../../components/map/MapSatellite'
import MapStreets from '../../components/map/MapStreets'

export default function OperatorMap() {
  const { getToken } = useAuth()
  const socketRef = useRef(null)
  const weatherPollersRef = useRef(new Map())
  const [mapSensors, setMapSensors] = useState([])
  const [mapAlerts, setMapAlerts] = useState([])
  const [registeredSensors, setRegisteredSensors] = useState([])
  const [showMapSensors, setShowMapSensors] = useState(true)
  const [showMapAlerts, setShowMapAlerts] = useState(true)
  const [mapHours, setMapHours] = useState(24)
  const [severityColors, setSeverityColors] = useState({})
  const [mapMode, setMapMode] = useState('3d') // '3d' | 'sat' | 'street'
  const [weatherData, setWeatherData] = useState(null)
  const [weatherCoords, setWeatherCoords] = useState(null)
  const [terrainExaggeration, setTerrainExaggeration] = useState(1.8)
  const [showHillshade, setShowHillshade] = useState(true)
  const [showContours, setShowContours] = useState(true)
  const [contourInterval, setContourInterval] = useState(25)

  const [selectedLoc, setSelectedLoc] = useState(null)
  const [hubName, setHubName] = useState('')
  const [hubs, setHubs] = useState([])
  const [hubWeather, setHubWeather] = useState({})
  const [hubDem, setHubDem] = useState({})
  const [activeWeatherIds, setActiveWeatherIds] = useState([])
  const [activeDemIds, setActiveDemIds] = useState([])

  const [addSensorMode, setAddSensorMode] = useState(false)
  const [pendingPoint, setPendingPoint] = useState(null)
  const [newSensorName, setNewSensorName] = useState('')
  const [newSensorId, setNewSensorId] = useState('')
  const [newSensorType, setNewSensorType] = useState('tilt')
  const [newSensorStatus, setNewSensorStatus] = useState('green')
  const [savingSensor, setSavingSensor] = useState(false)
  const [centerOn, setCenterOn] = useState(null)

  useEffect(() => {
    let mounted = true
    async function init() {
      try {
        const token = await getToken({ template: 'backend' })
        const meta = await apiGetAuth('/api/operator/alerts/meta', token)
        if (!mounted) return
        setSeverityColors(meta.severityColors || {})
        await Promise.all([loadMapData(), loadHubs(), loadRegisteredSensors()])
      } catch {}
    }
    init()
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
    } catch {}
  }

  async function loadHubs() {
    try {
      const token = await getToken({ template: 'backend' })
      const res = await apiGetAuth('/api/operator/plant-hubs?mine=true', token)
      setHubs(res.hubs || [])
    } catch {}
  }

  async function loadRegisteredSensors() {
    try {
      const token = await getToken({ template: 'backend' })
      const res = await apiGetAuth('/api/operator/sensors?limit=1000', token)
      const list = res.sensors || []
      setRegisteredSensors(list)
      if (!centerOn && list.length > 0) {
        const s = list[0]
        const lat = Number(s.lat); const lon = Number(s.lon)
        if (isFinite(lat) && isFinite(lon)) setCenterOn({ lat, lon })
      }
    } catch {}
  }

  useEffect(() => {
    const socket = io(API_BASE_URL, { transports: ['websocket'] })
    socketRef.current = socket
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
    socket.on('hub-weather:update', onHubWeather)
    socket.on('hub-dem:update', onHubDem)
    return () => {
      socket.off('hub-weather:update', onHubWeather)
      socket.off('hub-dem:update', onHubDem)
      socket.disconnect()
      // clear any weather pollers
      try {
        for (const t of weatherPollersRef.current.values()) clearInterval(t)
        weatherPollersRef.current.clear()
      } catch {}
    }
  }, [])

  function onLocationSelect(loc) {
    setSelectedLoc(loc)
    setHubName(loc?.label || '')
  }

  function onMapAddSensorClick(pt) {
    if (!addSensorMode) return
    setPendingPoint(pt)
  }

  async function savePlantHub(e) {
    e.preventDefault()
    if (!selectedLoc || !hubName.trim()) return
    try {
      const token = await getToken({ template: 'backend' })
      const body = { name: hubName.trim(), lat: selectedLoc.lat, lon: selectedLoc.lon, address: selectedLoc.label || null }
      await apiPostAuth('/api/operator/plant-hubs', token, body)
      setSelectedLoc(null)
      setHubName('')
      await loadHubs()
    } catch {}
  }

  function startHubWeather(hubId) {
    if (!socketRef.current) return
    socketRef.current.emit('subscribe-hub-weather', { hubId, intervalMs: 15000 })
    setActiveWeatherIds((prev) => (prev.includes(hubId) ? prev : [...prev, hubId]))
    // start DB polling for latest weather
    const key = String(hubId)
    if (weatherPollersRef.current.has(key)) {
      clearInterval(weatherPollersRef.current.get(key))
      weatherPollersRef.current.delete(key)
    }
    const poll = async () => {
      try {
        const token = await getToken({ template: 'backend' })
        const data = await apiGetAuth(`/api/weather/latest?hubId=${encodeURIComponent(hubId)}`, token)
        const curr = data?.current || null
        if (curr) setHubWeather((prev) => ({ ...prev, [hubId]: curr }))
      } catch {}
    }
    poll()
    const t = setInterval(poll, 15000)
    weatherPollersRef.current.set(key, t)
  }
  function stopHubWeather(hubId) {
    if (!socketRef.current) return
    socketRef.current.emit('unsubscribe-hub-weather', { hubId })
    setActiveWeatherIds((prev) => prev.filter((id) => id !== hubId))
    // stop DB polling
    const key = String(hubId)
    if (weatherPollersRef.current.has(key)) {
      clearInterval(weatherPollersRef.current.get(key))
      weatherPollersRef.current.delete(key)
    }
  }
  function startHubDem(hubId) {
    if (!socketRef.current) return
    socketRef.current.emit('subscribe-hub-dem', { hubId, intervalMs: 15000, gridSize: 3, stepDeg: 0.01 })
    setActiveDemIds((prev) => (prev.includes(hubId) ? prev : [...prev, hubId]))
  }
  function stopHubDem(hubId) {
    if (!socketRef.current) return
    socketRef.current.emit('unsubscribe-hub-dem', { hubId })
    setActiveDemIds((prev) => prev.filter((id) => id !== hubId))
  }

  const demOverlayPoints = activeDemIds.flatMap((id) => hubDem[id] || [])

  function handleWeatherData(payload) {
    setWeatherData(payload?.weather || null)
    setWeatherCoords(payload?.coords || null)
  }

  return (
    <div className="section">
      <div className="flex flex-wrap items-center gap-2 text-sm mb-3">
        <div className="flex gap-2">
          <button className={`btn-tab ${mapMode==='3d' ? 'btn-tab-active' : ''}`} onClick={() => setMapMode('3d')}>3D</button>
          <button className={`btn-tab ${mapMode==='sat' ? 'btn-tab-active' : ''}`} onClick={() => setMapMode('sat')}>Satellite</button>
          <button className={`btn-tab ${mapMode==='street' ? 'btn-tab-active' : ''}`} onClick={() => setMapMode('street')}>Streets</button>
        </div>
      </div>
      <div className="mb-6">
          {mapMode==='3d' && (
            <Map3D
              onLocationSelect={onLocationSelect}
              onWeatherData={handleWeatherData}
              demPoints={demOverlayPoints}
              sensorPoints={mapSensors}
              registeredSensors={registeredSensors}
              alertPoints={mapAlerts}
              showSensors={showMapSensors}
              showAlerts={showMapAlerts}
              severityColors={severityColors}
              fitToData={false}
              mapOnly={true}
              heightClass="h-[calc(100vh-7rem)]"
              terrainExaggeration={terrainExaggeration}
              showHillshade={showHillshade}
              showContours={showContours}
              contourInterval={contourInterval}
              enableMapClicks={addSensorMode}
              onMapClick={onMapAddSensorClick}
              centerOn={centerOn}
            />
          )}
          {mapMode==='sat' && (
            <MapSatellite
              onLocationSelect={onLocationSelect}
              onWeatherData={handleWeatherData}
              demPoints={demOverlayPoints}
              sensorPoints={mapSensors}
              registeredSensors={registeredSensors}
              alertPoints={mapAlerts}
              showSensors={showMapSensors}
              showAlerts={showMapAlerts}
              severityColors={severityColors}
              fitToData={false}
              mapOnly={true}
              heightClass="h-[calc(100vh-7rem)]"
              enableMapClicks={addSensorMode}
              onMapClick={onMapAddSensorClick}
              centerOn={centerOn}
            />
          )}
          {mapMode==='street' && (
            <MapStreets
              onLocationSelect={onLocationSelect}
              onWeatherData={handleWeatherData}
              demPoints={demOverlayPoints}
              sensorPoints={mapSensors}
              registeredSensors={registeredSensors}
              alertPoints={mapAlerts}
              showSensors={showMapSensors}
              showAlerts={showMapAlerts}
              severityColors={severityColors}
              fitToData={false}
              mapOnly={true}
              heightClass="h-[calc(100vh-7rem)]"
              enableMapClicks={addSensorMode}
              onMapClick={onMapAddSensorClick}
              centerOn={centerOn}
            />
          )}
      </div>

      {/* Controls and details below the map */}
      <div className="grid gap-6 md:grid-cols-2">
        {mapMode==='3d' && (
          <div className="card-subtle">
            <h3 className="font-medium mb-2">3D tuning</h3>
            <div className="grid gap-3">
              <div>
                <label className="text-sm font-medium">Terrain exaggeration: <span className="text-slate-600">{terrainExaggeration.toFixed(1)}x</span></label>
                <input type="range" min={1} max={5} step={0.1} value={terrainExaggeration} onChange={(e)=>setTerrainExaggeration(parseFloat(e.target.value)||1)} className="w-full" />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showHillshade} onChange={(e)=>setShowHillshade(e.target.checked)} /> Hillshade</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showContours} onChange={(e)=>setShowContours(e.target.checked)} /> Contours</label>
                <div className="flex items-center gap-2 text-sm ml-auto">
                  <span>Interval</span>
                  <input type="number" className="input w-24" min={5} step={5} value={contourInterval} onChange={(e)=>setContourInterval(Math.max(5, Number(e.target.value)||25))} />
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="card-subtle">
          <h3 className="font-medium mb-2">Overlay controls</h3>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <button className={`btn-tab ${showMapSensors ? 'btn-tab-active' : ''}`} onClick={() => setShowMapSensors(!showMapSensors)}>Sensors</button>
            <button className={`btn-tab ${showMapAlerts ? 'btn-tab-active' : ''}`} onClick={() => setShowMapAlerts(!showMapAlerts)}>Alerts</button>
            <button className={`btn-tab ${addSensorMode ? 'btn-tab-active' : ''}`} onClick={() => { setAddSensorMode(!addSensorMode); setPendingPoint(null) }}>{addSensorMode ? 'Adding Sensor…' : 'Add Sensor'}</button>
            <div className="input-inline ml-auto">
              <input type="number" className="input w-28" min={1} placeholder="Hours" value={mapHours} onChange={(e) => setMapHours(Number(e.target.value) || 24)} />
              <button className="btn-secondary" onClick={async ()=>{ await loadMapData(); await loadRegisteredSensors(); }}>Refresh</button>
            </div>
          </div>
        </div>

        {addSensorMode && (
          <div className="card-subtle md:col-span-2">
            <h3 className="font-medium mb-2">New Sensor</h3>
            <div className="grid gap-2 md:grid-cols-5">
              <input className="input md:col-span-2" placeholder="Sensor name" value={newSensorName} onChange={(e)=>setNewSensorName(e.target.value)} />
              <input className="input" placeholder="Sensor ID (optional)" value={newSensorId} onChange={(e)=>setNewSensorId(e.target.value)} />
              <select className="input" value={newSensorType} onChange={(e)=>setNewSensorType(e.target.value)}>
                <option value="tilt">tilt</option>
                <option value="vibration">vibration</option>
                <option value="weather">weather</option>
                <option value="camera">camera</option>
                <option value="other">other</option>
              </select>
              <select className="input" value={newSensorStatus} onChange={(e)=>setNewSensorStatus(e.target.value)}>
                <option value="green">green</option>
                <option value="yellow">yellow</option>
                <option value="red">red</option>
              </select>
            </div>
            <div className="mt-2 grid gap-2 md:grid-cols-3 items-center">
              <div className="text-sm text-slate-600 md:col-span-2">Location: {pendingPoint ? `${pendingPoint.lat.toFixed(6)}, ${pendingPoint.lon.toFixed(6)}` : 'Click on the map to set location'}</div>
              <div className="flex gap-2 md:justify-end">
                <button className="btn-secondary" onClick={() => { setAddSensorMode(false); setPendingPoint(null) }}>Cancel</button>
                <button className="btn-primary" disabled={!pendingPoint || !newSensorName.trim() || savingSensor} onClick={async ()=>{
                  if (!pendingPoint || !newSensorName.trim()) return
                  try {
                    setSavingSensor(true)
                    const token = await getToken({ template: 'backend' })
                    await apiPostAuth('/api/operator/sensors', token, {
                      sensor_id: newSensorId || null,
                      name: newSensorName.trim(),
                      sensor_type: newSensorType,
                      status: newSensorStatus,
                      lat: pendingPoint.lat,
                      lon: pendingPoint.lon,
                      metadata: {}
                    })
                    setNewSensorName(''); setNewSensorId(''); setNewSensorType('tilt'); setNewSensorStatus('green'); setAddSensorMode(false)
                    setCenterOn({ lat: pendingPoint.lat, lon: pendingPoint.lon })
                    setPendingPoint(null)
                    await loadRegisteredSensors()
                  } catch {}
                  finally { setSavingSensor(false) }
                }}>{savingSensor ? 'Saving…' : 'Save Sensor'}</button>
              </div>
            </div>
          </div>
        )}

        <div className="card-subtle">
          <h3 className="font-medium mb-2">Weather & Location</h3>
          {weatherData ? (
            <div className="text-sm">
              <div className="font-semibold text-xl">{weatherData.temperature_2m}{weatherData.temperature_2m_unit || '°C'}</div>
              <div className="mt-1 text-slate-700">Humidity: {weatherData.relative_humidity_2m}% · Wind: {weatherData.wind_speed_10m} km/h</div>
              {weatherCoords && (
                <div className="mt-1 text-slate-600 text-xs">Lat: {Number(weatherCoords.lat).toFixed(5)} · Lon: {Number(weatherCoords.lon).toFixed(5)}</div>
              )}
            </div>
          ) : (
            <div className="muted text-sm">Select a location on the map to view weather.</div>
          )}
        </div>

        <div className="card-subtle md:col-span-1">
          <h3 className="font-medium mb-2">Save as Plant Hub</h3>
            {selectedLoc ? (
              <form onSubmit={savePlantHub} className="space-y-2">
                <input className="input" placeholder="Hub name" value={hubName} onChange={(e) => setHubName(e.target.value)} />
                <div className="text-xs text-slate-600">Lat: {selectedLoc.lat.toFixed(6)} · Lon: {selectedLoc.lon.toFixed(6)}</div>
                <button className="btn-primary w-full" type="submit">Save Hub</button>
              </form>
            ) : (
              <div className="text-sm text-slate-500">Search and select a location to save it.</div>
            )}
        </div>

        <div className="card-subtle md:col-span-1">
            <h3 className="font-medium mb-2">Your Plant Hubs</h3>
            <ul className="list-pane max-h-80 overflow-auto">
              {hubs.map((h) => (
                <li key={h.id} className="list-item">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-sm">{h.name}</div>
                      <div className="text-xs text-slate-600">{h.lat.toFixed(5)}, {h.lon.toFixed(5)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`badge ${activeWeatherIds.includes(h.id) ? 'badge-green' : 'badge-amber'}`}>{activeWeatherIds.includes(h.id) ? 'Weather: Live' : 'Weather: Off'}</span>
                      <span className={`badge ${activeDemIds.includes(h.id) ? 'badge-green' : 'badge-amber'}`}>{activeDemIds.includes(h.id) ? 'DEM: Live' : 'DEM: Off'}</span>
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button className="btn-secondary" onClick={() => (activeWeatherIds.includes(h.id) ? stopHubWeather(h.id) : startHubWeather(h.id))}>
                      {activeWeatherIds.includes(h.id) ? 'Stop Weather' : 'Start Weather'}
                    </button>
                    <button className="btn-secondary" onClick={() => (activeDemIds.includes(h.id) ? stopHubDem(h.id) : startHubDem(h.id))}>
                      {activeDemIds.includes(h.id) ? 'Stop DEM' : 'Start DEM'}
                    </button>
                  </div>
                  <div className="mt-3 text-xs">
                    {hubWeather[h.id] ? (
                      <div className="rounded bg-slate-50 p-2">
                        <div>Temp: {hubWeather[h.id].temperature_2m}°C</div>
                        <div>Humidity: {hubWeather[h.id].relative_humidity_2m}%</div>
                        <div>Wind: {hubWeather[h.id].wind_speed_10m} km/h</div>
                      </div>
                    ) : (
                      <div className="text-slate-500">No weather yet</div>
                    )}
                    <div className="mt-2 rounded bg-slate-50 p-2 max-h-28 overflow-auto">
                      <div className="font-medium mb-1">DEM Patch</div>
                      {hubDem[h.id]?.length ? (
                        <div>
                          <div className="mb-1">Points: {hubDem[h.id].length}</div>
                          <div className="space-y-1">
                            {hubDem[h.id].slice(0, 6).map((p, idx) => (
                              <div key={idx}>{p.lat.toFixed(4)}, {p.lon.toFixed(4)} · {p.elevation?.toFixed?.(1) ?? '—'} m</div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-slate-500">No DEM yet</div>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
        </div>
      </div>
    </div>
  )
}
