const axios = require('axios');
const pool = require('../db/pool');
const config = require('../config/config');

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
  const ncols = header.ncols|0; const nrows = header.nrows|0; const cellsize = Number(header.cellsize);
  if (!ncols || !nrows || !isFinite(cellsize)) throw new Error('Invalid AAIGrid header');
  const xllcorner = (header.xllcorner != null ? Number(header.xllcorner) : (header.xllcenter != null ? Number(header.xllcenter) - cellsize/2 : null));
  const yllcorner = (header.yllcorner != null ? Number(header.yllcorner) : (header.yllcenter != null ? Number(header.yllcenter) - cellsize/2 : null));
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
  // Ensure each row has ncols entries
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

async function fetchAndStoreDem(lat, lon) {
  const url = config.dem.baseUrl;
  const half = 0.0025;
  let elevation;
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
    if (!isFinite(nearest.elevation)) throw new Error('No DEM results');
    elevation = nearest.elevation;
  } catch (err) {
    throw new Error('DEM fetch failed');
  }

  const insert = 'INSERT INTO dem_data(lat, lon, elevation, source) VALUES($1,$2,$3,$4) RETURNING *';
  const { rows } = await pool.query(insert, [lat, lon, elevation, 'opentopo']);
  return rows[0];
}

module.exports = { fetchAndStoreDem };
