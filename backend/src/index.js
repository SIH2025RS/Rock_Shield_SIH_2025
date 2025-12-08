const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const http = require('http');
const { Server } = require('socket.io');
const config = require('./config/config');
const axios = require('axios');
const pool = require('./db/pool');

const demRoutes = require('./routes/demroutes');
const weatherRoutes = require('./routes/weatherroutes');
const iotRoutes = require('./routes/iotroutes');
const combinedRoutes = require('./routes/combinedroutes');
const { withAuth } = require('./middleware/auth');
const meRoutes = require('./routes/meroutes');
const adminRoutes = require('./routes/adminroutes');
const operatorRoutes = require('./routes/operatorroutes');
const minerRoutes = require('./routes/minerroutes');
const usersRoutes = require('./routes/usersroutes');
const mlRoutes = require('./routes/mlroutes');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));
app.use('/uploads', express.static('uploads'));
// Attach req.auth when a Clerk token is present
app.use(withAuth);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/dem', demRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/iot', iotRoutes);
app.use('/api/combined', combinedRoutes);
app.use('/api/me', meRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/operator', operatorRoutes);
app.use('/api/miner', minerRoutes);
app.use('/api/users', usersRoutes);
app.use('/api', mlRoutes);

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
io.on('connection', (socket) => {
  socket.on('subscribe-weather', ({ lat, lon, intervalMs }) => {
    const ms = Math.max(1000, Math.min(60000, Number(intervalMs) || 5000));
    if (socket.weatherTimer) {
      clearInterval(socket.weatherTimer);
      socket.weatherTimer = null;
    }
    const fetchAndEmit = async () => {
      try {
        const resp = await axios.get(config.weather.baseUrl, {
          params: {
            latitude: lat,
            longitude: lon,
            current: 'temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code',
          },
          timeout: 10000,
        });
        const current = resp.data && resp.data.current ? resp.data.current : null;
        const current_units = resp.data && resp.data.current_units ? resp.data.current_units : null;
        if (current) {
          try {
            await pool.query(`
              CREATE TABLE IF NOT EXISTS weather_data (
                id SERIAL PRIMARY KEY,
                lat DOUBLE PRECISION NOT NULL,
                lon DOUBLE PRECISION NOT NULL,
                temperature DOUBLE PRECISION,
                windspeed DOUBLE PRECISION,
                weathercode INTEGER,
                created_at TIMESTAMPTZ DEFAULT now()
              );
            `);
            const temperature = Number(current.temperature_2m);
            const windspeed = Number(current.wind_speed_10m);
            const weathercode = Number(current.weather_code);
            await pool.query(
              'INSERT INTO weather_data(lat, lon, temperature, windspeed, weathercode) VALUES ($1,$2,$3,$4,$5)',
              [lat, lon, isFinite(temperature) ? temperature : null, isFinite(windspeed) ? windspeed : null, isFinite(weathercode) ? weathercode : null]
            );
          } catch (e) {
            // swallow insert errors
          }
        }
        socket.emit('weather:update', { coords: { lat, lon }, current, current_units });
      } catch (e) {
        socket.emit('weather:error', { message: 'fetch_failed' });
      }
    };
    fetchAndEmit();
    socket.weatherTimer = setInterval(fetchAndEmit, ms);
  });
  // Subscribe to a Plant Hub's weather and persist to DB every ~15s
  socket.on('subscribe-hub-weather', async ({ hubId, intervalMs }) => {
    const ms = Math.max(5000, Math.min(60000, Number(intervalMs) || 15000));
    if (!socket.hubWeatherTimers) socket.hubWeatherTimers = new Map();
    const key = String(hubId);
    try {
      const hubRes = await pool.query('CREATE TABLE IF NOT EXISTS plant_hubs (id SERIAL PRIMARY KEY, name TEXT NOT NULL, lat DOUBLE PRECISION NOT NULL, lon DOUBLE PRECISION NOT NULL, address TEXT, created_by INTEGER, created_at TIMESTAMP DEFAULT now())');
      void hubRes; // ensure table exists
      const { rows } = await pool.query('SELECT id, name, lat, lon FROM plant_hubs WHERE id = $1', [hubId]);
      if (!rows.length) return socket.emit('hub-weather:error', { hubId, message: 'hub_not_found' });
      const { lat, lon } = rows[0];
      if (socket.hubWeatherTimers.has(key)) {
        clearInterval(socket.hubWeatherTimers.get(key));
        socket.hubWeatherTimers.delete(key);
      }
      const fetchStoreEmit = async () => {
        try {
          const resp = await axios.get(config.weather.baseUrl, {
            params: {
              latitude: lat,
              longitude: lon,
              current: 'temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code',
            },
            timeout: 10000,
          });
          const current = resp.data && resp.data.current ? resp.data.current : null;
          if (current) {
            // Persist minimal columns compatible with existing schema
            const temperature = Number(current.temperature_2m);
            const windspeed = Number(current.wind_speed_10m);
            const weathercode = Number(current.weather_code);
            try {
              await pool.query(
                'INSERT INTO weather_data(lat, lon, temperature, windspeed, weathercode) VALUES ($1,$2,$3,$4,$5)',
                [lat, lon, isFinite(temperature) ? temperature : null, isFinite(windspeed) ? windspeed : null, isFinite(weathercode) ? weathercode : null]
              );
            } catch (e) {
              // swallow insert errors to avoid breaking stream
            }
          }
          const current_units = resp.data && resp.data.current_units ? resp.data.current_units : null;
          socket.emit('hub-weather:update', { hubId, coords: { lat, lon }, current, current_units });
        } catch (e) {
          socket.emit('hub-weather:error', { hubId, message: 'fetch_failed' });
        }
      };
      await fetchStoreEmit();
      const t = setInterval(fetchStoreEmit, ms);
      socket.hubWeatherTimers.set(key, t);
    } catch (e) {
      socket.emit('hub-weather:error', { hubId, message: 'subscribe_failed' });
    }
  });
  socket.on('unsubscribe-hub-weather', ({ hubId }) => {
    const key = String(hubId);
    if (socket.hubWeatherTimers && socket.hubWeatherTimers.has(key)) {
      clearInterval(socket.hubWeatherTimers.get(key));
      socket.hubWeatherTimers.delete(key);
    }
  });
  // Subscribe to a Plant Hub's DEM patch and persist to DB (OpenTopography)
  socket.on('subscribe-hub-dem', async ({ hubId, intervalMs, gridSize = 3, stepDeg = 0.01 }) => {
    const ms = Math.max(5000, Math.min(60000, Number(intervalMs) || 15000));
    if (!socket.hubDemTimers) socket.hubDemTimers = new Map();
    const key = String(hubId);
    function parseAAIGrid(text) {
      const lines = String(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim().length > 0);
      let i = 0; const header = {};
      while (i < lines.length) {
        const line = lines[i].trim();
        const m = line.match(/^(ncols|nrows|xllcorner|yllcorner|xllcenter|yllcenter|cellsize|NODATA_value)\s+(-?\d+\.?\d*(?:[eE][+-]?\d+)?)$/i);
        if (!m) break; header[m[1].toLowerCase()] = Number(m[2]); i++;
      }
      const ncols = header.ncols|0; const nrows = header.nrows|0; const cellsize = Number(header.cellsize);
      const xllcorner = (header.xllcorner != null ? Number(header.xllcorner) : (header.xllcenter != null ? Number(header.xllcenter) - cellsize/2 : null));
      const yllcorner = (header.yllcorner != null ? Number(header.yllcorner) : (header.yllcenter != null ? Number(header.yllcenter) - cellsize/2 : null));
      const nodata = header['nodata_value'] != null ? Number(header['nodata_value']) : null;
      if (!ncols || !nrows || !isFinite(cellsize) || !isFinite(xllcorner) || !isFinite(yllcorner)) throw new Error('bad_header');
      const values = []; let r = 0;
      for (const ln of lines.slice(i)) {
        if (!ln || !ln.trim()) continue; const parts = ln.trim().split(/\s+/).map(Number);
        if (parts.length) { values.push(parts); r++; if (r >= nrows) break; }
      }
      if (values.length !== nrows) throw new Error('bad_rows');
      for (const row of values) { if (row.length < ncols) throw new Error('bad_cols'); }
      return { ncols, nrows, cellsize, xllcorner, yllcorner, values, nodata };
    }
    function valueAtNearest(grid, plat, plon) {
      const { ncols, nrows, cellsize, xllcorner, yllcorner, values, nodata } = grid;
      let best = null; let bestD = Infinity;
      for (let i = 0; i < nrows; i++) {
        const cellLat = yllcorner + cellsize * (nrows - 1 - i + 0.5);
        for (let j = 0; j < ncols; j++) {
          const cellLon = xllcorner + cellsize * (j + 0.5);
          const v = values[i][j];
          if (nodata != null && v === nodata) continue;
          const d = Math.hypot(plat - cellLat, plon - cellLon);
          if (d < bestD) { bestD = d; best = v; }
        }
      }
      return best;
    }
    try {
      await pool.query('CREATE TABLE IF NOT EXISTS plant_hubs (id SERIAL PRIMARY KEY, name TEXT NOT NULL, lat DOUBLE PRECISION NOT NULL, lon DOUBLE PRECISION NOT NULL, address TEXT, created_by INTEGER, created_at TIMESTAMP DEFAULT now())');
      const { rows } = await pool.query('SELECT id, name, lat, lon FROM plant_hubs WHERE id = $1', [hubId]);
      if (!rows.length) return socket.emit('hub-dem:error', { hubId, message: 'hub_not_found' });
      const { lat, lon } = rows[0];
      if (socket.hubDemTimers.has(key)) {
        clearInterval(socket.hubDemTimers.get(key));
        socket.hubDemTimers.delete(key);
      }
      const fetchDemPatch = async () => {
        try {
          const halfSteps = Math.floor(Math.max(1, gridSize) / 2);
          const extent = halfSteps * stepDeg;
          const south = lat - extent; const north = lat + extent; const west = lon - extent; const east = lon + extent;
          const url = config.dem.baseUrl;
          const resp = await axios.get(url, {
            params: {
              demtype: config.dem.demType || 'SRTMGL1',
              south, north, west, east,
              outputFormat: 'AAIGrid',
              API_Key: config.dem.apiKey,
            },
            timeout: 20000,
            responseType: 'arraybuffer',
            validateStatus: (s) => s >= 200 && s < 300,
          });
          const text = Buffer.from(resp.data).toString('utf8');
          try {
            await pool.query(`
              CREATE TABLE IF NOT EXISTS dem_data (
                id SERIAL PRIMARY KEY,
                lat DOUBLE PRECISION NOT NULL,
                lon DOUBLE PRECISION NOT NULL,
                elevation DOUBLE PRECISION NOT NULL,
                source TEXT,
                fetched_at TIMESTAMPTZ DEFAULT now()
              );
              CREATE INDEX IF NOT EXISTS idx_dem_lat_lon ON dem_data(lat, lon);
            `);
          } catch (e) {}
          const grid = parseAAIGrid(text);
          const out = [];
          for (let dy = -halfSteps; dy <= halfSteps; dy++) {
            for (let dx = -halfSteps; dx <= halfSteps; dx++) {
              const plat = lat + dy * stepDeg;
              const plon = lon + dx * stepDeg;
              const elev = valueAtNearest(grid, plat, plon);
              const elevOk = isFinite(elev);
              out.push({ lat: plat, lon: plon, elevation: elevOk ? elev : null });
              if (elevOk) {
                try {
                  await pool.query('INSERT INTO dem_data(lat, lon, elevation, source) VALUES ($1,$2,$3,$4)', [plat, plon, elev, 'opentopo']);
                } catch (e) {}
              }
            }
          }
          socket.emit('hub-dem:update', { hubId, center: { lat, lon }, gridSize, stepDeg, points: out });
        } catch (e) {
          socket.emit('hub-dem:error', { hubId, message: 'fetch_failed' });
        }
      };
      await fetchDemPatch();
      const t = setInterval(fetchDemPatch, ms);
      socket.hubDemTimers.set(key, t);
    } catch (e) {
      socket.emit('hub-dem:error', { hubId, message: 'subscribe_failed' });
    }
  });
  socket.on('unsubscribe-hub-dem', ({ hubId }) => {
    const key = String(hubId);
    if (socket.hubDemTimers && socket.hubDemTimers.has(key)) {
      clearInterval(socket.hubDemTimers.get(key));
      socket.hubDemTimers.delete(key);
    }
  });
  socket.on('unsubscribe-weather', () => {
    if (socket.weatherTimer) {
      clearInterval(socket.weatherTimer);
      socket.weatherTimer = null;
    }
  });
  socket.on('disconnect', () => {
    if (socket.weatherTimer) {
      clearInterval(socket.weatherTimer);
    }
    if (socket.hubWeatherTimers) {
      for (const t of socket.hubWeatherTimers.values()) clearInterval(t);
      socket.hubWeatherTimers.clear();
    }
    if (socket.hubDemTimers) {
      for (const t of socket.hubDemTimers.values()) clearInterval(t);
      socket.hubDemTimers.clear();
    }
  });
});
app.set('io', io);

server.listen(config.port, () => {
  console.log(`server listening on ${config.port}`);
});
