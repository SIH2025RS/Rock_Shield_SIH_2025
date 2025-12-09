import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useTranslation } from "react-i18next";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Zap,
  Wind,
  Droplets,
  RefreshCw,
  ChevronRight,
  MapPin,
} from "lucide-react";
import { apiGetAuth } from "../services/api";

export default function SystemHealthCard() {
  const { getToken } = useAuth();
  const { t } = useTranslation("home");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetchSystemHealth();
  }, [getToken]);

  async function fetchSystemHealth() {
    try {
      setLoading(true);
      setError(null);
      const token = await getToken({ template: "backend" });
      // Fetch combined data from a default location
      const response = await apiGetAuth(
        "/api/combined?lat=36.0149&lon=-116.9166&sensor_id=default",
        token
      );
      setData(response);
    } catch (err) {
      console.error("Failed to fetch system health:", err);
      setError(err.message || "Failed to load system health data");
    } finally {
      setLoading(false);
    }
  }

  const getHealthStatus = () => {
    if (!data) return { status: "unknown", color: "slate" };
    const dem = data.dem || {};
    const weather = data.weather || {};
    const sensor = data.sensor || {};

    // Simple health scoring
    const elevation = dem.elevation || 0;
    const temp = weather.temperature || 0;
    const humidity = weather.humidity || 0;

    // Determine status based on conditions
    if (temp > 35 || humidity > 80 || elevation < 100) {
      return { status: "warning", color: "amber" };
    }
    if (temp > 40 || humidity > 90) {
      return { status: "critical", color: "red" };
    }
    return { status: "healthy", color: "green" };
  };

  const health = getHealthStatus();
  const statusColors = {
    healthy: {
      bg: "bg-emerald-50 dark:bg-emerald-950",
      text: "text-emerald-700 dark:text-emerald-300",
      border: "border-emerald-200 dark:border-emerald-800",
    },
    warning: {
      bg: "bg-amber-50 dark:bg-amber-950",
      text: "text-amber-700 dark:text-amber-300",
      border: "border-amber-200 dark:border-amber-800",
    },
    critical: {
      bg: "bg-red-50 dark:bg-red-950",
      text: "text-red-700 dark:text-red-300",
      border: "border-red-200 dark:border-red-800",
    },
    unknown: {
      bg: "bg-slate-50 dark:bg-slate-900",
      text: "text-slate-700 dark:text-slate-300",
      border: "border-slate-200 dark:border-slate-800",
    },
  };

  const colors = statusColors[health.status];
  const dem = data?.dem || {};
  const weather = data?.weather || {};
  const sensor = data?.sensor || {};

  return (
    <div
      className={`rounded-xl border-2 p-6 shadow-sm transition-all ${colors.bg} ${colors.border}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg ${
              health.status === "healthy"
                ? "bg-emerald-100 dark:bg-emerald-900"
                : health.status === "warning"
                ? "bg-amber-100 dark:bg-amber-900"
                : health.status === "critical"
                ? "bg-red-100 dark:bg-red-900"
                : "bg-slate-100 dark:bg-slate-800"
            }`}
          >
            {health.status === "healthy" ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            ) : health.status === "warning" ? (
              <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            ) : health.status === "critical" ? (
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            ) : (
              <Activity className="w-6 h-6 text-slate-600 dark:text-slate-400" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              {t("System Health Summary")}
            </h3>
            <p className={`text-sm font-medium ${colors.text}`}>
              {health.status === "healthy"
                ? "All systems operational"
                : health.status === "warning"
                ? "Warning: Monitor conditions"
                : health.status === "critical"
                ? "Critical: Immediate attention needed"
                : "Status unknown"}
            </p>
          </div>
        </div>
        <button
          onClick={() => fetchSystemHealth()}
          className="p-2 rounded-lg hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors"
          title="Refresh data"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Main Stats Grid */}
      {!loading && data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {/* Temperature */}
          <div className="rounded-lg bg-white/50 dark:bg-slate-800/50 p-3">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-orange-500" />
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                {t("Temperature (°C)")}
              </span>
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {weather.temperature ? weather.temperature.toFixed(1) : "—"}°C
            </div>
          </div>

          {/* Humidity */}
          <div className="rounded-lg bg-white/50 dark:bg-slate-800/50 p-3">
            <div className="flex items-center gap-2 mb-1">
              <Droplets className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                {t("Humidity (%)")}
              </span>
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {weather.humidity ? weather.humidity.toFixed(0) : "—"}%
            </div>
          </div>

          {/* Wind Speed */}
          <div className="rounded-lg bg-white/50 dark:bg-slate-800/50 p-3">
            <div className="flex items-center gap-2 mb-1">
              <Wind className="w-4 h-4 text-cyan-500" />
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                {t("Wind Speed")}
              </span>
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {weather.windspeed ? weather.windspeed.toFixed(1) : "—"} m/s
            </div>
          </div>

          {/* Elevation */}
          <div className="rounded-lg bg-white/50 dark:bg-slate-800/50 p-3">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-4 h-4 text-purple-500" />
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                {t("Elevation")}
              </span>
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {dem.elevation ? dem.elevation.toFixed(0) : "—"}m
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-3 border-current border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {t("Loading system data...")}
            </p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="rounded-lg bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-800 p-3 mb-4">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          <button
            onClick={() => fetchSystemHealth()}
            className="mt-2 text-sm font-medium text-red-600 dark:text-red-400 hover:underline"
          >
            {t("Retry")}
          </button>
        </div>
      )}

      {/* Expandable Details */}
      {!loading && data && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between py-3 px-3 rounded-lg hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors text-slate-900 dark:text-white font-medium"
          >
            <span className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              {t("Detailed Metrics")}
            </span>
            <ChevronRight
              className={`w-5 h-5 transition-transform ${
                expanded ? "rotate-90" : ""
              }`}
            />
          </button>

          {expanded && (
            <div className="mt-3 space-y-2 border-t border-current/20 pt-3">
              {/* DEM Data */}
              {dem && Object.keys(dem).length > 0 && (
                <div className="rounded-lg bg-white/30 dark:bg-slate-800/30 p-3">
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {t("Terrain Data")}
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-600 dark:text-slate-400">
                        {t("Slope Angle")}:
                      </span>
                      <div className="font-medium text-slate-900 dark:text-white">
                        {dem.slope_angle ? dem.slope_angle.toFixed(1) : "—"}°
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-600 dark:text-slate-400">
                        {t("Aspect")}:
                      </span>
                      <div className="font-medium text-slate-900 dark:text-white">
                        {dem.aspect ? dem.aspect.toFixed(0) : "—"}°
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sensor Data */}
              {sensor && Object.keys(sensor).length > 0 && (
                <div className="rounded-lg bg-white/30 dark:bg-slate-800/30 p-3">
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    {t("Sensor Data")}
                  </h4>
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    <p>
                      {t("Last Reading")}:{" "}
                      <span className="font-medium text-slate-900 dark:text-white">
                        {sensor.timestamp
                          ? new Date(sensor.timestamp).toLocaleString()
                          : "—"}
                      </span>
                    </p>
                  </div>
                </div>
              )}

              {/* Action Items */}
              <div className="rounded-lg bg-white/30 dark:bg-slate-800/30 p-3">
                <h4 className="text-sm font-semibold mb-2">
                  {t("Recommended Actions")}
                </h4>
                <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                  {health.status === "critical" && (
                    <>
                      <li className="flex items-start gap-2">
                        <span className="text-red-600 dark:text-red-400 mt-0.5">
                          •
                        </span>
                        <span>
                          {t("Immediately review critical conditions")}
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-600 dark:text-red-400 mt-0.5">
                          •
                        </span>
                        <span>{t("Alert site personnel and supervisors")}</span>
                      </li>
                    </>
                  )}
                  {health.status === "warning" && (
                    <>
                      <li className="flex items-start gap-2">
                        <span className="text-amber-600 dark:text-amber-400 mt-0.5">
                          •
                        </span>
                        <span>{t("Monitor conditions closely")}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-amber-600 dark:text-amber-400 mt-0.5">
                          •
                        </span>
                        <span>{t("Prepare contingency plans")}</span>
                      </li>
                    </>
                  )}
                  {health.status === "healthy" && (
                    <>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-600 dark:text-emerald-400 mt-0.5">
                          •
                        </span>
                        <span>{t("Continue routine monitoring")}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-600 dark:text-emerald-400 mt-0.5">
                          •
                        </span>
                        <span>{t("Maintain current safety protocols")}</span>
                      </li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
