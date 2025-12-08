import React, { createContext, useContext, useState, useEffect } from "react";

const SensorDataContext = createContext();

export const useSensorData = () => {
  const context = useContext(SensorDataContext);
  if (!context) {
    throw new Error("useSensorData must be used within a SensorDataProvider");
  }
  return context;
};

export const SensorDataProvider = ({ children }) => {
  const [sensorData, setSensorData] = useState({
    displacement: 12.5,
    porePressure: 45.8,
    vibration: 0.3,
    temperature: 28.5,
    rainfall: 2.1,
    windSpeed: 15.2,
    tiltAngle: 34.2,
    humidity: 67.3,
  });

  const [alerts, setAlerts] = useState([
    {
      id: 2,
      type: "safe",
      zone: "East Slope - Sector B1",
      probability: 0.45,
      timestamp: "15 mins ago",
      triggers: "Slope >35°, Vibration",
    },
    {
      id: 3,
      type: "safe",
      zone: "South Pit - Sector C2",
      probability: 0.15,
      timestamp: "1 hour ago",
      triggers: "Normal parameters",
    },
  ]);

  const [systemMetrics, setSystemMetrics] = useState({
    totalSensors: 127,
    activeSensors: 98,
    offlineSensors: 8,
    maintenanceSensors: 15,
    calibratingSensors: 6,
    mlAccuracy: 94.2,
    apiResponseTime: 145,
    databaseLoad: 67,
    criticalAlerts: 3,
    activeUsers: 23,
  });

  const [historicalData, setHistoricalData] = useState([]);
  const [riskTrendData, setRiskTrendData] = useState([]);
  const [zoneRiskData, setZoneRiskData] = useState([]);
  const [sensorHealthData, setSensorHealthData] = useState([]);
  const [weatherPattern, setWeatherPattern] = useState([]);

  // Initialize chart data
  useEffect(() => {
    const now = new Date();
    const historicalPoints = [];
    const riskPoints = [];
    const zonePoints = [
      { zone: "North Wall A3", risk: 0.12, status: "Safe", sensors: 12 },
      { zone: "East Slope B1", risk: 0.06, status: "Safe", sensors: 8 },
      { zone: "South Pit C2", risk: 0.15, status: "Safe", sensors: 15 },
      { zone: "West Terrace D1", risk: 0.25, status: "Safe", sensors: 10 },
      { zone: "Central Pit E2", risk: 0.02, status: "Safe", sensors: 18 },
    ];
    const sensorHealth = [
      { name: "Online", value: 98, color: "#10B981" },
      { name: "Offline", value: 8, color: "#EF4444" },
      { name: "Maintenance", value: 15, color: "#F59E0B" },
      { name: "Calibrating", value: 6, color: "#3B82F6" },
    ];
    const weatherPoints = [];

    // Generate historical sensor data
    for (let i = 23; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60 * 60 * 1000);
      historicalPoints.push({
        time: time.getHours() + ":00",
        displacement: 10 + Math.random() * 8 + Math.sin(i * 0.1) * 3,
        porePressure: 40 + Math.random() * 15 + Math.cos(i * 0.15) * 5,
        vibration: 0.2 + Math.random() * 0.4,
        tiltAngle: 30 + Math.random() * 10 + Math.sin(i * 0.08) * 2,
        temperature: 25 + Math.random() * 8,
        rainfall: Math.max(0, Math.random() * 5 - 2),
      });

      riskPoints.push({
        time: time.getHours() + ":00",
        overallRisk: 0.015 + Math.random() * 0.025 + Math.sin(i * 0.1) * 0.008,
        northWall: 0.035 + Math.random() * 0.01,
        eastSlope: 0.015 + Math.random() * 0.015,
        southPit: 0.005 + Math.random() * 0.01,
      });

      weatherPoints.push({
        time: time.getHours() + ":00",
        temperature: 25 + Math.random() * 8,
        humidity: 60 + Math.random() * 20,
        windSpeed: 10 + Math.random() * 15,
        rainfall: Math.max(0, Math.random() * 5 - 2),
      });
    }

    setHistoricalData(historicalPoints);
    setRiskTrendData(riskPoints);
    setZoneRiskData(zonePoints);
    setSensorHealthData(sensorHealth);
    setWeatherPattern(weatherPoints);
  }, []);

  // Simulate real-time data updates
  useEffect(() => {
    const interval = setInterval(() => {
      setSensorData((prev) => ({
        displacement: Math.max(
          0,
          prev.displacement + (Math.random() - 0.5) * 2
        ),
        porePressure: Math.max(
          0,
          prev.porePressure + (Math.random() - 0.5) * 5
        ),
        vibration: Math.max(0, prev.vibration + (Math.random() - 0.5) * 0.1),
        temperature: prev.temperature + (Math.random() - 0.5) * 1,
        rainfall: Math.max(0, prev.rainfall + (Math.random() - 0.3) * 0.5),
        windSpeed: Math.max(0, prev.windSpeed + (Math.random() - 0.5) * 3),
        tiltAngle: Math.max(
          0,
          Math.min(90, prev.tiltAngle + (Math.random() - 0.5) * 1)
        ),
        humidity: Math.max(
          0,
          Math.min(100, prev.humidity + (Math.random() - 0.5) * 3)
        ),
      }));

      // Update historical data
      setHistoricalData((prev) => {
        const now = new Date();
        const newPoint = {
          time:
            now.getHours() + ":" + now.getMinutes().toString().padStart(2, "0"),
          displacement: Math.max(
            0,
            prev[prev.length - 1]?.displacement + (Math.random() - 0.5) * 2 ||
            10
          ),
          porePressure: Math.max(
            0,
            prev[prev.length - 1]?.porePressure + (Math.random() - 0.5) * 5 ||
            40
          ),
          vibration: Math.max(
            0,
            prev[prev.length - 1]?.vibration + (Math.random() - 0.5) * 0.1 ||
            0.2
          ),
          tiltAngle: Math.max(
            0,
            Math.min(
              90,
              prev[prev.length - 1]?.tiltAngle + (Math.random() - 0.5) * 1 || 30
            )
          ),
          temperature:
            prev[prev.length - 1]?.temperature + (Math.random() - 0.5) * 1 ||
            25,
          rainfall: Math.max(0, (Math.random() - 0.3) * 0.5),
        };
        return [...prev.slice(-23), newPoint];
      });
      // Update risk trend data (bounded, smooth) - decimal range 0.001-0.05
      setRiskTrendData((prev) => {
        const now = new Date();
        const last = prev[prev.length - 1] || {};
        const newPoint = {
          time: now.getHours() + ":" + now.getMinutes().toString().padStart(2, "0"),
          overallRisk: Math.max(0.001, Math.min(0.05, (last.overallRisk ?? 0.015) + (Math.random() - 0.5) * 0.003)),
          northWall: Math.max(0.001, Math.min(0.05, (last.northWall ?? 0.035) + (Math.random() - 0.5) * 0.002)),
          eastSlope: Math.max(0.001, Math.min(0.05, (last.eastSlope ?? 0.015) + (Math.random() - 0.5) * 0.002)),
          southPit: Math.max(0.001, Math.min(0.05, (last.southPit ?? 0.005) + (Math.random() - 0.5) * 0.001)),
        };
        return [...prev.slice(-23), newPoint];
      });

      // Update weather pattern
      setWeatherPattern((prev) => {
        const now = new Date();
        const last = prev[prev.length - 1] || {};
        const newPoint = {
          time: now.getHours() + ":" + now.getMinutes().toString().padStart(2, "0"),
          temperature: (last.temperature ?? 25) + (Math.random() - 0.5) * 1,
          humidity: Math.max(0, Math.min(100, (last.humidity ?? 60) + (Math.random() - 0.5) * 2)),
          windSpeed: Math.max(0, (last.windSpeed ?? 10) + (Math.random() - 0.5) * 2),
          rainfall: Math.max(0, (Math.random() - 0.3) * 0.5),
        };
        return [...prev.slice(-23), newPoint];
      });

      // Update zone risk data, keep all Safe with small noise
      setZoneRiskData((prev) =>
        prev.map((z) => {
          const delta = (Math.random() - 0.5) * 0.02;
          const risk = Math.max(0, Math.min(0.3, (z.risk ?? 0.1) + delta));
          return { ...z, risk, status: "Safe" };
        })
      );
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const value = {
    sensorData,
    alerts,
    systemMetrics,
    historicalData,
    riskTrendData,
    zoneRiskData,
    sensorHealthData,
    weatherPattern,
  };

  return (
    <SensorDataContext.Provider value={value}>
      {children}
    </SensorDataContext.Provider>
  );
};
