import { useMemo, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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
import { useDEMData } from "./operator/DEMDataContext";

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
  const { t } = useTranslation(["home", "common"]);
  const {
    systemMetrics,
    riskTrendData,
    sensorHealthData,
    alerts,
    weatherPattern,
    zoneRiskData,
    sensorData,
  } = useSensorData();
  const { zoneAnalysis } = useDEMData();
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
  const [hoverInfo, setHoverInfo] = useState(null);

  const gridCols = 3;
  const gridRows = Math.max(1, Math.ceil((zoneAnalysis?.length || 0) / gridCols));
  const cellW = 100 / gridCols;
  const cellH = 100 / gridRows;
  const cells = (zoneAnalysis || []).map((z, i) => ({
    zone: z,
    col: i % gridCols,
    row: Math.floor(i / gridCols),
  }));
  function riskFill(level) {
    if (level === "high") return "rgba(239,68,68,0.22)";
    if (level === "warning") return "rgba(245,158,11,0.22)";
    if (level === "low") return "rgba(59,130,246,0.22)";
    return "rgba(16,185,129,0.22)";
  }

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
    } catch { }
  }, [demLat, demLon, demPadDeg, demRamp, demAz, demAlt, demExag]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            {t('title')}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t('subtitle')}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-800 p-5">
          <div className="text-slate-500 text-sm flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" /> {t('common:overall_risk')}
          </div>
          <div className="mt-2 text-3xl font-bold">{latestRisk}</div>
        </div>
        <div className="rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-800 p-5">
          <div className="text-slate-500 text-sm flex items-center gap-2">
            <CloudRain className="w-4 h-4 text-cyan-600" /> {t('common:current_rainfall')}
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
            {t('risk_trend')}
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
                  name={t('common:overall_risk')}
                />
                <Line
                  type="monotone"
                  dataKey="northWall"
                  stroke="#ef4444"
                  dot={false}
                  name={t('common:north_wall')}
                />
                <Line
                  type="monotone"
                  dataKey="eastSlope"
                  stroke="#3b82f6"
                  dot={false}
                  name={t('common:east_slope')}
                />
                <Line
                  type="monotone"
                  dataKey="southPit"
                  stroke="#10b981"
                  dot={false}
                  name={t('common:south_pit')}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-slate-900 dark:to-slate-800 dark:border-slate-700 p-6 shadow-sm">
          <h3 className="mb-4 text-slate-900 dark:text-white font-semibold flex items-center gap-2">
            <Mountain className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            {t('dem_status')}
          </h3>
          <div className="space-y-3">
            <div className="rounded-lg overflow-hidden border border-emerald-100 dark:border-emerald-900 h-128 relative">
              {demImageUrl ? (
                <>
                  <img
                    src={demImageUrl}
                    alt={t('dem_preview_alt')}
                    className="w-full h-full object-cover cursor-zoom-in"
                    onClick={() => setDemFullscreen(true)}
                  />
                  <div className="absolute inset-0">
                    <svg viewBox="0 0 100 100" className="w-full h-full" onClick={() => setDemFullscreen(true)}>
                      {Array.from({ length: gridCols - 1 }).map((_, c) => (
                        <line key={`v${c}`} x1={(c + 1) * cellW} y1={0} x2={(c + 1) * cellW} y2={100} stroke="rgba(255,255,255,0.6)" strokeWidth="0.4" />
                      ))}
                      {Array.from({ length: gridRows - 1 }).map((_, r) => (
                        <line key={`h${r}`} x1={0} y1={(r + 1) * cellH} x2={100} y2={(r + 1) * cellH} stroke="rgba(255,255,255,0.6)" strokeWidth="0.4" />
                      ))}
                      {cells.map((cell, idx) => (
                        <rect
                          key={cell.zone.id || idx}
                          x={cell.col * cellW + 0.2}
                          y={cell.row * cellH + 0.2}
                          width={cellW - 0.4}
                          height={cellH - 0.4}
                          fill={riskFill(cell.zone.riskLevel)}
                          stroke="rgba(0,0,0,0.25)"
                          strokeWidth="0.2"
                          onMouseEnter={() => setHoverInfo({ zone: cell.zone, x: (cell.col + 0.5) * cellW, y: (cell.row + 0.5) * cellH })}
                          onMouseLeave={() => setHoverInfo(null)}
                        />
                      ))}
                    </svg>
                    {hoverInfo && (
                      <div
                        className="absolute px-2 py-1 rounded-md text-xs font-medium bg-black/80 text-white shadow"
                        style={{ left: `${hoverInfo.x}%`, top: `${hoverInfo.y}%`, transform: "translate(-50%, -120%)" }}
                      >
                        {hoverInfo.zone.name}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-emerald-700 dark:text-emerald-400">
                  {demImageLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                      {t('generating_preview')}
                    </span>
                  ) : (
                    t('preview_pending')
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
            {t('weather_pattern')}
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
                  name={t('temperature')}
                />
                <Line
                  type="monotone"
                  dataKey="humidity"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name={t('humidity')}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-800 p-6 shadow-sm">
          <h3 className="mb-3 text-slate-900 dark:text-white font-semibold">
            {t('zone_risk_comparison')}
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
                  name={t('common:risk')}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-800 p-6 shadow-sm">
          <h3 className="mb-3 text-slate-900 dark:text-white font-semibold">
            {t('recent_alerts')}
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
                  {t('common:probability')}: {(a.probability * 100).toFixed(0)}% · {a.timestamp}
                </div>
                <div className="text-xs text-slate-700">{a.triggers}</div>
              </li>
            ))}
            {alerts.length === 0 && (
              <div className="text-sm text-slate-500">{t('no_recent_alerts')}</div>
            )}
          </ul>
        </div>
      </div>
      {demFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-slate-700">
            <h2 className="text-white font-semibold">
              {t('dem_viewer_title')}
            </h2>
            <button
              onClick={() => setDemFullscreen(false)}
              className="px-3 py-1.5 rounded-md bg-white/90 text-slate-900 shadow hover:bg-white"
            >
              {t('common:close')} ×
            </button>
          </div>
          <div className="flex flex-1 gap-4 p-4 overflow-hidden">
            <div className="flex-1 flex items-center justify-center">
              {demImageLoading ? (
                <div className="text-white flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  {t('common:rendering')}
                </div>
              ) : demImageUrl ? (
                <div className="relative">
                  <img
                    src={demImageUrl}
                    alt={t('dem_full_screen_alt')}
                    className="max-w-full max-h-full rounded-lg shadow-2xl"
                  />
                  <div className="absolute inset-0">
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                      {Array.from({ length: gridCols - 1 }).map((_, c) => (
                        <line key={`fv${c}`} x1={(c + 1) * cellW} y1={0} x2={(c + 1) * cellW} y2={100} stroke="rgba(255,255,255,0.7)" strokeWidth="0.35" />
                      ))}
                      {Array.from({ length: gridRows - 1 }).map((_, r) => (
                        <line key={`fh${r}`} x1={0} y1={(r + 1) * cellH} x2={100} y2={(r + 1) * cellH} stroke="rgba(255,255,255,0.7)" strokeWidth="0.35" />
                      ))}
                      {cells.map((cell, idx) => (
                        <rect
                          key={`f${cell.zone.id || idx}`}
                          x={cell.col * cellW + 0.15}
                          y={cell.row * cellH + 0.15}
                          width={cellW - 0.3}
                          height={cellH - 0.3}
                          fill={riskFill(cell.zone.riskLevel)}
                          stroke="rgba(0,0,0,0.25)"
                          strokeWidth="0.2"
                          onMouseEnter={() => setHoverInfo({ zone: cell.zone, x: (cell.col + 0.5) * cellW, y: (cell.row + 0.5) * cellH })}
                          onMouseLeave={() => setHoverInfo(null)}
                        />
                      ))}
                    </svg>
                    {hoverInfo && (
                      <div
                        className="absolute px-2 py-1 rounded-md text-xs font-medium bg-black/80 text-white shadow"
                        style={{ left: `${hoverInfo.x}%`, top: `${hoverInfo.y}%`, transform: "translate(-50%, -120%)" }}
                      >
                        {hoverInfo.zone.name}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
            <div className="w-80 bg-slate-800/50 rounded-lg p-4 overflow-y-auto space-y-4">
              <div>
                <label className="text-white text-sm font-medium">
                  {t('dem_controls.latitude')}: {demLat.toFixed(4)}
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
                  {t('dem_controls.longitude')}: {demLon.toFixed(4)}
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
                  {t('dem_controls.zoom')}: {demPadDeg.toFixed(3)}
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
                  {t('dem_controls.color_ramp')}
                </label>
                <select
                  value={demRamp}
                  onChange={(e) => setDemRamp(e.target.value)}
                  className="w-full px-2 py-1 rounded bg-slate-700 text-white text-sm"
                >
                  <option value="terrain">{t('dem_options.terrain')}</option>
                  <option value="viridis">{t('dem_options.viridis')}</option>
                </select>
              </div>
              <div>
                <label className="text-white text-sm font-medium">
                  {t('dem_controls.azimuth')}: {demAz}°
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
                  {t('dem_controls.altitude')}: {demAlt}°
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
                  {t('dem_controls.vertical_exaggeration')}: {demExag.toFixed(1)}x
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
