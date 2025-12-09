import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { Search, X, Cloud, Wind, Droplets, AlertCircle, MapPin } from 'lucide-react'
import { io } from 'socket.io-client'
import { apiGet, API_BASE_URL } from '../services/api'

// Load Mapbox token from environment
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN

if (!MAPBOX_TOKEN) {
  console.warn('Mapbox token not found. Please set VITE_MAPBOX_TOKEN in your .env file')
}

mapboxgl.accessToken = MAPBOX_TOKEN

const DEFAULT_COLORS = {
  critical: '#dc2626',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#22c55e',
}

export default function MapWeather({
  onLocationSelect,
  demPoints = [],
  sensorPoints = [],
  alertPoints = [],
  registeredSensors = [],
  showSensors = true,
  showAlerts = true,
  severityColors = DEFAULT_COLORS,
  fitToData = true,
  mapStyle = 'mapbox://styles/mapbox/satellite-streets-v12',
  enableTerrain = true,
  enableBuildings = true,
  initialPitch = 60,
  initialBearing = -17.6,
  initialZoom = 4,
  heightClass = 'h-[720px]',
  mapOnly = false,
  onWeatherData,
  terrainExaggeration = 1.5,
  showHillshade = true,
  showContours = true,
  contourInterval = 50,
  enableMapClicks = false,
  onMapClick,
  centerOn,
}) {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const socketRef = useRef(null)
  const demMarkersRef = useRef([])
  const sensorMarkersRef = useRef([])
  const alertMarkersRef = useRef([])
  const regMarkersRef = useRef([])
  const clickHandlerRef = useRef(null)
  const inputRef = useRef(null)
  const dbPollerRef = useRef(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const typingTimeoutRef = useRef(null)
  const abortRef = useRef(null)
  const [isSearching, setIsSearching] = useState(false)
  const [weather, setWeather] = useState(null)
  const [loadingWeather, setLoadingWeather] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [coordinates, setCoordinates] = useState(null)
  const [mapError, setMapError] = useState(false)
  const [searchError, setSearchError] = useState('')
  const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || (typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:4000' : window.location.origin)
  const [mapLoaded, setMapLoaded] = useState(false)

  // Initialize Map
  useEffect(() => {
    if (map.current) return // initialize map only once

    try {
      if (!MAPBOX_TOKEN) {
        setMapError(true)
        return
      }

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: mapStyle,
        center: [78.9629, 20.5937], // Default center (India)
        zoom: initialZoom,
        pitch: enableTerrain ? initialPitch : 0,
        bearing: enableTerrain ? initialBearing : 0,
      })

      map.current.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'top-right')
      map.current.dragRotate.enable()
      map.current.touchZoomRotate.enableRotation()

      map.current.on('load', () => {
        setMapLoaded(true)
        try {
          if (enableTerrain) {
            if (!map.current.getSource('mapbox-dem')) {
              map.current.addSource('mapbox-dem', {
                type: 'raster-dem',
                url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
                tileSize: 512,
                maxzoom: 14,
              })
            }
            map.current.setTerrain({ source: 'mapbox-dem', exaggeration: terrainExaggeration })
            if (!map.current.getLayer('hillshade')) {
              map.current.addLayer(
                {
                  id: 'hillshade',
                  type: 'hillshade',
                  source: 'mapbox-dem',
                  layout: { visibility: showHillshade ? 'visible' : 'none' },
                  paint: {
                    'hillshade-exaggeration': 0.6,
                    'hillshade-shadow-color': '#0f172a',
                    'hillshade-highlight-color': '#e2e8f0',
                    'hillshade-illumination-direction': 315,
                  },
                },
                'waterway-label'
              )
            }
            // Contours
            if (!map.current.getSource('mapbox-terrain-v2')) {
              map.current.addSource('mapbox-terrain-v2', {
                type: 'vector',
                url: 'mapbox://mapbox.mapbox-terrain-v2',
              })
            }
            if (!map.current.getLayer('contour-lines')) {
              map.current.addLayer(
                {
                  id: 'contour-lines',
                  type: 'line',
                  source: 'mapbox-terrain-v2',
                  'source-layer': 'contour',
                  layout: { 'line-join': 'round', 'line-cap': 'round', visibility: showContours ? 'visible' : 'none' },
                  paint: {
                    'line-color': [
                      'case',
                      ['==', ['%', ['to-number', ['get', 'ele']], contourInterval], 0],
                      '#475569',
                      '#94a3b8',
                    ],
                    'line-width': [
                      'case',
                      ['==', ['%', ['to-number', ['get', 'ele']], contourInterval * 5], 0],
                      1.3,
                      ['==', ['%', ['to-number', ['get', 'ele']], contourInterval], 0],
                      0.9,
                      0.5,
                    ],
                    'line-opacity': 0.55,
                  },
                },
                'waterway-label'
              )
            }
            try {
              map.current.setLight({
                anchor: 'viewport',
                color: '#ffffff',
                intensity: 0.7,
                position: [1.5, 210, 30],
              })
            } catch {}
          }
          if (enableBuildings && !map.current.getLayer('3d-buildings')) {
            map.current.addLayer(
              {
                id: '3d-buildings',
                source: 'composite',
                'source-layer': 'building',
                filter: ['==', 'extrude', 'true'],
                type: 'fill-extrusion',
                minzoom: 15,
                paint: {
                  'fill-extrusion-color': '#aaa',
                  'fill-extrusion-height': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    15,
                    0,
                    15.05,
                    ['get', 'height'],
                  ],
                  'fill-extrusion-base': ['get', 'min_height'],
                  'fill-extrusion-opacity': 0.6,
                },
              },
              'waterway-label'
            )
          }
          // mapLoaded is already set
        } catch {}
      })
    } catch (err) {
      console.error('Map initialization error:', err)
      setMapError(true)
    }

    return () => map.current?.remove()
  }, [])

  // Add OpenTopography raster hillshade tiles as a raster source/layer
  useEffect(() => {
    const m = map.current
    if (!m || !mapLoaded) return
    try {
      if (!m.getSource('ot-hillshade')) {
        const demTileBase = (API_BASE_URL || '').replace(/\/$/, '')
        m.addSource('ot-hillshade', {
          type: 'raster',
          tiles: [
            `${demTileBase}/api/dem/tiles/{z}/{x}/{y}.png?mode=hillshade`
          ],
          tileSize: 256,
          maxzoom: 14,
        })
      }
      if (!m.getLayer('ot-hillshade')) {
        m.addLayer(
          {
            id: 'ot-hillshade',
            type: 'raster',
            source: 'ot-hillshade',
            layout: { visibility: showHillshade ? 'visible' : 'none' },
            paint: { 'raster-opacity': 0.85 },
          },
          'waterway-label'
        )
      } else {
        // sync visibility with UI
        m.setLayoutProperty('ot-hillshade', 'visibility', showHillshade ? 'visible' : 'none')
      }
    } catch {}
  }, [mapLoaded])

  // Cleanup pending searches on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      try { abortRef.current?.abort() } catch {}
    }
  }, [])

  // React to exaggeration changes
  useEffect(() => {
    const m = map.current
    if (!m || !enableTerrain) return
    try {
      if (m.getSource('mapbox-dem')) {
        m.setTerrain({ source: 'mapbox-dem', exaggeration: terrainExaggeration })
      }
    } catch {}
  }, [terrainExaggeration, enableTerrain])

  // Toggle hillshade visibility
  useEffect(() => {
    const m = map.current
    if (!m) return
    try {
      if (!m.getLayer('hillshade')) {
        if (m.getSource('mapbox-dem')) {
          m.addLayer(
            {
              id: 'hillshade',
              type: 'hillshade',
              source: 'mapbox-dem',
              layout: { visibility: showHillshade ? 'visible' : 'none' },
              paint: {
                'hillshade-exaggeration': 0.6,
                'hillshade-shadow-color': '#0f172a',
                'hillshade-highlight-color': '#e2e8f0',
                'hillshade-illumination-direction': 315,
              },
            },
            'waterway-label'
          )
        }
      } else {
        m.setLayoutProperty('hillshade', 'visibility', showHillshade ? 'visible' : 'none')
      }
      if (m.getLayer('ot-hillshade')) {
        m.setLayoutProperty('ot-hillshade', 'visibility', showHillshade ? 'visible' : 'none')
      }
    } catch {}
  }, [showHillshade])

  // Toggle contour visibility and update interval
  useEffect(() => {
    const m = map.current
    if (!m) return
    try {
      if (!m.getSource('mapbox-terrain-v2')) {
        m.addSource('mapbox-terrain-v2', { type: 'vector', url: 'mapbox://mapbox.mapbox-terrain-v2' })
      }
      if (!m.getLayer('contour-lines')) {
        m.addLayer(
          {
            id: 'contour-lines',
            type: 'line',
            source: 'mapbox-terrain-v2',
            'source-layer': 'contour',
            layout: { 'line-join': 'round', 'line-cap': 'round', visibility: showContours ? 'visible' : 'none' },
            paint: {
              'line-color': [
                'case',
                ['==', ['%', ['to-number', ['get', 'ele']], contourInterval], 0],
                '#475569',
                '#94a3b8',
              ],
              'line-width': [
                'case',
                ['==', ['%', ['to-number', ['get', 'ele']], contourInterval * 5], 0],
                1.3,
                ['==', ['%', ['to-number', ['get', 'ele']], contourInterval], 0],
                0.9,
                0.5,
              ],
              'line-opacity': 0.55,
            },
          },
          'waterway-label'
        )
      } else {
        m.setLayoutProperty('contour-lines', 'visibility', showContours ? 'visible' : 'none')
      }
    } catch {}
  }, [showContours])

  useEffect(() => {
    const m = map.current
    if (!m) return
    try {
      if (m.getLayer('contour-lines')) {
        m.setPaintProperty('contour-lines', 'line-color', [
          'case',
          ['==', ['%', ['to-number', ['get', 'ele']], contourInterval], 0],
          '#475569',
          '#94a3b8',
        ])
        m.setPaintProperty('contour-lines', 'line-width', [
          'case',
          ['==', ['%', ['to-number', ['get', 'ele']], contourInterval * 5], 0],
          1.3,
          ['==', ['%', ['to-number', ['get', 'ele']], contourInterval], 0],
          0.9,
          0.5,
        ])
      }
    } catch {}
  }, [contourInterval])

  // Fly to a coordinate when centerOn changes
  useEffect(() => {
    const m = map.current
    if (!m || !mapLoaded) return
    if (!centerOn || typeof centerOn.lat !== 'number' || typeof centerOn.lon !== 'number') return
    try {
      m.flyTo({ center: [centerOn.lon, centerOn.lat], zoom: Math.max(m.getZoom() || 4, 13), duration: 800 })
    } catch {}
  }, [centerOn, mapLoaded])

  // Overlay DEM patch points
  useEffect(() => {
    const m = map.current
    if (!m || !mapLoaded) return
    // If OT hillshade raster is present, prefer raster and skip point markers
    try {
      if (m.getLayer('ot-hillshade')) {
        demMarkersRef.current.forEach((mk) => mk.remove())
        demMarkersRef.current = []
        return
      }
    } catch {}
    // clear previous markers
    demMarkersRef.current.forEach((mk) => mk.remove())
    demMarkersRef.current = []
    if (!Array.isArray(demPoints) || demPoints.length === 0) return
    demPoints.forEach((p) => {
      if (typeof p?.lon !== 'number' || typeof p?.lat !== 'number') return
      const el = document.createElement('div')
      el.style.width = '8px'
      el.style.height = '8px'
      el.style.borderRadius = '50%'
      el.style.background = '#10b981'
      el.style.boxShadow = '0 0 0 2px rgba(16,185,129,0.25)'
      const mk = new mapboxgl.Marker({ element: el })
        .setLngLat([p.lon, p.lat])
        .setPopup(new mapboxgl.Popup({ offset: 8 }).setHTML(
          `<div style="font:12px system-ui">
             <div><strong>Elevation</strong>: ${p.elevation ?? '—'} m</div>
             <div>${Number(p.lat).toFixed(5)}, ${Number(p.lon).toFixed(5)}</div>
           </div>`
        ))
        .addTo(m)
      demMarkersRef.current.push(mk)
    })
  }, [demPoints, mapLoaded])

  // Overlay sensors and alerts
  useEffect(() => {
    const m = map.current
    if (!m || !mapLoaded) return
    // clear previous markers
    sensorMarkersRef.current.forEach((mk) => mk.remove())
    alertMarkersRef.current.forEach((mk) => mk.remove())
    sensorMarkersRef.current = []
    alertMarkersRef.current = []

    const bounds = new mapboxgl.LngLatBounds()
    let hasPoint = false

    if (showSensors) {
      sensorPoints.forEach((s) => {
        const lon = Number(s.lon)
        const lat = Number(s.lat)
        if (!isFinite(lon) || !isFinite(lat)) return
        const el = document.createElement('div')
        el.style.width = '10px'
        el.style.height = '10px'
        el.style.borderRadius = '50%'
        el.style.background = '#2563eb'
        el.style.boxShadow = '0 0 0 2px rgba(37,99,235,0.25)'
        const mk = new mapboxgl.Marker({ element: el })
          .setLngLat([lon, lat])
          .setPopup(new mapboxgl.Popup({ offset: 12 }).setHTML(
            `<div style="font: 12px system-ui">
               <div><strong>Sensor</strong>: ${escapeHtml(s.sensor_id || '—')}</div>
               <div>${escapeHtml(new Date(s.measured_at).toLocaleString())}</div>
             </div>`
          ))
          .addTo(m)
        sensorMarkersRef.current.push(mk)
        bounds.extend([lon, lat])
        hasPoint = true
      })
    }

    if (showAlerts) {
      alertPoints.forEach((a) => {
        const lon = a.location_lon
        const lat = a.location_lat
        if (typeof lon !== 'number' || typeof lat !== 'number') return
        const color = severityColors[a.severity] || '#111827'
        const el = document.createElement('div')
        el.style.width = '12px'
        el.style.height = '12px'
        el.style.borderRadius = '50%'
        el.style.background = color
        el.style.boxShadow = '0 0 0 2px rgba(0,0,0,0.15)'
        const mk = new mapboxgl.Marker({ element: el })
          .setLngLat([lon, lat])
          .setPopup(new mapboxgl.Popup({ offset: 12 }).setHTML(
            `<div style="font: 12px system-ui">
               <div><strong>${escapeHtml(a.title || 'Alert')}</strong></div>
               <div>Severity: <span style="color:${color}">${escapeHtml(a.severity || '')}</span></div>
               <div>${escapeHtml(new Date(a.created_at).toLocaleString())}</div>
               <div>${escapeHtml(a.sensor_id || '')}</div>
               <div>${escapeHtml(a.recommended_action || '')}</div>
             </div>`
          ))
          .addTo(m)
        alertMarkersRef.current.push(mk)
        bounds.extend([lon, lat])
        hasPoint = true
      })
    }

    if (fitToData && hasPoint) {
      try {
        m.fitBounds(bounds, { padding: 40, duration: 500 })
      } catch {}
    }
  }, [sensorPoints, alertPoints, showSensors, showAlerts, severityColors, fitToData, mapLoaded])

  // Overlay registered sensors with status-based color
  useEffect(() => {
    const m = map.current
    if (!m || !mapLoaded) return
    regMarkersRef.current.forEach((mk) => mk.remove())
    regMarkersRef.current = []
    if (!showSensors) return
    if (!Array.isArray(registeredSensors) || registeredSensors.length === 0) return
    registeredSensors.forEach((s) => {
      const lon = Number(s.lon)
      const lat = Number(s.lat)
      if (!isFinite(lon) || !isFinite(lat)) return
      const status = (s.status || '').toLowerCase()
      const color = status === 'green' || status === 'ok' ? '#16a34a' : status === 'yellow' || status === 'warn' ? '#eab308' : status === 'red' || status === 'critical' ? '#dc2626' : '#0ea5e9'
      const el = document.createElement('div')
      el.style.width = '12px'
      el.style.height = '12px'
      el.style.borderRadius = '50%'
      el.style.background = color
      el.style.boxShadow = '0 0 0 2px rgba(0,0,0,0.15)'
      const mk = new mapboxgl.Marker({ element: el })
        .setLngLat([lon, lat])
        .setPopup(new mapboxgl.Popup({ offset: 12 }).setHTML(
          `<div style="font: 12px system-ui">
             <div><strong>${escapeHtml(s.name || s.sensor_id || 'Sensor')}</strong></div>
             <div>Type: ${escapeHtml(s.sensor_type || '—')}</div>
             <div>Status: <span style="color:${color}">${escapeHtml(s.status || '—')}</span></div>
             <div>${lat.toFixed(5)}, ${lon.toFixed(5)}</div>
             ${s.metadata && s.metadata.ml_prediction ? `<div>ML: ${escapeHtml(String(s.metadata.ml_prediction))}</div>` : ''}
           </div>`
        ))
        .addTo(m)
      regMarkersRef.current.push(mk)
    })
  }, [registeredSensors, showSensors, mapLoaded])

  // Map click handler to add sensors
  useEffect(() => {
    const m = map.current
    if (!m) return
    if (clickHandlerRef.current) {
      try { m.off('click', clickHandlerRef.current) } catch {}
      clickHandlerRef.current = null
    }
    if (!enableMapClicks || typeof onMapClick !== 'function') return
    const handler = (e) => {
      const { lng, lat } = e.lngLat || {}
      if (typeof lat === 'number' && typeof lng === 'number') {
        try { onMapClick({ lat, lon: lng }) } catch {}
      }
    }
    clickHandlerRef.current = handler
    m.on('click', handler)
    return () => {
      if (clickHandlerRef.current) {
        try { m.off('click', clickHandlerRef.current) } catch {}
        clickHandlerRef.current = null
      }
    }
  }, [enableMapClicks, onMapClick])

  useEffect(() => {
    if (socketRef.current) return
    socketRef.current = io(SOCKET_URL, { transports: ['websocket'], autoConnect: true })
    socketRef.current.on('connect_error', () => {})
    socketRef.current.on('weather:update', (payload) => {
      const curr = payload?.current || null
      const units = payload?.current_units || null
      if (curr) {
        const merged = { ...curr }
        if (units && units.temperature_2m) merged.temperature_2m_unit = units.temperature_2m
        setWeather(merged)
        setLoadingWeather(false)
        try {
          if (typeof onWeatherData === 'function') {
            onWeatherData({ weather: merged, coords: payload?.coords || null })
          }
        } catch {}
      }
    })
    socketRef.current.on('weather:error', () => {
      setLoadingWeather(false)
    })
    return () => {
      try {
        socketRef.current?.emit('unsubscribe-weather')
        socketRef.current?.disconnect()
      } catch {}
    }
  }, [SOCKET_URL])

  useEffect(() => {
    if (!coordinates || !socketRef.current) return
    setLoadingWeather(true)
    socketRef.current.emit('subscribe-weather', { lat: coordinates.lat, lon: coordinates.lon, intervalMs: 5000 })
  }, [coordinates])

  // Poll DB for latest weather near selected coordinates
  useEffect(() => {
    const coords = coordinates
    if (!coords) return
    const poll = async () => {
      try {
        const data = await apiGet(`/api/weather/latest?lat=${encodeURIComponent(coords.lat)}&lon=${encodeURIComponent(coords.lon)}`)
        const curr = data?.current || null
        if (curr) {
          setWeather(curr)
          setLoadingWeather(false)
          try { if (typeof onWeatherData === 'function') onWeatherData({ weather: curr, coords: data?.coords || coords }) } catch {}
        }
      } catch {}
    }
    poll()
    if (dbPollerRef.current) clearInterval(dbPollerRef.current)
    dbPollerRef.current = setInterval(poll, 15000)
    return () => { if (dbPollerRef.current) { clearInterval(dbPollerRef.current); dbPollerRef.current = null } }
  }, [coordinates])

  // Search Location (Nominatim)
  // Debounced suggestions as user types (>= 3 chars)
  useEffect(() => {
    const q = (query || '').trim()
    if (q.length < 3) {
      setIsSearching(false)
      setResults([])
      setShowResults(false)
      setSearchError('')
      try { abortRef.current?.abort() } catch {}
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      return
    }
    setIsSearching(true)
    setSearchError('')
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(async () => {
      try { abortRef.current?.abort() } catch {}
      const controller = new AbortController()
      abortRef.current = controller
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=8`
        const res = await fetch(url, { signal: controller.signal })
        if (!res.ok) throw new Error('Search request failed')
        const data = await res.json()
        setResults(Array.isArray(data) ? data : [])
        setShowResults(true)
        setIsSearching(false)
      } catch (err) {
        if (err?.name === 'AbortError') return
        console.error('Search suggest failed:', err)
        setIsSearching(false)
      }
    }, 350)
  }, [query])

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!query) return

    setSearchError('')
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`)
      if (!res.ok) throw new Error('Search request failed')
      const data = await res.json()
      if (data.length === 0) {
        setSearchError('No locations found. Try a different search.')
        setResults([])
      } else {
        setResults(data)
        setShowResults(true)
      }
    } catch (err) {
      console.error('Search failed:', err)
      setSearchError('Search failed. Please try again.')
      setResults([])
    }
  }

  // Select Location & Fetch Weather
  const selectLocation = async (item) => {
    const lat = parseFloat(item.lat)
    const lon = parseFloat(item.lon)

    // Store coordinates
    setCoordinates({ lat, lon })

    // Fly to location
    map.current?.flyTo({
      center: [lon, lat],
      zoom: 13,
      pitch: 60,
      bearing: -17.6,
      duration: 1200,
    })

    setShowResults(false)
    setQuery(item.display_name)
    setSearchError('')
    setLoadingWeather(true)
    try {
      if (typeof onLocationSelect === 'function') {
        onLocationSelect({ lat, lon, label: item.display_name })
      }
    } catch {}
  }

  // Fetch Weather (Open-Meteo)
  const fetchWeather = async (lat, lon) => {
    setLoadingWeather(true)
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code`
      )
      if (!res.ok) throw new Error('Weather fetch failed')
      const data = await res.json()
      setWeather(data.current)
      console.log('Weather data fetched for coordinates:', { lat, lon }, data.current)
    } catch (err) {
      console.error('Weather fetch failed:', err)
      setWeather(null)
    } finally {
      setLoadingWeather(false)
    }
  }

  // Weather Code to Text helper
  const getWeatherDescription = (code) => {
    // Simplified WMO codes
    if (code === 0) return 'Clear sky'
    if (code >= 1 && code <= 3) return 'Partly cloudy'
    if (code >= 45 && code <= 48) return 'Fog'
    if (code >= 51 && code <= 67) return 'Drizzle / Rain'
    if (code >= 71 && code <= 77) return 'Snow'
    if (code >= 80 && code <= 82) return 'Showers'
    if (code >= 95) return 'Thunderstorm'
    return 'Unknown'
  }

  if (mapError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-1 text-red-600" size={20} />
          <div>
            <h3 className="font-semibold text-red-900">Map Configuration Error</h3>
            <p className="mt-1 text-sm text-red-700">
              Mapbox token is not configured. Please add <code className="bg-red-100 px-2 py-1 rounded">VITE_MAPBOX_TOKEN</code> to your <code className="bg-red-100 px-2 py-1 rounded">.env</code> file.
            </p>
            <p className="mt-2 text-xs text-red-600">
              Get a free token at <a href="https://account.mapbox.com/" target="_blank" rel="noopener noreferrer" className="underline">mapbox.com</a>
            </p>
          </div>
        </div>
      </div>
    )
  }

  const mapOnlyBlock = (
    <div className={`relative ${heightClass} rounded-xl overflow-hidden border shadow-sm`}>
      <div ref={mapContainer} className="h-full w-full" />
      <div className="absolute top-4 left-4 z-10 w-full max-w-sm">
        <form onSubmit={handleSearch} className="relative">
          <input
            ref={inputRef}
            type="text"
            className="w-full rounded-lg border border-slate-300 bg-white h-10 pl-10 pr-10 shadow-sm placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Search location..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setShowResults(true)}
            autoComplete="off"
          />
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              onClick={() => { setQuery(''); setResults([]); setShowResults(false); setSearchError(''); inputRef.current?.focus() }}
            >
              <X size={16} />
            </button>
          )}
        </form>
        {searchError && (
          <div className="mt-1 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {searchError}
          </div>
        )}
        {showResults && (
          <div className="mt-1 max-h-60 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
            {isSearching && (
              <div className="px-4 py-2 text-sm text-slate-500">Searching…</div>
            )}
            {!isSearching && results.length === 0 && !searchError && (
              <div className="px-4 py-2 text-sm text-slate-500">No suggestions</div>
            )}
            {results.map((item) => (
              <button
                key={item.place_id}
                className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 border-b border-slate-100 last:border-0"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectLocation(item)}
                title={item.display_name}
              >
                {item.display_name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  if (mapOnly) return mapOnlyBlock

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Map Section */}
      {mapOnlyBlock}

      {/* Weather Section */}
      <div className="rounded-xl border bg-white p-6 shadow-sm h-fit">
        <h2 className="mb-4 text-lg font-semibold flex items-center gap-2">
          <Cloud className="text-blue-500" /> Weather & Location
        </h2>

        {/* Coordinates Display */}
        {coordinates && (
          <div className="mb-4 rounded-lg bg-blue-50 p-3 border border-blue-200">
            <div className="flex items-center gap-2 text-sm text-blue-900 mb-2">
              <MapPin size={16} className="text-blue-600" />
              <span className="font-semibold">Coordinates</span>
            </div>
            <div className="text-xs text-blue-800 space-y-1">
              <div><strong>Latitude:</strong> {coordinates.lat.toFixed(6)}</div>
              <div><strong>Longitude:</strong> {coordinates.lon.toFixed(6)}</div>
            </div>
          </div>
        )}
        
        {loadingWeather ? (
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
            <div className="h-8 bg-slate-200 rounded w-1/2"></div>
            <div className="h-4 bg-slate-200 rounded w-full"></div>
          </div>
        ) : weather ? (
          <div className="space-y-6">
            <div className="text-center py-4 bg-slate-50 rounded-lg">
              <div className="text-4xl font-bold text-slate-800">
                {weather.temperature_2m}{weather.temperature_2m_unit || '°C'}
              </div>
              <div className="text-slate-500 font-medium mt-1">
                {getWeatherDescription(weather.weather_code)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 border rounded-lg">
                <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                  <Wind size={16} /> Wind
                </div>
                <div className="font-semibold">
                  {weather.wind_speed_10m} km/h
                </div>
              </div>
              <div className="p-3 border rounded-lg">
                <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                  <Droplets size={16} /> Humidity
                </div>
                <div className="font-semibold">
                  {weather.relative_humidity_2m}%
                </div>
              </div>
            </div>
            
            <div className="text-xs text-slate-400 text-center mt-4">
              Data provided by Open-Meteo
            </div>
          </div>
        ) : (
          <div className="text-center py-10 text-slate-500">
            <Search size={48} className="mx-auto mb-3 opacity-20" />
            <p>Search and select a location on the map to see weather details.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function escapeHtml(str) {
  if (str == null) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
