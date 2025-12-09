import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { apiGetAuth, API_BASE_URL } from "../../services/api";
import { io } from "socket.io-client";
import {
  MapPin,
  ThermometerSun,
  Wind,
  Droplets,
  Satellite,
  Bell,
  Activity,
  Brain,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
} from "recharts";

const SOCKET_URL =
  import.meta.env.VITE_BACKEND_URL ||
  (typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:4000"
    : window.location.origin);

export default function HubDashboard() {
  const { getToken } = useAuth();
  const socketRef = useRef(null);

  const [hubs, setHubs] = useState([]);
  const [selectedHubId, setSelectedHubId] = useState("");
  const [selectedHub, setSelectedHub] = useState(null);

  const [radiusKm, setRadiusKm] = useState(5);
  const [severityColors, setSeverityColors] = useState({
    critical: "#dc2626",
    high: "#f97316",
    medium: "#f59e0b",
    low: "#22c55e",
  });

  const [weatherNow, setWeatherNow] = useState(null);
  const [weatherSeries, setWeatherSeries] = useState([]); // {t, temperature, humidity, wind}

  const [demPatch, setDemPatch] = useState({
    center: null,
    points: [],
    gridSize: 0,
    stepDeg: 0,
  });

  const [nearbyAlerts, setNearbyAlerts] = useState([])
  const [nearbySensors, setNearbySensors] = useState([])
  const [nearbyIncidents, setNearbyIncidents] = useState([])
  const [hours, setHours] = useState(168)
  const [demTileSizeM, setDemTileSizeM] = useState(200)
  const [demDataset, setDemDataset] = useState('SRTMGL1')

  // Load hubs and meta
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const token = await getToken({ template: "backend" });
        const hubsRes = await apiGetAuth("/api/operator/plant-hubs", token);
        const meta = await apiGetAuth("/api/operator/alerts/meta", token);
        if (!mounted) return;
        setHubs(hubsRes.hubs || []);
        setSeverityColors(meta.severityColors || severityColors);
        if ((hubsRes.hubs || []).length > 0) {
          setSelectedHubId(String(hubsRes.hubs[0].id));
        }
      } catch (e) {
        console.error("Failed to load hubs/meta", e);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [getToken]);

  // Update selectedHub when id changes
  useEffect(() => {
    const hub =
      hubs.find((h) => String(h.id) === String(selectedHubId)) || null;
    setSelectedHub(hub || null);
  }, [selectedHubId, hubs]);

  // Subscribe to live hub weather and DEM when hub changes
  useEffect(() => {
    if (!selectedHubId) return;
    if (!socketRef.current) {
      socketRef.current = io(SOCKET_URL, { transports: ["websocket"] });
    }
    const s = socketRef.current;

    const onHubWeather = (payload) => {
      if (String(payload.hubId) !== String(selectedHubId)) return;
      const curr = payload.current;
      if (!curr) return;
      const t = new Date().toISOString();
      setWeatherNow({ ...curr, units: payload.current_units, at: t });
      setWeatherSeries((prev) => {
        const next = [
          ...prev,
          {
            t,
            temperature: Number(curr.temperature_2m),
            humidity: Number(curr.relative_humidity_2m),
            wind: Number(curr.wind_speed_10m),
          },
        ];
        if (next.length > 240) next.shift();
        return next;
      });
    };
    const onHubDem = (payload) => {
      if (String(payload.hubId) !== String(selectedHubId)) return;
      setDemPatch({
        center: payload.center,
        points: payload.points || [],
        gridSize: payload.gridSize,
        stepDeg: payload.stepDeg,
      });
    };

    const onMlPrediction = (payload) => {
      if (payload?.hubId && String(payload.hubId) !== String(selectedHubId))
        return;
      const at = new Date().toISOString();
      setMlPredictions((prev) => [{ ...payload, at }, ...prev].slice(0, 200));
    };

    s.on("hub-weather:update", onHubWeather);
    s.on("hub-dem:update", onHubDem);
    s.on("ml:prediction", onMlPrediction);

    s.emit("subscribe-hub-weather", {
      hubId: Number(selectedHubId),
      intervalMs: 15000,
    });
    s.emit("subscribe-hub-dem", {
      hubId: Number(selectedHubId),
      intervalMs: 20000,
      gridSize: 5,
      stepDeg: 0.005,
    });

    return () => {
      try {
        s.emit("unsubscribe-hub-weather", { hubId: Number(selectedHubId) });
        s.emit("unsubscribe-hub-dem", { hubId: Number(selectedHubId) });
        s.off("hub-weather:update", onHubWeather);
        s.off("hub-dem:update", onHubDem);
        s.off("ml:prediction", onMlPrediction);
      } catch {}
    };
  }, [selectedHubId]);

  // Disconnect socket on unmount
  useEffect(() => {
    return () => {
      try {
        socketRef.current?.disconnect();
      } catch {}
    };
  }, []);

  // Load alerts, sensors, incidents and filter by hub radius
  useEffect(() => {
    if (!selectedHub) return;
    let mounted = true;
    async function load() {
      try {
        const token = await getToken({ template: "backend" });
        const [alertsRes, sensorsRes, incidentsRes] = await Promise.all([
          apiGetAuth(`/api/operator/map/alerts?hours=${hours}`, token),
          apiGetAuth(`/api/operator/map/sensors?hours=${hours}`, token),
          apiGetAuth("/api/operator/incidents?limit=500", token),
        ]);
        if (!mounted) return;
        const hub = selectedHub;
        const alerts = (alertsRes.alerts || []).filter((a) =>
          isWithinRadius(
            hub.lat,
            hub.lon,
            a.location_lat,
            a.location_lon,
            radiusKm
          )
        );
        const sensors = (sensorsRes.sensors || []).filter((s) =>
          isWithinRadius(hub.lat, hub.lon, s.lat, s.lon, radiusKm)
        );
        const incidents = (incidentsRes.incidents || [])
          .filter((i) =>
            isWithinRadius(
              hub.lat,
              hub.lon,
              i.location_lat,
              i.location_lon,
              radiusKm
            )
          )
          .filter((i) => {
            const t = new Date(i.created_at).getTime();
            const since = Date.now() - hours * 3600 * 1000;
            return isFinite(t) ? t >= since : true;
          });
        setNearbyAlerts(alerts);
        setNearbySensors(sensors);
        setNearbyIncidents(incidents);
      } catch (e) {
        console.error("Failed to load hub data", e);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [selectedHub, radiusKm, hours, getToken]);

  const tempSeries = useMemo(
    () =>
      weatherSeries.map((d) => ({
        time: new Date(d.t).toLocaleTimeString(),
        temperature: d.temperature,
      })),
    [weatherSeries]
  );
  const windSeries = useMemo(
    () =>
      weatherSeries.map((d) => ({
        time: new Date(d.t).toLocaleTimeString(),
        wind: d.wind,
      })),
    [weatherSeries]
  );
  const riskSeries = useMemo(
    () =>
      mlPredictions
        .slice(0, 180)
        .reverse()
        .map((p) => {
          const risk = Number(
            p?.risk ?? p?.score ?? p?.probability ?? p?.value
          );
          return {
            time: new Date(p.at || Date.now()).toLocaleTimeString(),
            risk: Number.isFinite(risk) ? risk : null,
          };
        })
        .filter((d) => d.risk !== null),
    [mlPredictions]
  );

  const classifySeverity = (r) => {
    const v = Number(r);
    if (!Number.isFinite(v)) return "low";
    if (v >= 0.8) return "critical";
    if (v >= 0.6) return "high";
    if (v >= 0.3) return "medium";
    return "low";
  };

  const demBBox = useMemo(() => {
    if (!selectedHub) return null
    const size = Math.max(10, Number(demTileSizeM) || 200)
    return computeSquareBBox(selectedHub.lat, selectedHub.lon, size)
  }, [selectedHub, demTileSizeM])

  const demDownloadUrl = useMemo(() => {
    if (!demBBox) return ''
    const params = new URLSearchParams({
      demtype: demDataset,
      south: demBBox.south.toFixed(6),
      north: demBBox.north.toFixed(6),
      west: demBBox.west.toFixed(6),
      east: demBBox.east.toFixed(6)
    })
    return `${API_BASE_URL}/api/dem/geotiff?${params.toString()}`
  }, [demBBox, demDataset])

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <MapPin size={18} className="text-blue-600" />
          <select
            className="input"
            value={selectedHubId}
            onChange={(e) => setSelectedHubId(e.target.value)}
          >
            {hubs.map((h) => (
              <option value={h.id} key={h.id}>
                {h.name} ({h.lat.toFixed(4)}, {h.lon.toFixed(4)})
              </option>
            ))}
          </select>
        </div>
        <div className="ml-auto flex items-center gap-2 text-sm">
          <span>Hours</span>
          <input
            type="number"
            className="input w-24"
            min={1}
            max={720}
            value={hours}
            onChange={(e) =>
              setHours(
                Math.max(1, Math.min(720, Number(e.target.value) || 168))
              )
            }
          />
          <span>·</span>
          <span>Radius</span>
          <input
            type="number"
            className="input w-24"
            min={1}
            max={50}
            value={radiusKm}
            onChange={(e) =>
              setRadiusKm(
                Math.max(1, Math.min(50, Number(e.target.value) || 5))
              )
            }
          />
          <span>km</span>
          <button
            className="btn-secondary"
            onClick={() => {
              if (!selectedHub) return;
              const pad = 0.02;
              const south = (selectedHub.lat - pad).toFixed(6);
              const north = (selectedHub.lat + pad).toFixed(6);
              const west = (selectedHub.lon - pad).toFixed(6);
              const east = (selectedHub.lon + pad).toFixed(6);
              const url = `${API_BASE_URL}/api/dem/geotiff?south=${south}&north=${north}&west=${west}&east=${east}`;
              window.open(url, "_blank");
            }}
            title="Download GeoTIFF around selected hub"
          >
            GeoTIFF
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-800 p-4 shadow-sm">
          <div className="text-slate-500 text-sm">Current Temperature</div>
          <div className="mt-1 flex items-center gap-2 text-2xl font-semibold">
            <ThermometerSun size={18} className="text-orange-600" />{" "}
            {weatherNow
              ? `${weatherNow.temperature_2m} ${
                  weatherNow?.units?.temperature_2m || "°C"
                }`
              : "—"}
          </div>
        </div>
        <div className="rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-800 p-4 shadow-sm">
          <div className="text-slate-500 text-sm">Wind</div>
          <div className="mt-1 flex items-center gap-2 text-2xl font-semibold">
            <Wind size={18} className="text-sky-600" />{" "}
            {weatherNow
              ? `${weatherNow.wind_speed_10m} ${
                  weatherNow?.units?.wind_speed_10m || "km/h"
                }`
              : "—"}
          </div>
        </div>
        <div className="rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-800 p-4 shadow-sm">
          <div className="text-slate-500 text-sm">Humidity</div>
          <div className="mt-1 flex items-center gap-2 text-2xl font-semibold">
            <Droplets size={18} className="text-blue-600" />{" "}
            {weatherNow ? `${weatherNow.relative_humidity_2m}%` : "—"}
          </div>
        </div>
        <div className="rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-800 p-4 shadow-sm">
          <div className="text-slate-500 text-sm">Nearby Alerts</div>
          <div className="mt-1 flex items-center gap-2 text-2xl font-semibold">
            <Bell size={18} className="text-red-600" /> {nearbyAlerts.length}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border bg-white p-6 shadow-sm lg:col-span-2">
          <h3 className="mb-3 flex items-center gap-2">
            <Activity size={18} className="text-blue-600" /> Temperature (live)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={tempSeries}
                margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="time"
                  stroke="#64748b"
                  hide={tempSeries.length > 40}
                />
                <YAxis stroke="#64748b" />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="temperature"
                  stroke="#ef4444"
                  dot={false}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h3 className="mb-3">Wind & Humidity (live)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={weatherSeries.map((d) => ({
                  time: new Date(d.t).toLocaleTimeString(),
                  wind: d.wind,
                  humidity: d.humidity,
                }))}
                margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="time"
                  stroke="#64748b"
                  hide={weatherSeries.length > 40}
                />
                <YAxis stroke="#64748b" />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="wind"
                  stroke="#0ea5e9"
                  dot={false}
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="humidity"
                  stroke="#22c55e"
                  dot={false}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-800 p-6 shadow-sm lg:col-span-2">
          <h3 className="mb-3 flex items-center gap-2">
            <Brain size={18} className="text-purple-600" /> ML Risk (live)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={riskSeries}
                margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="colorRiskLive"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="time"
                  stroke="#64748b"
                  hide={riskSeries.length > 40}
                />
                <YAxis domain={[0, 1]} stroke="#64748b" />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="risk"
                  stroke="#8b5cf6"
                  fillOpacity={1}
                  fill="url(#colorRiskLive)"
                />
                <Line
                  type="monotone"
                  dataKey="risk"
                  stroke="#7c3aed"
                  dot={false}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h3 className="mb-3 flex items-center gap-2"><Satellite size={18} className="text-indigo-600" /> DEM GeoTIFF (OpenTopography)</h3>
        {selectedHub ? (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-xs text-slate-500 mb-1">Dataset</div>
                <select className="input w-full" value={demDataset} onChange={(e) => setDemDataset(e.target.value)}>
                  <option value="SRTMGL1">SRTM GL1 (30m)</option>
                  <option value="AW3D30">AW3D30 / ALOS (30m)</option>
                  <option value="COP30">Copernicus DEM 30m</option>
                </select>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Tile size (m, square)</div>
                <input
                  type="number"
                  className="input w-full"
                  min={50}
                  max={2000}
                  value={demTileSizeM}
                  onChange={(e) => setDemTileSizeM(e.target.value)}
                />
              </div>
            </div>
            {demBBox && (
              <div className="text-[11px] text-slate-600">
                Bounding box (approx):
                <br />
                south {demBBox.south.toFixed(5)}, north {demBBox.north.toFixed(5)}
                <br />
                west {demBBox.west.toFixed(5)}, east {demBBox.east.toFixed(5)}
              </div>
            )}
            <div>
              <a
                className="btn-secondary"
                href={demDownloadUrl || undefined}
                target="_blank"
                rel="noopener noreferrer"
              >
                Download DEM GeoTIFF
              </a>
            </div>
            <div className="text-[11px] text-slate-500">
              Uses the backend /api/dem/geotiff endpoint (OpenTopography Global DEM API).
            </div>
          </div>
        ) : (
          <div className="text-sm text-slate-500">Select a plant hub to enable DEM download.</div>
        )}
      </div>
    </div>
  );
}

function computeSquareBBox(lat, lon, sizeM) {
  const half = sizeM / 2
  const mPerDegLat = 110574
  const latRad = lat * Math.PI / 180
  const mPerDegLon = 111320 * Math.cos(latRad)
  if (!isFinite(mPerDegLon) || mPerDegLon <= 0) {
    return { south: lat, north: lat, west: lon, east: lon }
  }
  const dLat = half / mPerDegLat
  const dLon = half / mPerDegLon
  const south = Math.max(-90, lat - dLat)
  const north = Math.min(90, lat + dLat)
  const west = Math.max(-180, lon - dLon)
  const east = Math.min(180, lon + dLon)
  return { south, north, west, east }
}

function DemMiniHeatmap({ points }) {
  // Map points to a simple grid by coordinates; fallback tiles when unordered
  if (!points || points.length === 0) {
    return (
      <div className="h-64 rounded border bg-slate-50 flex items-center justify-center text-slate-500 text-sm">
        No DEM data
      </div>
    );
  }
  // Normalize to grid
  const lats = [...new Set(points.map((p) => p.lat))].sort((a, b) => a - b);
  const lons = [...new Set(points.map((p) => p.lon))].sort((a, b) => a - b);
  const grid = lats.map(() => new Array(lons.length).fill(null));
  let min = Infinity,
    max = -Infinity;
  for (const p of points) {
    const i = lats.indexOf(p.lat);
    const j = lons.indexOf(p.lon);
    grid[i][j] = p.elevation;
    if (isFinite(p.elevation)) {
      min = Math.min(min, p.elevation);
      max = Math.max(max, p.elevation);
    }
  }
  if (!isFinite(min) || !isFinite(max)) {
    min = 0;
    max = 1;
  }
  return (
    <div className="h-64 w-full overflow-hidden rounded border">
      <div
        className="grid h-full"
        style={{
          gridTemplateRows: `repeat(${grid.length}, 1fr)`,
          gridTemplateColumns: `repeat(${grid[0].length}, 1fr)`,
        }}
      >
        {grid.map((row, i) =>
          row.map((v, j) => {
            const t =
              typeof v === "number" ? (v - min) / Math.max(1e-6, max - min) : 0;
            const color = colorRamp(t);
            const title = typeof v === "number" ? `${v.toFixed(1)} m` : "—";
            return (
              <div
                key={`${i}-${j}`}
                title={title}
                style={{
                  background: color,
                  border: "1px solid rgba(255,255,255,0.2)",
                }}
              />
            );
          })
        )}
      </div>
      <div className="mt-2 text-xs text-slate-500">
        Elevation range: {isFinite(min) ? min.toFixed(1) : "—"} m –{" "}
        {isFinite(max) ? max.toFixed(1) : "—"} m
      </div>
    </div>
  );
}

function colorRamp(t) {
  // Simple blue-green-red ramp
  const r = Math.round(255 * Math.min(1, Math.max(0, (t - 0.5) * 2)));
  const g = Math.round(255 * (1 - Math.abs(t - 0.5) * 2));
  const b = Math.round(255 * Math.min(1, Math.max(0, (0.5 - t) * 2)));
  return `rgb(${r}, ${g}, ${b})`;
}

function isWithinRadius(lat1, lon1, lat2, lon2, radiusKm) {
  if (typeof lat2 !== "number" || typeof lon2 !== "number") return false;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c <= radiusKm;
}
function toRad(d) {
  return (d * Math.PI) / 180;
}
