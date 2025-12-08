const demService = require("../services/demservice");
const axios = require("axios");
const config = require("../config/config");
const zlib = require("zlib");

exports.getDem = async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lon = parseFloat(req.query.lon);
  if (Number.isNaN(lat) || Number.isNaN(lon))
    return res.status(400).json({ error: "lat and lon required" });
  try {
    const data = await demService.fetchAndStoreDem(lat, lon);
    res.json({ data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

/**
 * Lazy-load DEM patches for a specific location
 * Returns paginated DEM data points with loading indicator
 */
exports.getDemPatches = async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lon = parseFloat(req.query.lon);
  const gridSize = parseInt(req.query.gridSize, 10) || 3;
  const stepDeg = parseFloat(req.query.stepDeg) || 0.01;
  const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500); // Max 500 per request
  const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);

  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return res.status(400).json({ error: "lat and lon required" });
  }

  try {
    const pool = require("../db/pool");

    // Fetch DEM data for the location from database
    const { rows, rowCount } = await pool.query(
      `SELECT lat, lon, elevation, slope_angle, curvature, aspect, 
              terrain_ruggedness, drainage_distance, twi, fetched_at
       FROM dem_data 
       WHERE lat BETWEEN $1 AND $2 AND lon BETWEEN $3 AND $4
       ORDER BY fetched_at DESC
       LIMIT $5 OFFSET $6`,
      [
        lat - gridSize * stepDeg,
        lat + gridSize * stepDeg,
        lon - gridSize * stepDeg,
        lon + gridSize * stepDeg,
        limit,
        offset,
      ]
    );

    // If no cached data, fetch fresh from OpenTopography
    if (rowCount === 0) {
      const freshData = await demService.fetchAndStoreDem(lat, lon);

      // Return the fresh data
      return res.json({
        data: [freshData],
        total: 1,
        offset: 0,
        limit: limit,
        isLoading: false,
      });
    }

    // Return cached data with pagination info
    res.json({
      data: rows,
      total: rowCount,
      offset: offset,
      limit: limit,
      isLoading: false,
    });
  } catch (e) {
    console.error("DEM patches fetch error:", e.message);
    res.status(500).json({ error: e.message });
  }
};

exports.getGeoTiff = async (req, res) => {
  const demtype = String(req.query.demtype || config.dem.demType || "SRTMGL1");
  const south = parseFloat(req.query.south);
  const north = parseFloat(req.query.north);
  const west = parseFloat(req.query.west);
  const east = parseFloat(req.query.east);
  if (![south, north, west, east].every((v) => Number.isFinite(v))) {
    return res
      .status(400)
      .json({ error: "south, north, west, east are required numbers" });
  }
  try {
    const url = config.dem.baseUrl;
    const params = { demtype, south, north, west, east, outputFormat: "GTiff" };
    if (config.dem.apiKey) params.API_Key = config.dem.apiKey;
    const ot = await axios.get(url, {
      params,
      timeout: 30000,
      responseType: "arraybuffer",
      validateStatus: () => true,
    });
    if (!(ot.status >= 200 && ot.status < 300)) {
      return res.status(ot.status || 502).json({
        error: "OpenTopography error",
        status: ot.status,
        detail: String(ot.statusText || ""),
      });
    }
    const buf = Buffer.from(ot.data);
    res.set("Content-Type", "image/tiff");
    res.set(
      "Content-Disposition",
      `attachment; filename="${demtype}_${south}_${west}_${north}_${east}.tif"`
    );
    return res.end(buf);
  } catch (err) {
    return res.status(502).json({ error: "Failed to fetch GeoTIFF" });
  }
};

// --- Raster tile endpoint (PNG hillshade) ---
const tileCache = new Map(); // key -> { buf, exp }
function crc32(buf) {
  let c = ~0 >>> 0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return ~c >>> 0;
}
function pngEncodeRGBA(width, height, rgba) {
  const header = Buffer.alloc(8);
  header.writeUInt32BE(0x89504e47, 0); // \x89PNG
  header.writeUInt32BE(0x0d0a1a0a, 4); // CRLF SUB LF
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // bit depth
  ihdrData.writeUInt8(6, 9); // color type RGBA
  ihdrData.writeUInt8(0, 10); // compression
  ihdrData.writeUInt8(0, 11); // filter
  ihdrData.writeUInt8(0, 12); // interlace
  const ihdr = makeChunk("IHDR", ihdrData);
  // filter type 0 per row
  const scanlines = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (width * 4 + 1);
    scanlines[rowStart] = 0; // no filter
    rgba.copy(scanlines, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }
  const compressed = zlib.deflateSync(scanlines);
  const idat = makeChunk("IDAT", compressed);
  const iend = makeChunk("IEND", Buffer.alloc(0));
  return Buffer.concat([header, ihdr, idat, iend]);
  function makeChunk(type, data) {
    const t = Buffer.from(type, "ascii");
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const crcBuf = Buffer.concat([t, data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(crcBuf), 0);
    return Buffer.concat([len, t, data, crc]);
  }
}
function tile2lon(x, z) {
  return (x / Math.pow(2, z)) * 360 - 180;
}
function tile2lat(y, z) {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z);
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}
function parseAAIGrid(text) {
  const lines = String(text)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((l) => l.trim().length > 0);
  let i = 0;
  const header = {};
  while (i < lines.length) {
    const line = lines[i].trim();
    const m = line.match(
      /^(ncols|nrows|xllcorner|yllcorner|xllcenter|yllcenter|cellsize|NODATA_value)\s+(-?\d+\.?\d*(?:[eE][+-]?\d+)?)$/i
    );
    if (!m) break;
    header[m[1].toLowerCase()] = Number(m[2]);
    i++;
  }
  const ncols = header.ncols | 0;
  const nrows = header.nrows | 0;
  const cellsize = Number(header.cellsize);
  const xllcorner =
    header.xllcorner != null
      ? Number(header.xllcorner)
      : header.xllcenter != null
      ? Number(header.xllcenter) - cellsize / 2
      : null;
  const yllcorner =
    header.yllcorner != null
      ? Number(header.yllcorner)
      : header.yllcenter != null
      ? Number(header.yllcenter) - cellsize / 2
      : null;
  const nodata =
    header["nodata_value"] != null ? Number(header["nodata_value"]) : null;
  if (
    !ncols ||
    !nrows ||
    !isFinite(cellsize) ||
    !isFinite(xllcorner) ||
    !isFinite(yllcorner)
  )
    throw new Error("bad_header");
  const values = [];
  let r = 0;
  for (const ln of lines.slice(i)) {
    if (!ln || !ln.trim()) continue;
    const parts = ln.trim().split(/\s+/).map(Number);
    if (parts.length) {
      values.push(parts);
      r++;
      if (r >= nrows) break;
    }
  }
  if (values.length !== nrows) throw new Error("bad_rows");
  return { ncols, nrows, cellsize, xllcorner, yllcorner, values, nodata };
}
function sampleBilinear(grid, lat, lon) {
  const { ncols, nrows, cellsize, xllcorner, yllcorner, values, nodata } = grid;
  const yTop = yllcorner + cellsize * (nrows - 1 + 0.5);
  const xLeft = xllcorner + cellsize * 0.5;
  const fy = (yTop - lat) / cellsize; // 0 at top
  const fx = (lon - xLeft) / cellsize;
  const i0 = Math.floor(fy);
  const j0 = Math.floor(fx);
  const i1 = i0 + 1;
  const j1 = j0 + 1;
  const wy = fy - i0;
  const wx = fx - j0;
  function v(i, j) {
    if (i < 0 || j < 0 || i >= nrows || j >= ncols) return null;
    const val = values[i][j];
    if (nodata != null && val === nodata) return null;
    return val;
  }
  const q11 = v(i0, j0),
    q12 = v(i0, j1),
    q21 = v(i1, j0),
    q22 = v(i1, j1);
  if (q11 == null || q12 == null || q21 == null || q22 == null) return null;
  const a = q11 * (1 - wx) + q12 * wx;
  const b = q21 * (1 - wx) + q22 * wx;
  return a * (1 - wy) + b * wy;
}
exports.getDemImage = async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lon = parseFloat(req.query.lon);
  const size = Math.max(32, Math.min(512, parseInt(req.query.size, 10) || 200));
  const padDeg = Math.max(
    0.001,
    Math.min(0.25, parseFloat(req.query.padDeg) || 0.08)
  );
  const demtype = String(req.query.demtype || config.dem.demType || "SRTMGL1");
  const mode = String(req.query.mode || "hillshade");
  if (!(Number.isFinite(lat) && Number.isFinite(lon)))
    return res.status(400).json({ error: "lat and lon required" });
  const south = lat - padDeg;
  const north = lat + padDeg;
  const west = lon - padDeg;
  const east = lon + padDeg;
  const key = `img:${demtype}:${mode}:${size}:${south.toFixed(
    5
  )}:${west.toFixed(5)}:${north.toFixed(5)}:${east.toFixed(5)}`;
  const now = Date.now();
  const cached = tileCache.get(key);
  if (cached && cached.exp > now) {
    res.set("Content-Type", "image/png");
    res.set("Cache-Control", "public, max-age=300");
    return res.end(cached.buf);
  }
  try {
    const url = config.dem.baseUrl;
    const params = {
      demtype,
      south,
      north,
      west,
      east,
      outputFormat: "AAIGrid",
    };
    if (config.dem.apiKey) params.API_Key = config.dem.apiKey;
    const ot = await axios.get(url, {
      params,
      timeout: 20000,
      responseType: "arraybuffer",
      validateStatus: () => true,
    });
    if (!(ot.status >= 200 && ot.status < 300)) {
      return res.status(ot.status || 502).json({
        error: "OpenTopography error",
        status: ot.status,
        detail: String(ot.statusText || ""),
      });
    }
    const rawImg = Buffer.from(ot.data);
    let textImg;
    try {
      const enc =
        (ot.headers &&
          (ot.headers["content-encoding"] || ot.headers["Content-Encoding"])) ||
        "";
      const gzip =
        enc.toLowerCase().includes("gzip") ||
        (rawImg.length >= 2 && rawImg[0] === 0x1f && rawImg[1] === 0x8b);
      textImg = gzip
        ? zlib.gunzipSync(rawImg).toString("utf8")
        : rawImg.toString("utf8");
    } catch (e) {
      return res.status(502).json({ error: "decompress_failed" });
    }
    const headOkImg = /^\s*ncols\s+\d+/i.test(textImg);
    if (!headOkImg) {
      return res.status(204).json({ error: "no_grid" });
    }
    const grid = parseAAIGrid(textImg);
    const W = size,
      H = size;
    const rgba = Buffer.alloc(W * H * 4);
    const elev = new Float64Array(W * H);
    for (let v = 0; v < H; v++) {
      const latV = north - ((v + 0.5) / H) * (north - south);
      for (let u = 0; u < W; u++) {
        const lonU = west + ((u + 0.5) / W) * (east - west);
        const e = sampleBilinear(grid, latV, lonU);
        elev[v * W + u] = e == null ? NaN : e;
      }
    }
    if (mode === "elev") {
      let min = Infinity,
        max = -Infinity;
      for (let i = 0; i < elev.length; i++) {
        const e = elev[i];
        if (isFinite(e)) {
          if (e < min) min = e;
          if (e > max) max = e;
        }
      }
      if (!isFinite(min) || !isFinite(max) || max - min < 1e-6) {
        min = 0;
        max = 1;
      }
      for (let v = 0; v < H; v++) {
        for (let u = 0; u < W; u++) {
          const e = elev[v * W + u];
          const off = (v * W + u) * 4;
          if (!isFinite(e)) {
            rgba[off + 3] = 0;
            continue;
          }
          const t = Math.max(0, Math.min(1, (e - min) / (max - min)));
          const g = Math.round(255 * t);
          rgba[off] = g;
          rgba[off + 1] = g;
          rgba[off + 2] = g;
          rgba[off + 3] = 220;
        }
      }
    } else {
      const midLat = ((north + south) / 2) * (Math.PI / 180);
      const mPerDegLat = 110574;
      const mPerDegLon = 111320 * Math.cos(midLat);
      const dLat = Math.abs(north - south) / H;
      const dLon = Math.abs(east - west) / W;
      const dxm = dLon * mPerDegLon,
        dym = dLat * mPerDegLat;
      const az = (315 * Math.PI) / 180;
      const alt = (45 * Math.PI) / 180;
      const sinAlt = Math.sin(alt),
        cosAlt = Math.cos(alt);
      for (let v = 0; v < H; v++) {
        for (let u = 0; u < W; u++) {
          const off = (v * W + u) * 4;
          const c = elev[v * W + u];
          if (!isFinite(c)) {
            rgba[off + 3] = 0;
            continue;
          }
          const l = elev[v * W + Math.max(0, u - 1)];
          const r = elev[v * W + Math.min(W - 1, u + 1)];
          const t = elev[Math.max(0, v - 1) * W + u];
          const b = elev[Math.min(H - 1, v + 1) * W + u];
          if (!(isFinite(l) && isFinite(r) && isFinite(t) && isFinite(b))) {
            rgba[off + 3] = 0;
            continue;
          }
          const dzdx = (r - l) / (2 * dxm);
          const dzdy = (t - b) / (2 * dym);
          const slope = Math.atan(Math.sqrt(dzdx * dzdx + dzdy * dzdy));
          const aspect = Math.atan2(dzdy, -dzdx);
          const hs =
            cosAlt * Math.cos(slope) +
            sinAlt * Math.sin(slope) * Math.cos(az - aspect);
          const val = Math.max(0, Math.min(1, hs));
          const g = Math.round(255 * val);
          rgba[off] = g;
          rgba[off + 1] = g;
          rgba[off + 2] = g;
          rgba[off + 3] = 220;
        }
      }
    }
    const buf = pngEncodeRGBA(W, H, rgba);
    tileCache.set(key, { buf, exp: now + 300000 });
    res.set("Content-Type", "image/png");
    res.set("Cache-Control", "public, max-age=300");
    return res.end(buf);
  } catch (err) {
    return res.status(502).json({ error: "Failed to generate image" });
  }
};
exports.getTilePng = async (req, res) => {
  const z = parseInt(req.params.z, 10);
  const x = parseInt(req.params.x, 10);
  const y = parseInt(req.params.y, 10);
  const demtype = String(req.query.demtype || config.dem.demType || "SRTMGL1");
  const mode = String(req.query.mode || "hillshade"); // 'hillshade' | 'elev'
  if (!Number.isFinite(z) || !Number.isFinite(x) || !Number.isFinite(y))
    return res.status(400).send("bad tile");
  const key = `${demtype}:${mode}:${z}:${x}:${y}`;
  const now = Date.now();
  const cached = tileCache.get(key);
  if (cached && cached.exp > now) {
    res.set("Content-Type", "image/png");
    res.set("Cache-Control", "public, max-age=300");
    return res.end(cached.buf);
  }
  const west = tile2lon(x, z);
  const east = tile2lon(x + 1, z);
  const north = tile2lat(y, z);
  const south = tile2lat(y + 1, z);
  const url = config.dem.baseUrl;
  try {
    const params = {
      demtype,
      south,
      north,
      west,
      east,
      outputFormat: "AAIGrid",
    };
    if (config.dem.apiKey) params.API_Key = config.dem.apiKey;
    const ot = await axios.get(url, {
      params,
      timeout: 20000,
      responseType: "arraybuffer",
      validateStatus: () => true,
    });
    if (!(ot.status >= 200 && ot.status < 300)) {
      return res.status(204).end();
    }
    const rawTile = Buffer.from(ot.data);
    let textTile;
    try {
      const enc2 =
        (ot.headers &&
          (ot.headers["content-encoding"] || ot.headers["Content-Encoding"])) ||
        "";
      const gzip2 =
        enc2.toLowerCase().includes("gzip") ||
        (rawTile.length >= 2 && rawTile[0] === 0x1f && rawTile[1] === 0x8b);
      textTile = gzip2
        ? zlib.gunzipSync(rawTile).toString("utf8")
        : rawTile.toString("utf8");
    } catch (e) {
      return res.status(204).end();
    }
    const headOkTile = /^\s*ncols\s+\d+/i.test(textTile);
    if (!headOkTile) {
      return res.status(204).end();
    }
    const grid = parseAAIGrid(textTile);
    const W = 256,
      H = 256;
    const rgba = Buffer.alloc(W * H * 4);
    // Pre-sample elevation per pixel
    const elev = new Float64Array(W * H);
    for (let v = 0; v < H; v++) {
      const nV = Math.PI - (2 * Math.PI * (y + (v + 0.5) / H)) / Math.pow(2, z);
      const lat =
        (180 / Math.PI) * Math.atan(0.5 * (Math.exp(nV) - Math.exp(-nV)));
      for (let u = 0; u < W; u++) {
        const lon = ((x + (u + 0.5) / W) / Math.pow(2, z)) * 360 - 180;
        const e = sampleBilinear(grid, lat, lon);
        elev[v * W + u] = e == null ? NaN : e;
      }
    }
    if (mode === "elev") {
      let min = Infinity,
        max = -Infinity;
      for (let i = 0; i < elev.length; i++) {
        const e = elev[i];
        if (isFinite(e)) {
          if (e < min) min = e;
          if (e > max) max = e;
        }
      }
      if (!isFinite(min) || !isFinite(max) || max - min < 1e-6) {
        min = 0;
        max = 1;
      }
      for (let v = 0; v < H; v++) {
        for (let u = 0; u < W; u++) {
          const e = elev[v * W + u];
          const off = (v * W + u) * 4;
          if (!isFinite(e)) {
            rgba[off + 3] = 0;
            continue;
          }
          const t = Math.max(0, Math.min(1, (e - min) / (max - min)));
          const g = Math.round(255 * t);
          rgba[off] = g;
          rgba[off + 1] = g;
          rgba[off + 2] = g;
          rgba[off + 3] = 220;
        }
      }
    } else {
      // Hillshade
      const midLat = ((north + south) / 2) * (Math.PI / 180);
      const mPerDegLat = 110574;
      const mPerDegLon = 111320 * Math.cos(midLat);
      const dLat = Math.abs(north - south) / H;
      const dLon = Math.abs(east - west) / W;
      const dxm = dLon * mPerDegLon,
        dym = dLat * mPerDegLat;
      const az = (315 * Math.PI) / 180;
      const alt = (45 * Math.PI) / 180;
      const sinAlt = Math.sin(alt),
        cosAlt = Math.cos(alt);
      for (let v = 0; v < H; v++) {
        for (let u = 0; u < W; u++) {
          const off = (v * W + u) * 4;
          const c = elev[v * W + u];
          if (!isFinite(c)) {
            rgba[off + 3] = 0;
            continue;
          }
          const l = elev[v * W + Math.max(0, u - 1)];
          const r = elev[v * W + Math.min(W - 1, u + 1)];
          const t = elev[Math.max(0, v - 1) * W + u];
          const b = elev[Math.min(H - 1, v + 1) * W + u];
          if (!(isFinite(l) && isFinite(r) && isFinite(t) && isFinite(b))) {
            rgba[off + 3] = 0;
            continue;
          }
          const dzdx = (r - l) / (2 * dxm);
          const dzdy = (t - b) / (2 * dym);
          const slope = Math.atan(Math.sqrt(dzdx * dzdx + dzdy * dzdy));
          const aspect = Math.atan2(dzdy, -dzdx);
          const hs =
            cosAlt * Math.cos(slope) +
            sinAlt * Math.sin(slope) * Math.cos(az - aspect);
          const val = Math.max(0, Math.min(1, hs));
          const g = Math.round(255 * val);
          rgba[off] = g;
          rgba[off + 1] = g;
          rgba[off + 2] = g;
          rgba[off + 3] = 220;
        }
      }
    }
    const buf = pngEncodeRGBA(W, H, rgba);
    tileCache.set(key, { buf, exp: now + 300000 });
    res.set("Content-Type", "image/png");
    res.set("Cache-Control", "public, max-age=300");
    return res.end(buf);
  } catch (err) {
    return res.status(204).end();
  }
};
