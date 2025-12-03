const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const http = require('http');
const { Server } = require('socket.io');
const config = require('./config/config');

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

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));
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

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
io.on('connection', () => {});

server.listen(config.port, () => {
  console.log(`server listening on ${config.port}`);
});
