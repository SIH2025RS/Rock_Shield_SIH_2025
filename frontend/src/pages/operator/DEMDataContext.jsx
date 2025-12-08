import React, { createContext, useContext, useState, useEffect } from "react";

const DEMDataContext = createContext(null);

export const useDEMData = () => {
  const context = useContext(DEMDataContext);
  if (!context) {
    console.error("useDEMData must be used within a DEMDataProvider");
    throw new Error("useDEMData must be used within a DEMDataProvider");
  }
  return context;
};

export const DEMDataProvider = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);

  // DEM terrain parameters
  const [demParameters, setDEMParameters] = useState({
    elevation: {
      min: 0,
      max: 100,
      mean: 50,
      std: 15,
      unit: "meters",
      description: "Digital Elevation Model",
    },
    slope: {
      min: 0,
      max: 45,
      mean: 12,
      std: 8,
      unit: "degrees",
      description: "Terrain slope angle",
    },
    aspect: {
      min: 0,
      max: 360,
      mean: 180,
      std: 90,
      unit: "degrees",
      description: "Terrain aspect/direction",
    },
    porePressure: {
      min: 40,
      max: 60,
      mean: 50,
      std: 5,
      unit: "kPa",
      description: "Pore water pressure",
    },
    methanePpm: {
      min: 3,
      max: 4,
      mean: 3.5,
      std: 0.2,
      unit: "ppm",
      description: "Methane concentration (ppm)",
    },
    roughness: {
      min: 0,
      max: 10,
      mean: 2.5,
      std: 1.5,
      unit: "TRI",
      description: "Terrain Ruggedness Index",
    },
    relief: {
      min: 0,
      max: 25,
      mean: 8,
      std: 4,
      unit: "meters",
      description: "Local relief variation",
    },
    flowAccumulation: {
      min: 0,
      max: 1000,
      mean: 50,
      std: 100,
      unit: "cells",
      description: "Flow accumulation",
    },
    topographicWetnessIndex: {
      min: 0,
      max: 15,
      mean: 6,
      std: 3,
      unit: "TWI",
      description: "Topographic Wetness Index",
    },
  });

  // Risk assessment based on DEM parameters
  const [riskAssessment, setRiskAssessment] = useState({
    slopeRisk: {
      low: { threshold: 15, count: 45, percentage: 60 },
      medium: { threshold: 30, count: 20, percentage: 27 },
      high: { threshold: 45, count: 10, percentage: 13 },
    },
    curvatureRisk: {
      convex: {
        count: 25,
        risk: "medium",
        description: "Convex slopes prone to erosion",
      },
      concave: {
        count: 30,
        risk: "low",
        description: "Concave slopes more stable",
      },
      planar: {
        count: 20,
        risk: "low",
        description: "Planar slopes generally stable",
      },
    },
    roughnessRisk: {
      smooth: { threshold: 1, count: 35, risk: "low" },
      moderate: { threshold: 3, count: 25, risk: "medium" },
      rough: { threshold: 5, count: 15, risk: "high" },
    },
  });

  // Zone-based DEM analysis
  const [zoneAnalysis, setZoneAnalysis] = useState([
    {
      id: "A3",
      name: "North Wall - Sector A3",
      elevation: { min: 85, max: 120, mean: 102 },
      slope: { min: 25, max: 45, mean: 35 },
      aspect: { min: 315, max: 45, mean: 0 },
      curvature: { plan: -0.2, profile: 0.1 },
      roughness: 4.2,
      riskLevel: "high",
      riskFactors: ["High slope", "Convex curvature", "High roughness"],
    },
    {
      id: "B1",
      name: "East Slope - Sector B1",
      elevation: { min: 60, max: 90, mean: 75 },
      slope: { min: 15, max: 35, mean: 25 },
      aspect: { min: 45, max: 135, mean: 90 },
      curvature: { plan: 0.1, profile: -0.05 },
      roughness: 2.8,
      riskLevel: "warning",
      riskFactors: ["Moderate slope", "Variable aspect"],
    },
    {
      id: "C2",
      name: "South Pit - Sector C2",
      elevation: { min: 40, max: 70, mean: 55 },
      slope: { min: 5, max: 20, mean: 12 },
      aspect: { min: 135, max: 225, mean: 180 },
      curvature: { plan: 0.05, profile: 0.02 },
      roughness: 1.5,
      riskLevel: "safe",
      riskFactors: ["Low slope", "Stable curvature"],
    },
    {
      id: "D1",
      name: "West Terrace - Sector D1",
      elevation: { min: 70, max: 95, mean: 82 },
      slope: { min: 10, max: 25, mean: 18 },
      aspect: { min: 225, max: 315, mean: 270 },
      curvature: { plan: -0.1, profile: 0.08 },
      roughness: 2.1,
      riskLevel: "low",
      riskFactors: ["Moderate slope", "Stable conditions"],
    },
    {
      id: "E2",
      name: "Central Pit - Sector E2",
      elevation: { min: 50, max: 80, mean: 65 },
      slope: { min: 8, max: 30, mean: 19 },
      aspect: { min: 0, max: 360, mean: 180 },
      curvature: { plan: 0.15, profile: -0.1 },
      roughness: 3.2,
      riskLevel: "warning",
      riskFactors: ["Variable slope", "Mixed curvature"],
    },
  ]);

  // Historical DEM analysis trends
  const [historicalDEMData, setHistoricalDEMData] = useState([]);

  // Initialize historical data
  useEffect(() => {
    const now = new Date();
    const historicalPoints = [];

    for (let i = 23; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60 * 60 * 1000);
      historicalPoints.push({
        time: time.getHours() + ":00",
        avgSlope: 15 + Math.random() * 10 + Math.sin(i * 0.1) * 3,
        avgRoughness: 2.5 + Math.random() * 2 + Math.cos(i * 0.15) * 0.5,
        avgElevation: 65 + Math.random() * 15 + Math.sin(i * 0.08) * 5,
        avgPorePressure: 50 + (Math.random() - 0.5) * 8, // ~40-60
        avgMethanePpm: 3.5 + (Math.random() - 0.5) * 0.3, // ~3-4
        maxSlope: 25 + Math.random() * 15,
        riskScore: 30 + Math.random() * 40 + Math.sin(i * 0.1) * 15,
      });
    }

    setHistoricalDEMData(historicalPoints);
    setIsInitialized(true);
  }, []);

  // Simulate real-time DEM parameter updates
  useEffect(() => {
    const interval = setInterval(() => {
      setDEMParameters((prev) => ({
        ...prev,
        slope: {
          ...prev.slope,
          mean: Math.max(
            5,
            Math.min(40, prev.slope.mean + (Math.random() - 0.5) * 2)
          ),
        },
        roughness: {
          ...prev.roughness,
          mean: Math.max(
            1,
            Math.min(8, prev.roughness.mean + (Math.random() - 0.5) * 0.5)
          ),
        },
        relief: {
          ...prev.relief,
          mean: Math.max(
            2,
            Math.min(20, prev.relief.mean + (Math.random() - 0.5) * 1)
          ),
        },
        porePressure: {
          ...prev.porePressure,
          mean: Math.max(
            40,
            Math.min(60, prev.porePressure.mean + (Math.random() - 0.5) * 1)
          ),
        },
        methanePpm: {
          ...prev.methanePpm,
          mean: Math.max(
            3,
            Math.min(4, prev.methanePpm.mean + (Math.random() - 0.5) * 0.05)
          ),
        },
      }));

      // Update historical data
      setHistoricalDEMData((prev) => {
        const now = new Date();
        const newPoint = {
          time:
            now.getHours() + ":" + now.getMinutes().toString().padStart(2, "0"),
          avgSlope: Math.max(
            5,
            Math.min(
              40,
              prev[prev.length - 1]?.avgSlope + (Math.random() - 0.5) * 2 || 15
            )
          ),
          avgRoughness: Math.max(
            1,
            Math.min(
              8,
              prev[prev.length - 1]?.avgRoughness +
                (Math.random() - 0.5) * 0.5 || 2.5
            )
          ),
          avgElevation: Math.max(
            40,
            Math.min(
              120,
              prev[prev.length - 1]?.avgElevation + (Math.random() - 0.5) * 3 ||
                65
            )
          ),
          avgPorePressure: Math.max(
            40,
            Math.min(
              60,
              (prev[prev.length - 1]?.avgPorePressure ?? 50) + (Math.random() - 0.5) * 1.5
            )
          ),
          avgMethanePpm: Math.max(
            3,
            Math.min(
              4,
              (prev[prev.length - 1]?.avgMethanePpm ?? 3.5) + (Math.random() - 0.5) * 0.05
            )
          ),
          maxSlope: Math.max(
            20,
            Math.min(
              50,
              prev[prev.length - 1]?.maxSlope + (Math.random() - 0.5) * 3 || 30
            )
          ),
          riskScore: Math.max(
            10,
            Math.min(
              90,
              prev[prev.length - 1]?.riskScore + (Math.random() - 0.5) * 5 || 40
            )
          ),
        };
        return [...prev.slice(-23), newPoint];
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // DEM-based risk calculation
  const calculateRiskFromDEM = (zoneId) => {
    const zone = zoneAnalysis.find((z) => z.id === zoneId);
    if (!zone) return 0;

    let riskScore = 0;

    // Slope contribution (40% weight)
    if (zone.slope.mean > 35) riskScore += 40;
    else if (zone.slope.mean > 25) riskScore += 25;
    else if (zone.slope.mean > 15) riskScore += 10;

    // Curvature contribution (30% weight)
    if (Math.abs(zone.curvature.plan) > 0.15) riskScore += 30;
    else if (Math.abs(zone.curvature.plan) > 0.1) riskScore += 20;
    else if (Math.abs(zone.curvature.plan) > 0.05) riskScore += 10;

    // Roughness contribution (20% weight)
    if (zone.roughness > 4) riskScore += 20;
    else if (zone.roughness > 3) riskScore += 15;
    else if (zone.roughness > 2) riskScore += 10;

    // Elevation contribution (10% weight)
    if (zone.elevation.mean > 100) riskScore += 10;
    else if (zone.elevation.mean > 80) riskScore += 5;

    return Math.min(100, riskScore);
  };

  // Get risk level from score
  const getRiskLevel = (score) => {
    if (score >= 70) return "high";
    if (score >= 40) return "warning";
    return "safe";
  };

  const value = {
    demParameters,
    riskAssessment,
    zoneAnalysis,
    historicalDEMData,
    calculateRiskFromDEM,
    getRiskLevel,
    isInitialized,
  };

  return (
    <DEMDataContext.Provider value={value}>{children}</DEMDataContext.Provider>
  );
};
