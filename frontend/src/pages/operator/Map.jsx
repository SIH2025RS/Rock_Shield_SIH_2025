import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import {
  apiGetAuth,
  apiPostAuth,
  apiPutAuth,
  API_BASE_URL,
} from "../../services/api";
import { io } from "socket.io-client";
import Map3D from "../../components/map/Map3D";
import MapSatellite from "../../components/map/MapSatellite";
import MapStreets from "../../components/map/MapStreets";
import InsightCard from "../../components/InsightCard";
import { useTranslation } from "react-i18next";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  ScatterChart,
  Scatter,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  Cloud,
  TrendingUp,
  Zap,
  MapPin,
  Plus,
  X,
  Settings,
  Eye,
  EyeOff,
  Gauge,
  Droplets,
  Wind,
  Mountain,
} from "lucide-react";

export default function OperatorMap() {
  const { getToken } = useAuth();
  const socketRef = useRef(null);
  const { t, i18n } = useTranslation("dashboard");
  const weatherPollersRef = useRef(new Map());
  const [mapSensors, setMapSensors] = useState([]);
  const [mapAlerts, setMapAlerts] = useState([]);
  const [registeredSensors, setRegisteredSensors] = useState([]);
  const [showMapSensors, setShowMapSensors] = useState(true);
  const [showMapAlerts, setShowMapAlerts] = useState(true);
  const [mapHours, setMapHours] = useState(24);
  const [severityColors, setSeverityColors] = useState({});
  const [mapMode, setMapMode] = useState("3d"); // '3d' | 'sat' | 'street'
  const [weatherData, setWeatherData] = useState(null);
  const [weatherCoords, setWeatherCoords] = useState(null);
  const [terrainExaggeration, setTerrainExaggeration] = useState(1.8);
  const [showHillshade, setShowHillshade] = useState(true);
  const [showContours, setShowContours] = useState(true);
  const [contourInterval, setContourInterval] = useState(25);

  const [selectedLoc, setSelectedLoc] = useState(null);
  const [hubName, setHubName] = useState("");
  const [hubs, setHubs] = useState([]);
  const [hubWeather, setHubWeather] = useState({});
  const [hubDem, setHubDem] = useState({});
  const [activeWeatherIds, setActiveWeatherIds] = useState([]);
  const [activeDemIds, setActiveDemIds] = useState([]);
  const [demLoadingStates, setDemLoadingStates] = useState({}); // Track loading state per hub
  const [mlPredictions, setMlPredictions] = useState([]);
  const [selectedAlert, setSelectedAlert] = useState(null);

  const [addSensorMode, setAddSensorMode] = useState(false);
  const [pendingPoint, setPendingPoint] = useState(null);
  const [newSensorName, setNewSensorName] = useState("");
  const [newSensorId, setNewSensorId] = useState("");
  const [newSensorType, setNewSensorType] = useState("tilt");
  const [newSensorStatus, setNewSensorStatus] = useState("green");
  const [savingSensor, setSavingSensor] = useState(false);
  const [centerOn, setCenterOn] = useState(null);

  function onMlPrediction(payload) {
    setMlPredictions((prev) => [payload, ...prev].slice(0, 10));
  }

  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        const token = await getToken({ template: "backend" });
        const meta = await apiGetAuth("/api/operator/alerts/meta", token);
        if (!mounted) return;
        setSeverityColors(meta.severityColors || {});
        await Promise.all([loadMapData(), loadHubs(), loadRegisteredSensors()]);
      } catch {}
    }
    init();
    return () => {
      mounted = false;
    };
  }, [getToken]);

  async function loadMapData() {
    try {
      const token = await getToken({ template: "backend" });
      const [s, a] = await Promise.all([
        apiGetAuth(
          `/api/operator/map/sensors?hours=${encodeURIComponent(mapHours)}`,
          token
        ),
        apiGetAuth(
          `/api/operator/map/alerts?hours=${encodeURIComponent(mapHours)}`,
          token
        ),
      ]);
      setMapSensors(s.sensors || []);
      setMapAlerts(a.alerts || []);
    } catch {}
  }

  async function loadHubs() {
    try {
      const token = await getToken({ template: "backend" });
      const res = await apiGetAuth("/api/operator/plant-hubs?mine=true", token);
      setHubs(res.hubs || []);
    } catch {}
  }

  async function loadRegisteredSensors() {
    try {
      const token = await getToken({ template: "backend" });
      const res = await apiGetAuth("/api/operator/sensors?limit=1000", token);
      const list = res.sensors || [];
      setRegisteredSensors(list);
      if (!centerOn && list.length > 0) {
        const s = list[0];
        const lat = Number(s.lat);
        const lon = Number(s.lon);
        if (isFinite(lat) && isFinite(lon)) setCenterOn({ lat, lon });
      }
    } catch {}
  }

  useEffect(() => {
    const socket = io(API_BASE_URL, { transports: ["websocket"] });
    socketRef.current = socket;
    function onHubWeather(payload) {
      const { hubId, current } = payload || {};
      if (!hubId) return;
      setHubWeather((prev) => ({ ...prev, [hubId]: current || null }));
    }
    function onHubDem(payload) {
      const { hubId, points } = payload || {};
      if (!hubId) return;
      setHubDem((prev) => ({ ...prev, [hubId]: points || [] }));
    }
    socket.on("hub-weather:update", onHubWeather);
    socket.on("hub-dem:update", onHubDem);
    socket.on("ml:prediction", onMlPrediction);
    return () => {
      socket.off("hub-weather:update", onHubWeather);
      socket.off("hub-dem:update", onHubDem);
      socket.off("ml:prediction", onMlPrediction);
      socket.disconnect();
      // clear any weather pollers
      try {
        for (const t of weatherPollersRef.current.values()) clearInterval(t);
        weatherPollersRef.current.clear();
      } catch {}
    };
  }, []);

  function onAlertSelect(a) {
    setSelectedAlert(a || null);
  }

  const selectedInsight = useMemo(() => {
    const a = selectedAlert;
    if (!a) return null;
    const severity = String(a.severity || "low").toLowerCase();
    const meta = a.metadata || {};
    const explain =
      meta.explainability ||
      (meta.ensemble_details && meta.ensemble_details.xgb_info) ||
      {};
    const shapTop = explain.shap_top || [];
    const names = Array.isArray(shapTop)
      ? shapTop
          .map((it) => {
            if (!it) return null;
            if (Array.isArray(it)) return String(it[0]);
            if (typeof it === "object")
              return String(it.feature || it.name || it.key || "");
            return String(it);
          })
          .filter(Boolean)
      : [];
    const mapReasonKey = (n) => {
      const s = String(n || "").toLowerCase();
      if (s.includes("tilt") || s.includes("incline")) return "tilt_up";
      if (s.includes("vib") || s.includes("accel") || s.includes("shake"))
        return "vibration_up";
      if (s.includes("rain") || s.includes("precip")) return "rain_24h";
      return null;
    };
    const keys = names.map(mapReasonKey).filter(Boolean);
    const reasons = (
      keys.length ? keys : ["tilt_up", "vibration_up", "rain_24h"]
    )
      .slice(0, 3)
      .map((k) => t(`insight.reasons.${k}`));
    return {
      severity,
      reasons,
      action: a.recommended_action || null,
      coords:
        typeof a.location_lat === "number" && typeof a.location_lon === "number"
          ? { lat: a.location_lat, lon: a.location_lon }
          : null,
    };
  }, [selectedAlert, t]);

  async function onEscalateSelected() {
    if (!selectedInsight) return;
    try {
      const token = await getToken({ template: "backend" });
      await apiPostAuth("/api/alerts/escalate", token, {
        alertId: selectedAlert?.id || null,
        message: selectedInsight.action || null,
        severity: selectedInsight.severity,
        location: selectedInsight.coords,
        language: i18n.language,
      });
    } catch {}
  }

  async function onAcknowledgeSelected() {
    if (!selectedAlert?.id) return;
    try {
      const token = await getToken({ template: "backend" });
      await apiPutAuth(
        `/api/operator/alerts/${selectedAlert.id}/acknowledge`,
        token,
        {}
      );
      setSelectedAlert(null);
    } catch {}
  }

  function onLocationSelect(loc) {
    setSelectedLoc(loc);
    setHubName(loc?.label || "");
  }

  function onMapAddSensorClick(pt) {
    if (!addSensorMode) return;
    setPendingPoint(pt);
  }

  async function savePlantHub(e) {
    e.preventDefault();
    if (!selectedLoc || !hubName.trim()) return;
    try {
      const token = await getToken({ template: "backend" });
      const body = {
        name: hubName.trim(),
        lat: selectedLoc.lat,
        lon: selectedLoc.lon,
        address: selectedLoc.label || null,
      };
      await apiPostAuth("/api/operator/plant-hubs", token, body);
      setSelectedLoc(null);
      setHubName("");
      await loadHubs();
    } catch {}
  }

  function startHubWeather(hubId) {
    if (!socketRef.current) return;
    socketRef.current.emit("subscribe-hub-weather", {
      hubId,
      intervalMs: 15000,
    });
    setActiveWeatherIds((prev) =>
      prev.includes(hubId) ? prev : [...prev, hubId]
    );
    // start DB polling for latest weather
    const key = String(hubId);
    if (weatherPollersRef.current.has(key)) {
      clearInterval(weatherPollersRef.current.get(key));
      weatherPollersRef.current.delete(key);
    }
    const poll = async () => {
      try {
        const token = await getToken({ template: "backend" });
        const data = await apiGetAuth(
          `/api/weather/latest?hubId=${encodeURIComponent(hubId)}`,
          token
        );
        const curr = data?.current || null;
        if (curr) setHubWeather((prev) => ({ ...prev, [hubId]: curr }));
      } catch {}
    };
    poll();
    const t = setInterval(poll, 15000);
    weatherPollersRef.current.set(key, t);
  }
  function stopHubWeather(hubId) {
    if (!socketRef.current) return;
    socketRef.current.emit("unsubscribe-hub-weather", { hubId });
    setActiveWeatherIds((prev) => prev.filter((id) => id !== hubId));
    // stop DB polling
    const key = String(hubId);
    if (weatherPollersRef.current.has(key)) {
      clearInterval(weatherPollersRef.current.get(key));
      weatherPollersRef.current.delete(key);
    }
  }
  function startHubDem(hubId) {
    if (!socketRef.current) return;
    // Set loading state
    setDemLoadingStates((prev) => ({ ...prev, [hubId]: true }));
    setActiveDemIds((prev) => (prev.includes(hubId) ? prev : [...prev, hubId]));
    // Fetch DEM patches lazily from REST API
    const hub = hubs.find((h) => h.id === hubId);
    if (!hub) return;
    const fetchDemPatches = async () => {
      try {
        const token = await getToken({ template: "backend" });
        const response = await apiGetAuth(
          `/api/dem/patches?lat=${hub.lat}&lon=${hub.lon}&gridSize=3&stepDeg=0.01&limit=100&offset=0`,
          token
        );
        if (response?.data) {
          setHubDem((prev) => ({ ...prev, [hubId]: response.data }));
        }
      } catch (err) {
        console.error("Failed to fetch DEM patches:", err);
      } finally {
        setDemLoadingStates((prev) => ({ ...prev, [hubId]: false }));
      }
    };
    fetchDemPatches();
    // Also subscribe to socket for real-time updates
    socketRef.current.emit("subscribe-hub-dem", {
      hubId,
      intervalMs: 15000,
      gridSize: 3,
      stepDeg: 0.01,
    });
  }
  function stopHubDem(hubId) {
    if (!socketRef.current) return;
    socketRef.current.emit("unsubscribe-hub-dem", { hubId });
    setActiveDemIds((prev) => prev.filter((id) => id !== hubId));
  }

  const demOverlayPoints = activeDemIds.flatMap((id) => hubDem[id] || []);

  function handleWeatherData(payload) {
    setWeatherData(payload?.weather || null);
    setWeatherCoords(payload?.coords || null);
  }

  // Chart data generators
  const sensorStatusData = useMemo(() => {
    const counts = mapSensors.reduce((acc, s) => {
      acc[s.status] = (acc[s.status] || 0) + 1;
      return acc;
    }, {});
    return [
      { name: "Operational", value: counts.green || 0, color: "#10b981" },
      { name: "Warning", value: counts.yellow || 0, color: "#f59e0b" },
      { name: "Critical", value: counts.red || 0, color: "#ef4444" },
    ];
  }, [mapSensors]);

  const alertSeverityData = useMemo(() => {
    const counts = mapAlerts.reduce((acc, a) => {
      acc[a.severity] = (acc[a.severity] || 0) + 1;
      return acc;
    }, {});
    return [
      { severity: "High", count: counts.high || 0 },
      { severity: "Medium", count: counts.medium || 0 },
      { severity: "Low", count: counts.low || 0 },
    ];
  }, [mapAlerts]);

  const riskTrendData = useMemo(() => {
    return [
      { time: "00:00", risk: 0.23, threshold: 0.5 },
      { time: "04:00", risk: 0.31, threshold: 0.5 },
      { time: "08:00", risk: 0.45, threshold: 0.5 },
      { time: "12:00", risk: 0.54, threshold: 0.5 },
      { time: "16:00", risk: 0.67, threshold: 0.5 },
      { time: "20:00", risk: 0.87, threshold: 0.5 },
    ];
  }, []);

  const weatherTrendData = useMemo(() => {
    return [
      { time: "00:00", temp: 24, humidity: 70, wind: 8 },
      { time: "04:00", temp: 22, humidity: 75, wind: 6 },
      { time: "08:00", temp: 25, humidity: 68, wind: 10 },
      { time: "12:00", temp: 28, humidity: 65, wind: 12 },
      { time: "16:00", temp: 30, humidity: 60, wind: 14 },
      { time: "20:00", temp: 26, humidity: 72, wind: 9 },
    ];
  }, []);

  const hubRiskData = useMemo(() => {
    return hubs.map((h) => ({
      name: h.name,
      risk: Math.random() * 100,
      sensors: h.sensors || 0,
    }));
  }, [hubs]);

  const sensorPerformanceData = useMemo(() => {
    return [
      { name: "Sensor 1", uptime: 99.8, latency: 45, accuracy: 98.5 },
      { name: "Sensor 2", uptime: 98.2, latency: 62, accuracy: 97.2 },
      { name: "Sensor 3", uptime: 99.5, latency: 38, accuracy: 99.1 },
      { name: "Sensor 4", uptime: 97.1, latency: 78, accuracy: 95.8 },
    ];
  }, []);

  const riskMatrixData = useMemo(() => {
    return [
      { x: 20, y: 30, size: 400, name: "Hub A", risk: "Low" },
      { x: 50, y: 60, size: 600, name: "Hub B", risk: "Medium" },
      { x: 80, y: 85, size: 800, name: "Hub C", risk: "High" },
      { x: 35, y: 45, size: 500, name: "Hub D", risk: "Medium" },
    ];
  }, []);

  const recentAlertsData = useMemo(() => {
    return [
      {
        id: 1,
        sensor: "Sensor-001",
        type: "High Tilt",
        severity: "info",
        time: "2 min ago",
        value: 45.2,
      },
      {
        id: 2,
        sensor: "Sensor-003",
        type: "Vibration",
        severity: "info",
        time: "5 min ago",
        value: 3.8,
      },
      {
        id: 3,
        sensor: "Sensor-002",
        type: "Temperature",
        severity: "info",
        time: "12 min ago",
        value: 42.1,
      },
      {
        id: 4,
        sensor: "Sensor-004",
        type: "Pressure",
        severity: "info",
        time: "18 min ago",
        value: 1023.5,
      },
    ];
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-[1920px] mx-auto">
        {/* Header */}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  {t("operator:cards.total_sensors")}
                </p>
                <p className="text-3xl font-bold text-slate-900 mt-1">
                  {mapSensors.length}
                </p>
                <p className="text-xs text-emerald-600 mt-1">↑ 2 active</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  {t("operator:cards.active_alerts")}
                </p>
                <p className="text-3xl font-bold text-slate-900 mt-1">
                  {mapAlerts.length}
                </p>
                <p className="text-xs text-red-600 mt-1">
                  {mapAlerts.filter((a) => a.severity === "high").length}{" "}
                  {t("operator:cards.critical_suffix")}
                </p>
              </div>
              <div className="bg-red-100 p-3 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  {t("operator:cards.plant_hubs")}
                </p>
                <p className="text-3xl font-bold text-slate-900 mt-1">
                  {hubs.length}
                </p>
                <p className="text-xs text-emerald-600 mt-1">
                  {activeWeatherIds.length} {t("operator:cards.monitoring")}
                </p>
              </div>
              <div className="bg-emerald-100 p-3 rounded-lg">
                <MapPin className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Map Controls */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-8 border border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2 flex-space-around">
              {["3d", "sat", "street"].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setMapMode(mode)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    mapMode === mode
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {mode === "3d"
                    ? t("operator:controls.mode_3d")
                    : mode === "sat"
                    ? t("operator:controls.mode_sat")
                    : t("operator:controls.mode_street")}
                </button>
              ))}
            </div>

            <div className="h-8 w-px bg-slate-300" />

            <button
              onClick={() => {
                setAddSensorMode(!addSensorMode);
                setPendingPoint(null);
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                addSensorMode
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {addSensorMode ? (
                <X className="w-4 h-4" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {addSensorMode
                ? t("operator:controls.cancel")
                : t("operator:controls.add_sensor")}
            </button>
            <div className="flex items-center gap-2">
              <input
                type="number"
                className="px-3 py-2 border border-slate-300 rounded-lg w-24"
                value={mapHours}
                onChange={(e) => setMapHours(Number(e.target.value) || 24)}
                min={1}
              />
              <span className="text-sm text-slate-600">
                {t("operator:controls.hours")}
              </span>
            </div>
          </div>
        </div>

        {selectedInsight && (
          <div className="mb-6">
            <InsightCard
              severity={selectedInsight.severity}
              reasons={selectedInsight.reasons}
              onEscalate={onEscalateSelected}
              onAcknowledge={onAcknowledgeSelected}
              locationLabel={selectedAlert?.title || undefined}
            />
          </div>
        )}
        {/* Main Map */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-slate-200">
          {mapMode === "3d" && (
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
              heightClass="h-[500px]"
              terrainExaggeration={terrainExaggeration}
              showHillshade={showHillshade}
              showContours={showContours}
              contourInterval={contourInterval}
              enableMapClicks={addSensorMode}
              onMapClick={onMapAddSensorClick}
              centerOn={centerOn}
              onAlertSelect={onAlertSelect}
            />
          )}
          {mapMode === "sat" && (
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
              heightClass="h-[500px]"
              enableMapClicks={addSensorMode}
              onMapClick={onMapAddSensorClick}
              centerOn={centerOn}
              onAlertSelect={onAlertSelect}
            />
          )}
          {mapMode === "street" && (
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
              heightClass="h-[500px]"
              enableMapClicks={addSensorMode}
              onMapClick={onMapAddSensorClick}
              centerOn={centerOn}
              onAlertSelect={onAlertSelect}
            />
          )}
        </div>
        {/* Bottom Grid - Details and Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {mapMode === "3d" && (
            <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-slate-600" />
                {t("operator:controls.terrain_settings")}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    {t("operator:controls.exaggeration")}:{" "}
                    <span className="text-blue-600">
                      {terrainExaggeration.toFixed(1)}x
                    </span>
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    step={0.1}
                    value={terrainExaggeration}
                    onChange={(e) =>
                      setTerrainExaggeration(parseFloat(e.target.value) || 1)
                    }
                    className="w-full accent-blue-600"
                  />
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={showHillshade}
                      onChange={(e) => setShowHillshade(e.target.checked)}
                      className="rounded accent-blue-600"
                    />
                    <span className="text-slate-700">
                      {t("operator:controls.show_hillshade")}
                    </span>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={showContours}
                      onChange={(e) => setShowContours(e.target.checked)}
                      className="rounded accent-blue-600"
                    />
                    <span className="text-slate-700">
                      {t("operator:controls.show_contours")}
                    </span>
                  </label>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    {t("operator:controls.contour_interval")}
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    min={5}
                    step={5}
                    value={contourInterval}
                    onChange={(e) =>
                      setContourInterval(
                        Math.max(5, Number(e.target.value) || 25)
                      )
                    }
                  />
                </div>
              </div>
            </div>
          )}
          {/* DEM Loading Status */}
          {activeDemIds.length > 0 && (
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl shadow-sm p-6 border border-emerald-200">
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Mountain className="w-5 h-5 text-emerald-600" />
                {t("operator:map.dem_loading")}
              </h3>
              <div className="space-y-3">
                {activeDemIds.map((hubId) => {
                  const hub = hubs.find((h) => h.id === hubId);
                  const isLoading = demLoadingStates[hubId];
                  const patchCount = (hubDem[hubId] || []).length;
                  return (
                    <div
                      key={hubId}
                      className="bg-white rounded-lg p-4 border border-emerald-100"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium text-slate-900">
                          {hub?.name || `Hub ${hubId}`}
                        </div>
                        {isLoading ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                            <span className="text-xs text-emerald-600 font-medium">
                              {t("common:loading")}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-emerald-600 font-medium">
                            ✓ {patchCount} {t("operator:map.patches_suffix")}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-600">
                        {hub?.lat.toFixed(4)}, {hub?.lon.toFixed(4)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {/* Real-time Alerts Panel */}
          <div className="bg-gradient-to-br from-white-50 to-white-50 rounded-xl shadow-sm p-6 border border-red-200 mb-8">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              {t("operator:cards.real_time_alerts")}
            </h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {recentAlertsData.map((alert) => (
                <div
                  key={alert.id}
                  className="bg-white rounded-lg p-4 border-l-4 border-white-500 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-slate-900">
                          {alert.sensor}
                        </span>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            alert.severity === "critical"
                              ? "bg-red-100 text-red-700"
                              : alert.severity === "warning"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {alert.type}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600">
                        {t("operator:map.value")}:{" "}
                        <span className="font-semibold">{alert.value}</span>
                      </p>
                    </div>
                    <span className="text-xs text-slate-500">{alert.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Charts moved to Home analytics to declutter Map */}

          {/* Current Weather Widget */}
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl shadow-sm p-6 border border-blue-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Cloud className="w-5 h-5 text-blue-600" />
              {t("operator:cards.current_weather")}
            </h3>
            {weatherData ? (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-5xl font-bold text-slate-900">
                    {weatherData.temperature_2m}°C
                  </div>
                  <div className="text-sm text-slate-600 mt-1">
                    {t("operator:weather_widget.current_temperature")}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-lg p-3 text-center">
                    <Droplets className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                    <div className="text-xs text-slate-600">
                      {t("operator:weather_widget.humidity")}
                    </div>
                    <div className="text-lg font-bold text-slate-900">
                      {weatherData.relative_humidity_2m}%
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-3 text-center">
                    <Wind className="w-5 h-5 text-cyan-500 mx-auto mb-1" />
                    <div className="text-xs text-slate-600">
                      {t("operator:weather_widget.wind_speed")}
                    </div>
                    <div className="text-lg font-bold text-slate-900">
                      {weatherData.wind_speed_10m} km/h
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Cloud className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p className="text-sm text-slate-500">
                  {t("operator:map.select_location")}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
