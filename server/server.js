require('dotenv').config();
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: {
    origin: 'https://chiperchat.netlify.app',
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true
});
const cors = require('cors');
const { generateId } = require('./utils');
const initSocket = require('./socket');
const rooms = require('./rooms'); // shared rooms map

app.use(cors({
  origin: 'https://chiperchat.netlify.app',
  credentials: true
}));
app.use(express.json());

initSocket(io);

app.get('/health', (req, res) => res.json({ ok: true }));

app.get('/create-room', async (req, res) => {
  try {
    const id = await generateId();
    res.json({ id });
  } catch (err) {
    console.error('Create-room error:', err);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

app.get('/validate-room/:roomId', (req, res) => {
  res.json({ exists: rooms.has(req.params.roomId) });
});

const PORT = process.env.PORT || 3001;

if (require.main === module) {
  http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = http;
