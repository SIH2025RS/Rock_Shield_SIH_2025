import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

const defaultToken = import.meta.env.VITE_MAPBOX_TOKEN

const DEFAULT_COLORS = {
  critical: '#dc2626',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#22c55e',
}

export default function MapView({
  accessToken = defaultToken,
  center = [85.0, 23.0],
  zoom = 10,
  sensors = [],
  alerts = [],
  showSensors = true,
  showAlerts = true,
  severityColors = DEFAULT_COLORS,
  fitToData = true,
  style = { height: '420px', width: '100%' },
}) {
  const mapContainer = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef([])

  useEffect(() => {
    if (!mapContainer.current) return
    if (!accessToken) return

    mapboxgl.accessToken = accessToken
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center,
      zoom,
    })

    map.addControl(new mapboxgl.NavigationControl(), 'top-right')
    mapRef.current = map

    return () => {
      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []
      map.remove()
    }
  }, [accessToken])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // Clear old markers
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    const bounds = new mapboxgl.LngLatBounds()
    let hasPoint = false

    if (showSensors) {
      sensors.forEach((s) => {
        if (typeof s.lon !== 'number' || typeof s.lat !== 'number') return
        const el = document.createElement('div')
        el.style.width = '10px'
        el.style.height = '10px'
        el.style.borderRadius = '50%'
        el.style.background = '#2563eb'
        el.style.boxShadow = '0 0 0 2px rgba(37,99,235,0.25)'
        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([s.lon, s.lat])
          .setPopup(
            new mapboxgl.Popup({ offset: 12 }).setHTML(
              `<div style="font: 12px system-ui">
                <div><strong>Sensor</strong>: ${escapeHtml(s.sensor_id || '—')}</div>
                <div>${escapeHtml(new Date(s.measured_at).toLocaleString())}</div>
              </div>`
            )
          )
          .addTo(map)
        markersRef.current.push(marker)
        bounds.extend([s.lon, s.lat])
        hasPoint = true
      })
    }

    if (showAlerts) {
      alerts.forEach((a) => {
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
        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([lon, lat])
          .setPopup(
            new mapboxgl.Popup({ offset: 12 }).setHTML(
              `<div style="font: 12px system-ui">
                <div><strong>${escapeHtml(a.title || 'Alert')}</strong></div>
                <div>Severity: <span style="color:${color}">${escapeHtml(a.severity || '')}</span></div>
                <div>${escapeHtml(new Date(a.created_at).toLocaleString())}</div>
                <div>${escapeHtml(a.sensor_id || '')}</div>
                <div>${escapeHtml(a.recommended_action || '')}</div>
              </div>`
            )
          )
          .addTo(map)
        markersRef.current.push(marker)
        bounds.extend([lon, lat])
        hasPoint = true
      })
    }

    if (fitToData && hasPoint) {
      try {
        map.fitBounds(bounds, { padding: 40, duration: 500 })
      } catch {}
    }
  }, [sensors, alerts, showSensors, showAlerts, severityColors, fitToData])

  if (!defaultToken && !accessToken) {
    return (
      <div className="rounded-xl border bg-white p-6 shadow-sm text-sm text-red-600">
        Mapbox token missing. Set VITE_MAPBOX_TOKEN in your environment.
      </div>
    )
  }

  return <div ref={mapContainer} style={style} className="rounded-xl overflow-hidden" />
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
