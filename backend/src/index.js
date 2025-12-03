const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const http = require('http');
const { Server } = require('socket.io');
const config = require('./config/config');

const demRoutes = require('./routes/dem.routes');
const weatherRoutes = require('./routes/weather.routes');
const iotRoutes = require('./routes/iot.routes');
const combinedRoutes = require('./routes/combined.routes');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/dem', demRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/iot', iotRoutes);
app.use('/api/combined', combinedRoutes);

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
io.on('connection', () => {});

server.listen(config.port, () => {
  console.log(`server listening on ${config.port}`);
});
