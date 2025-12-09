import { useMemo, useEffect, useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  AreaChart,
  Area,
  LineChart,
  Line,
  Legend,
} from "recharts";
import {
  Shield,
  Activity,
  AlertTriangle,
  Brain,
  CloudRain,
  Mountain,
} from "lucide-react";
import {
  SensorDataProvider,
  useSensorData,
} from "./operator/SensorDataContext";
import { DEMDataProvider } from "./operator/DEMDataContext";
import DEMVisualization from "./operator/DEMVisualization";
import { health, API_BASE_URL } from "../services/api";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <SensorDataProvider>
          <DEMDataProvider>
            <HomeAnalyticsInner />
            <div className="mt-8">
              <DEMVisualization />
            </div>
          </DEMDataProvider>
        </SensorDataProvider>
      </section>
    </main>
  );
}

function HomeAnalyticsInner() {
  const {
    systemMetrics,
    riskTrendData,
    sensorHealthData,
    alerts,
    weatherPattern,
    zoneRiskData,
    sensorData,
  } = useSensorData();
  const latestRisk = useMemo(() => {
    const last = riskTrendData?.[riskTrendData.length - 1];
    return last?.overallRisk ? last.overallRisk.toFixed(4) : "0.0000";
  }, [riskTrendData]);
  const activeAlerts = alerts?.length || 0;
  const activeSensors = systemMetrics?.activeSensors || 0;
  const mlAccuracy = systemMetrics?.mlAccuracy || 0;
  const [demImageUrl, setDemImageUrl] = useState(null);
  const [demImageLoading, setDemImageLoading] = useState(false);
  const [demFullscreen, setDemFullscreen] = useState(false);
  const [demLat, setDemLat] = useState(32.64852);
  const [demLon, setDemLon] = useState(-108.362817);
  const [demPadDeg, setDemPadDeg] = useState(0.05);
  const [demRamp, setDemRamp] = useState("terrain");
  const [demAz, setDemAz] = useState(315);
  const [demAlt, setDemAlt] = useState(50);
  const [demExag, setDemExag] = useState(2);

  useEffect(() => {
    // Prefetch DEM image with current parameters
    try {
      const base = (API_BASE_URL || "").replace(/\/+$/, "");
      const url = `${base}/api/dem/image?lat=${demLat}&lon=${demLon}&size=400&padDeg=${demPadDeg}&mode=colorshade&ramp=${demRamp}&az=${demAz}&alt=${demAlt}&exag=${demExag}`;
      const img = new Image();
      setDemImageLoading(true);
      img.onload = () => {
        setDemImageUrl(url);
        setDemImageLoading(false);
      };
      img.onerror = () => {
        setDemImageLoading(false);
      };
      img.src = url;
    } catch {}
  }, [demLat, demLon, demPadDeg, demRamp, demAz, demAlt, demExag]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Operational Analytics
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Real-time data interpretation and insights
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-800 p-5">
          <div className="text-slate-500 text-sm flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" /> Overall Risk
          </div>
          <div className="mt-2 text-3xl font-bold">{latestRisk}</div>
        </div>
        <div className="rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-800 p-5">
          <div className="text-slate-500 text-sm flex items-center gap-2">
            <CloudRain className="w-4 h-4 text-cyan-600" /> Current Rainfall
          </div>
          <div className="mt-2 text-3xl font-bold">
            {sensorData?.rainfall?.toFixed(1) || "0.0"}{" "}
            <span className="text-base font-normal text-slate-400">mm</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        <div className="rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-800 p-6 shadow-sm">
          <h3 className="mb-3 text-slate-900 dark:text-white font-semibold">
            Risk Trend (24h)
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={riskTrendData}>
                <defs>
                  <linearGradient
                    id="colorOverallRisk"
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
                <XAxis dataKey="time" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="overallRisk"
                  stroke="#7c3aed"
                  fill="url(#colorOverallRisk)"
                  name="Overall Risk"
                />
                <Line
                  type="monotone"
                  dataKey="northWall"
                  stroke="#ef4444"
                  dot={false}
                  name="North Wall"
                />
                <Line
                  type="monotone"
                  dataKey="eastSlope"
                  stroke="#3b82f6"
                  dot={false}
                  name="East Slope"
                />
                <Line
                  type="monotone"
                  dataKey="southPit"
                  stroke="#10b981"
                  dot={false}
                  name="South Pit"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-slate-900 dark:to-slate-800 dark:border-slate-700 p-6 shadow-sm">
          <h3 className="mb-4 text-slate-900 dark:text-white font-semibold flex items-center gap-2">
            <Mountain className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            DEM Status
          </h3>
          <div className="space-y-3">
            <div className="rounded-lg overflow-hidden border border-emerald-100 dark:border-emerald-900 h-128">
              {demImageUrl ? (
                <img
                  src={demImageUrl}
                  alt="DEM preview"
                  className="w-full h-full object-cover cursor-zoom-in"
                  onClick={() => setDemFullscreen(true)}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-emerald-700 dark:text-emerald-400">
                  {demImageLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                      Generating DEM preview...
                    </span>
                  ) : (
                    "DEM preview pending"
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-800 p-6 shadow-sm">
          <h3 className="mb-3 text-slate-900 dark:text-white font-semibold">
            Weather Pattern (24h)
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weatherPattern}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="time" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="temperature"
                  stroke="#ef4444"
                  strokeWidth={2}
                  name="Temperature (°C)"
                />
                <Line
                  type="monotone"
                  dataKey="humidity"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="Humidity (%)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-800 p-6 shadow-sm">
          <h3 className="mb-3 text-slate-900 dark:text-white font-semibold">
            Zone Risk Comparison
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={zoneRiskData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="zone" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip />
                <Bar
                  dataKey="risk"
                  fill="#8b5cf6"
                  radius={[8, 8, 0, 0]}
                  name="Risk"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-800 p-6 shadow-sm">
          <h3 className="mb-3 text-slate-900 dark:text-white font-semibold">
            Recent Alerts
          </h3>
          <ul className="space-y-3 max-h-72 overflow-auto">
            {alerts.map((a) => (
              <li key={a.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{a.zone}</div>
                  <span className="text-xs font-semibold uppercase">
                    {a.type}
                  </span>
                </div>
                <div className="text-xs text-slate-600">
                  Prob: {(a.probability * 100).toFixed(0)}% · {a.timestamp}
                </div>
                <div className="text-xs text-slate-700">{a.triggers}</div>
              </li>
            ))}
            {alerts.length === 0 && (
              <div className="text-sm text-slate-500">No recent alerts</div>
            )}
          </ul>
        </div>
      </div>
      {demFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-slate-700">
            <h2 className="text-white font-semibold">
              DEM Viewer - Adjust Viewport & Parameters
            </h2>
            <button
              onClick={() => setDemFullscreen(false)}
              className="px-3 py-1.5 rounded-md bg-white/90 text-slate-900 shadow hover:bg-white"
            >
              Close ×
            </button>
          </div>
          <div className="flex flex-1 gap-4 p-4 overflow-hidden">
            <div className="flex-1 flex items-center justify-center">
              {demImageLoading ? (
                <div className="text-white flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  Rendering...
                </div>
              ) : demImageUrl ? (
                <img
                  src={demImageUrl}
                  alt="DEM full screen"
                  className="max-w-full max-h-full rounded-lg shadow-2xl"
                />
              ) : null}
            </div>
            <div className="w-80 bg-slate-800/50 rounded-lg p-4 overflow-y-auto space-y-4">
              <div>
                <label className="text-white text-sm font-medium">
                  Latitude: {demLat.toFixed(4)}
                </label>
                <input
                  type="range"
                  min="-90"
                  max="90"
                  step="0.0001"
                  value={demLat}
                  onChange={(e) => setDemLat(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-white text-sm font-medium">
                  Longitude: {demLon.toFixed(4)}
                </label>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="0.0001"
                  value={demLon}
                  onChange={(e) => setDemLon(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-white text-sm font-medium">
                  Zoom (Pad Deg): {demPadDeg.toFixed(3)}
                </label>
                <input
                  type="range"
                  min="0.001"
                  max="0.25"
                  step="0.001"
                  value={demPadDeg}
                  onChange={(e) => setDemPadDeg(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-white text-sm font-medium">
                  Color Ramp
                </label>
                <select
                  value={demRamp}
                  onChange={(e) => setDemRamp(e.target.value)}
                  className="w-full px-2 py-1 rounded bg-slate-700 text-white text-sm"
                >
                  <option value="terrain">Terrain (Blue-Red)</option>
                  <option value="viridis">Viridis (Dark-Yellow)</option>
                </select>
              </div>
              <div>
                <label className="text-white text-sm font-medium">
                  Azimuth (Light Angle): {demAz}°
                </label>
                <input
                  type="range"
                  min="0"
                  max="360"
                  step="1"
                  value={demAz}
                  onChange={(e) => setDemAz(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-white text-sm font-medium">
                  Altitude (Light Height): {demAlt}°
                </label>
                <input
                  type="range"
                  min="0"
                  max="90"
                  step="1"
                  value={demAlt}
                  onChange={(e) => setDemAlt(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-white text-sm font-medium">
                  Vertical Exaggeration: {demExag.toFixed(1)}x
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="10"
                  step="0.1"
                  value={demExag}
                  onChange={(e) => setDemExag(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
