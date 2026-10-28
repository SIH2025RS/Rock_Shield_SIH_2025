const axios = require('axios');
const pool = require('../db/pool');
const config = require('../config/config');

/**
 * Enhanced DEM Service
 * Fetches elevation from OpenTopography and calculates terrain derivatives:
 * - Slope angle
 * - Curvature  
 * - Aspect
 * - Terrain Ruggedness Index (TRI)
 * - Drainage-related features
 * - TWI (Topographic Wetness Index)
 */

function parseAAIGrid(text) {
  const lines = String(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim().length > 0);
  let i = 0;
  const header = {};
  while (i < lines.length) {
    const line = lines[i].trim();
    const m = line.match(/^(ncols|nrows|xllcorner|yllcorner|xllcenter|yllcenter|cellsize|NODATA_value)\s+(-?\d+\.?\d*(?:[eE][+-]?\d+)?)$/i);
    if (!m) break;
    header[m[1].toLowerCase()] = Number(m[2]);
    i++;
  }
  const ncols = header.ncols | 0; const nrows = header.nrows | 0; const cellsize = Number(header.cellsize);
  if (!ncols || !nrows || !isFinite(cellsize)) throw new Error('Invalid AAIGrid header');
  const xllcorner = (header.xllcorner != null ? Number(header.xllcorner) : (header.xllcenter != null ? Number(header.xllcenter) - cellsize / 2 : null));
  const yllcorner = (header.yllcorner != null ? Number(header.yllcorner) : (header.yllcenter != null ? Number(header.yllcenter) - cellsize / 2 : null));
  if (!isFinite(xllcorner) || !isFinite(yllcorner)) throw new Error('Invalid AAIGrid origin');
  const nodata = header['nodata_value'] != null ? Number(header['nodata_value']) : null;
  const dataLines = lines.slice(i);
  const values = [];
  let r = 0;
  for (const ln of dataLines) {
    if (!ln || !ln.trim()) continue;
    const parts = ln.trim().split(/\s+/).map(Number);
    if (parts.length) {
      values.push(parts);
      r++;
      if (r >= nrows) break;
    }
  }
  if (values.length !== nrows) throw new Error('AAIGrid rows mismatch');
  for (const row of values) {
    if (row.length < ncols) throw new Error('AAIGrid cols mismatch');
  }
  return { ncols, nrows, cellsize, xllcorner, yllcorner, values, nodata };
}

function nearestCell(grid, lat, lon) {
  const { ncols, nrows, cellsize, xllcorner, yllcorner, values, nodata } = grid;
  let best = null; let bestD = Infinity; let bestI = 0; let bestJ = 0;
  for (let i = 0; i < nrows; i++) {
    const cellLat = yllcorner + cellsize * (nrows - 1 - i + 0.5);
    for (let j = 0; j < ncols; j++) {
      const cellLon = xllcorner + cellsize * (j + 0.5);
      const v = values[i][j];
      if (nodata != null && v === nodata) continue;
      const d = Math.hypot(lat - cellLat, lon - cellLon);
      if (d < bestD) { bestD = d; best = v; bestI = i; bestJ = j; }
    }
  }
  return { elevation: best, i: bestI, j: bestJ };
}

/**
 * Calculate slope angle using Horn's method (3x3 neighborhood)
 * Returns slope in degrees
 */
function calculateSlope(grid, i, j) {
  const { values, cellsize, nodata } = grid;
  const rows = values.length;
  const cols = values[0].length;

  // Get 3x3 neighborhood
  const z = Array(9).fill(0);
  let idx = 0;
  for (let di = -1; di <= 1; di++) {
    for (let dj = -1; dj <= 1; dj++) {
      const ni = i + di;
      const nj = j + dj;
      if (ni >= 0 && ni < rows && nj >= 0 && nj < cols) {
        const val = values[ni][nj];
        z[idx] = (val !== nodata) ? val : values[i][j]; // Use center value if nodata
      } else {
        z[idx] = values[i][j]; // Use center for edge cells
      }
      idx++;
    }
  }

  // Horn's method: [dz/dx] = ((z3 + 2*z6 + z9) - (z1 + 2*z4 + z7)) / (8 * cellsize)
  const dz_dx = ((z[2] + 2 * z[5] + z[8]) - (z[0] + 2 * z[3] + z[6])) / (8 * cellsize);
  const dz_dy = ((z[6] + 2 * z[7] + z[8]) - (z[0] + 2 * z[1] + z[2])) / (8 * cellsize);

  const slope_radians = Math.atan(Math.sqrt(dz_dx * dz_dx + dz_dy * dz_dy));
  return slope_radians * (180 / Math.PI); // Convert to degrees
}

/**
 * Calculate aspect (direction of slope) using Horn's method
 * Returns aspect in degrees (0-360, with 0 = North)
 */
function calculateAspect(grid, i, j) {
  const { values, cellsize, nodata } = grid;
  const rows = values.length;
  const cols = values[0].length;

  // Get 3x3 neighborhood
  const z = Array(9).fill(0);
  let idx = 0;
  for (let di = -1; di <= 1; di++) {
    for (let dj = -1; dj <= 1; dj++) {
      const ni = i + di;
      const nj = j + dj;
      if (ni >= 0 && ni < rows && nj >= 0 && nj < cols) {
        const val = values[ni][nj];
        z[idx] = (val !== nodata) ? val : values[i][j];
      } else {
        z[idx] = values[i][j];
      }
      idx++;
    }
  }

  const dz_dx = ((z[2] + 2 * z[5] + z[8]) - (z[0] + 2 * z[3] + z[6])) / (8 * cellsize);
  const dz_dy = ((z[6] + 2 * z[7] + z[8]) - (z[0] + 2 * z[1] + z[2])) / (8 * cellsize);

  let aspect = Math.atan2(dz_dy, -dz_dx) * (180 / Math.PI);
  if (aspect < 0) aspect += 360;

  return aspect;
}

/**
 * Calculate curvature (rate of change of slope)
 */
function calculateCurvature(grid, i, j) {
  const { values, cellsize, nodata } = grid;
  const rows = values.length;
  const cols = values[0].length;

  // Get 3x3 neighborhood
  const z = Array(9).fill(0);
  let idx = 0;
  for (let di = -1; di <= 1; di++) {
    for (let dj = -1; dj <= 1; dj++) {
      const ni = i + di;
      const nj = j + dj;
      if (ni >= 0 && ni < rows && nj >= 0 && nj < cols) {
        const val = values[ni][nj];
        z[idx] = (val !== nodata) ? val : values[i][j];
      } else {
        z[idx] = values[i][j];
      }
      idx++;
    }
  }

  // Simplified curvature: second derivative
  const d2z_dx2 = (z[3] - 2 * z[4] + z[5]) / (cellsize * cellsize);
  const d2z_dy2 = (z[1] - 2 * z[4] + z[7]) / (cellsize * cellsize);

  return (d2z_dx2 + d2z_dy2) / 2; // Average curvature
}

/**
 * Calculate Terrain Ruggedness Index (TRI)
 * TRI = mean of absolute differences between center cell and neighbors
 */
function calculateTRI(grid, i, j) {
  const { values, nodata } = grid;
  const rows = values.length;
  const cols = values[0].length;
  const centerZ = values[i][j];

  let sum = 0;
  let count = 0;

  for (let di = -1; di <= 1; di++) {
    for (let dj = -1; dj <= 1; dj++) {
      if (di === 0 && dj === 0) continue; // Skip center
      const ni = i + di;
      const nj = j + dj;
      if (ni >= 0 && ni < rows && nj >= 0 && nj < cols) {
        const val = values[ni][nj];
        if (val !== nodata) {
          sum += Math.abs(val - centerZ);
          count++;
        }
      }
    }
  }

  return count > 0 ? sum / count : 0;
}

/**
 * Calculate flow accumulation (simplified D8 method)
 * Returns relative flow accumulation value
 */
function calculateFlowAccumulation(grid, i, j) {
  const { values, nodata } = grid;
  const rows = values.length;
  const cols = values[0].length;
  const centerZ = values[i][j];

  // Count cells that flow into this cell (cells higher than center)
  let flowIn = 0;

  for (let di = -1; di <= 1; di++) {
    for (let dj = -1; dj <= 1; dj++) {
      if (di === 0 && dj === 0) continue;
      const ni = i + di;
      const nj = j + dj;
      if (ni >= 0 && ni < rows && nj >= 0 && nj < cols) {
        const val = values[ni][nj];
        if (val !== nodata && val > centerZ) {
          flowIn++;
        }
      }
    }
  }

  return flowIn; // Simplified: actual flow accumulation needs full watershed analysis
}

/**
 * Calculate Topographic Wetness Index (TWI)
 * TWI = ln(catchment_area / tan(slope))
 * Simplified version using flow accumulation proxy
 */
function calculateTWI(grid, i, j) {
  const slope = calculateSlope(grid, i, j);
  const flowAcc = calculateFlowAccumulation(grid, i, j);

  // Avoid division by zero and log of zero
  const slopeRad = Math.max(0.001, slope * Math.PI / 180);
  const catchmentArea = Math.max(1, flowAcc + 1); // +1 to avoid log(0)

  const twi = Math.log(catchmentArea / Math.tan(slopeRad));

  return isFinite(twi) ? twi : 0;
}

/**
 * Estimate drainage distance (distance to nearest stream/valley)
 * Simplified: uses flow accumulation threshold
 */
function calculateDrainageDistance(grid, i, j) {
  const { values, cellsize, nodata } = grid;
  const rows = values.length;
  const cols = values[0].length;

  // Define drainage threshold (cells with high flow accumulation)
  const drainageThreshold = 5;

  let minDist = Infinity;

  // Search in expanding radius
  const maxRadius = 10; // Search within 10 cells
  for (let radius = 1; radius <= maxRadius; radius++) {
    for (let di = -radius; di <= radius; di++) {
      for (let dj = -radius; dj <= radius; dj++) {
        const ni = i + di;
        const nj = j + dj;
        if (ni >= 0 && ni < rows && nj >= 0 && nj < cols) {
          const flowAcc = calculateFlowAccumulation(grid, ni, nj);
          if (flowAcc >= drainageThreshold) {
            const dist = Math.sqrt(di * di + dj * dj) * cellsize;
            minDist = Math.min(minDist, dist);
          }
        }
      }
    }
    if (minDist < Infinity) break; // Found drainage
  }

  return isFinite(minDist) ? minDist : maxRadius * cellsize; // Default to max radius
}

/**
 * Fetch DEM and calculate all terrain derivatives
 */
async function fetchAndStoreDemEnhanced(lat, lon) {
  const url = config.dem.baseUrl;
  const half = 0.005; // Larger grid for better derivative calculations

  try {
    const resp = await axios.get(url, {
      params: {
        demtype: config.dem.demType || 'SRTMGL1',
        south: lat - half,
        north: lat + half,
        west: lon - half,
        east: lon + half,
        outputFormat: 'AAIGrid',
        API_Key: config.dem.apiKey,
      },
      timeout: 15000,
      responseType: 'arraybuffer',
      validateStatus: (s) => s >= 200 && s < 300,
    });

    const text = Buffer.from(resp.data).toString('utf8');
    const grid = parseAAIGrid(text);
    const nearest = nearestCell(grid, lat, lon);

    if (!isFinite(nearest.elevation)) {
      throw new Error('No DEM results');
    }

    const i = nearest.i;
    const j = nearest.j;

    // OpenTopography cellsize is in degrees but elevations are in meters, so gradient-based
    // derivatives need a metric cell spacing (geometric mean of N-S and E-W spacing at this latitude)
    const metricGrid = {
      ...grid,
      cellsize: grid.cellsize * 111320 * Math.sqrt(Math.cos(lat * Math.PI / 180)),
    };

    // Calculate all terrain derivatives
    const dem_elevation = nearest.elevation;
    const dem_slope_angle = calculateSlope(metricGrid, i, j);
    const dem_curvature = calculateCurvature(metricGrid, i, j);
    const dem_aspect = calculateAspect(metricGrid, i, j);
    const dem_terrain_ruggedness = calculateTRI(grid, i, j);
    const dem_drainage_distance = calculateDrainageDistance(grid, i, j);
    const TWI_dynamic = calculateTWI(metricGrid, i, j);

    // Best-effort persistence (schema may not have derivative columns). Ignore errors.
    try {
      await pool.query(
        'INSERT INTO dem_data(lat, lon, elevation, source) VALUES($1,$2,$3,$4)',
        [lat, lon, dem_elevation, 'opentopo']
      );
    } catch (e) {
      // ignore DB schema/constraint errors
    }

    return {
      dem_elevation,
      dem_slope_angle,
      dem_curvature,
      dem_aspect,
      dem_terrain_ruggedness,
      dem_drainage_distance,
      TWI_dynamic
    };

  } catch (err) {
    console.error('DEM fetch failed:', err.message);
    throw new Error('DEM fetch failed: ' + err.message);
  }
}

// Legacy function for backward compatibility
async function fetchAndStoreDem(lat, lon) {
  return fetchAndStoreDemEnhanced(lat, lon);
}

module.exports = {
  fetchAndStoreDem,
  fetchAndStoreDemEnhanced
};
