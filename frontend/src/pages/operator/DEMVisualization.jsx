import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useDEMData } from "./DEMDataContext";
import { useSensorData } from "./SensorDataContext";
import {
  Mountain,
  TrendingUp,
  Map,
  Layers,
  BarChart3,
  Eye,
  Download,
  Settings,
  Droplet,
  Flame,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";

const DEMVisualization = () => {
  const {
    demParameters,
    riskAssessment,
    zoneAnalysis,
    historicalDEMData,
    isInitialized,
  } = useDEMData();
  const { t } = useTranslation(["dem", "common"]);
  const { zoneRiskData } = useSensorData();

  const [selectedParameter, setSelectedParameter] = useState("slope");
  const [selectedZone, setSelectedZone] = useState("A3");
  const [viewMode, setViewMode] = useState("overview"); // overview, detailed, comparison

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">{t('dem.loading')}</div>
      </div>
    );
  }

  const parameterOptions = [
    { key: "elevation", label: t('dem.parameters.elevation'), icon: Mountain, color: "#8B4513" },
    { key: "slope", label: t('dem.parameters.slope'), icon: TrendingUp, color: "#FF6B6B" },
    { key: "aspect", label: t('dem.parameters.aspect'), icon: Map, color: "#4ECDC4" },
    {
      key: "porePressure",
      label: t('dem.parameters.porePressure'),
      icon: Droplet,
      color: "#0ea5e9",
    },
    {
      key: "methanePpm",
      label: t('dem.parameters.methanePpm'),
      icon: Flame,
      color: "#f97316",
    },
    { key: "roughness", label: t('dem.parameters.roughness'), icon: Eye, color: "#FFEAA7" },
    { key: "relief", label: t('dem.parameters.relief'), icon: Mountain, color: "#DDA0DD" },
    {
      key: "flowAccumulation",
      label: t('dem.parameters.flowAccumulation'),
      icon: TrendingUp,
      color: "#98D8C8",
    },
    {
      key: "topographicWetnessIndex",
      label: t('dem.parameters.topographicWetnessIndex'),
      icon: Layers,
      color: "#F7DC6F",
    },
  ];

  const getRiskColor = (level) => {
    const colors = {
      high: "#EF4444",
      warning: "#F59E0B",
      safe: "#10B981",
      low: "#3B82F6",
    };
    return colors[level] || colors.safe;
  };

  const getRiskBgColor = (level) => {
    const colors = {
      high: "bg-red-50 border-red-200",
      warning: "bg-yellow-50 border-yellow-200",
      safe: "bg-green-50 border-green-200",
      low: "bg-blue-50 border-blue-200",
    };
    return colors[level] || colors.safe;
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Mountain className="w-5 h-5 text-indigo-600" />
            {t('dem.title')}
          </h3>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">{t('dem.parameter')}:</span>
              <select
                value={selectedParameter}
                onChange={(e) => setSelectedParameter(e.target.value)}
                className="px-3 py-1 border rounded-md text-sm"
              >
                {parameterOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">{t('dem.zone')}:</span>
              <select
                value={selectedZone}
                onChange={(e) => setSelectedZone(e.target.value)}
                className="px-3 py-1 border rounded-md text-sm"
              >
                {zoneAnalysis.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.id} - {zone.name.split(" - ")[1]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Parameter Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {parameterOptions.slice(0, 5).map((param) => {
          const data = demParameters[param.key];
          const Icon = param.icon;
          return (
            <div
              key={param.key}
              className="bg-white p-4 rounded-lg shadow-sm border hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className="w-5 h-5" style={{ color: param.color }} />
                <span className="text-xs text-gray-500">{data.unit}</span>
              </div>
              <div className="text-sm font-medium text-gray-600">
                {param.label}
              </div>
              <div className="text-lg font-bold" style={{ color: param.color }}>
                {data.mean.toFixed(1)}
              </div>
              <div className="text-xs text-gray-500">
                Range: {data.min.toFixed(1)} - {data.max.toFixed(1)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Selected Parameter Details */}
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
            {parameterOptions.find((p) => p.key === selectedParameter)?.icon &&
              React.createElement(
                parameterOptions.find((p) => p.key === selectedParameter).icon,
                {
                  className: "w-5 h-5",
                  style: {
                    color: parameterOptions.find(
                      (p) => p.key === selectedParameter
                    ).color,
                  },
                }
              )}
            {parameterOptions.find((p) => p.key === selectedParameter)?.label}{" "}
            Analysis
          </h4>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">{t('dem.current_value')}</div>
                <div className="text-xl font-bold">
                  {demParameters[selectedParameter]?.mean.toFixed(2)}{" "}
                  {demParameters[selectedParameter]?.unit}
                </div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">{t('dem.std_dev')}</div>
                <div className="text-xl font-bold">
                  {demParameters[selectedParameter]?.std.toFixed(2)}{" "}
                  {demParameters[selectedParameter]?.unit}
                </div>
              </div>
            </div>

            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="text-sm text-blue-800 font-medium">
                {t('dem.description')}
              </div>
              <div className="text-sm text-blue-700">
                {demParameters[selectedParameter]?.description}
              </div>
            </div>

            {/* Historical trend for selected parameter */}
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%" minHeight={200}>
                <LineChart data={historicalDEMData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey={
                      selectedParameter === "slope"
                        ? "avgSlope"
                        : selectedParameter === "roughness"
                          ? "avgRoughness"
                          : selectedParameter === "porePressure"
                            ? "avgPorePressure"
                            : selectedParameter === "methanePpm"
                              ? "avgMethanePpm"
                              : "avgElevation"
                    }
                    stroke={
                      parameterOptions.find((p) => p.key === selectedParameter)
                        ?.color || "#8884d8"
                    }
                    strokeWidth={2}
                    name={
                      parameterOptions.find((p) => p.key === selectedParameter)
                        ?.label
                    }
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Zone Analysis */}
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Map className="w-5 h-5 text-green-600" />
            {t('dem.zone_analysis')} - {selectedZone}
          </h4>

          {(() => {
            const zone = zoneAnalysis.find((z) => z.id === selectedZone);
            if (!zone) return <div>{t('dem.zone_not_found')}</div>;

            return (
              <div className="space-y-4">
                <div
                  className={`p-4 rounded-lg border ${getRiskBgColor("safe")}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{zone.name}</div>
                      <div className="text-sm opacity-80">{t('dem.risk_level')}: {t('dem.risk_levels.safe')}</div>
                    </div>
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: getRiskColor("safe") }}
                    ></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-600">{t('dem.parameters.elevation')}</div>
                    <div className="font-bold">
                      {zone.elevation.mean.toFixed(0)}m
                    </div>
                    <div className="text-xs text-gray-500">
                      {zone.elevation.min}-{zone.elevation.max}m
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-600">{t('dem.parameters.slope')}</div>
                    <div className="font-bold">
                      {zone.slope.mean.toFixed(1)}°
                    </div>
                    <div className="text-xs text-gray-500">
                      {zone.slope.min}-{zone.slope.max}°
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-600">{t('dem.parameters.aspect')}</div>
                    <div className="font-bold">
                      {zone.aspect.mean.toFixed(0)}°
                    </div>
                    <div className="text-xs text-gray-500">
                      {zone.aspect.min}-{zone.aspect.max}°
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-600">{t('dem.parameters.roughness')}</div>
                    <div className="font-bold">
                      {zone.roughness.toFixed(1)} TRI
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-yellow-50 rounded-lg">
                  <div className="text-sm text-yellow-800 font-medium">
                    {t('dem.risk_factors')}
                  </div>
                  <ul className="text-sm text-yellow-700 mt-1">
                    {zone.riskFactors.map((factor, idx) => (
                      <li key={idx}>• {factor}</li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* All Zones Overview */}
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Layers className="w-5 h-5 text-purple-600" />
          {t('dem.all_zones')}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {zoneRiskData.map((z) => (
            <div
              key={z.zone}
              className={`p-4 rounded-lg border ${getRiskBgColor("safe")}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium">{z.zone}</div>
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getRiskColor("safe") }}
                ></div>
              </div>
              <div className="text-sm text-gray-600 mb-2">
                {t('dem.sensors')}: {z.sensors}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="text-gray-500">{t('dem.status')}</div>
                  <div className="font-medium capitalize">{z.status}</div>
                </div>
                <div>
                  <div className="text-gray-500">{t('dem.risk')}</div>
                  <div className="font-medium">{z.risk.toFixed(2)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DEMVisualization;
