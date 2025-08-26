require('dotenv').config();
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: {
    origin: ['https://chiperchat.netlify.app', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true
});
const cors = require('cors');
const path = require('path');

// Use absolute paths for your local modules
const utilsPath = path.join(__dirname, 'utils.js');
const { generateId } = require(utilsPath);

const socketPath = path.join(__dirname, 'socket.js');
const initSocket = require(socketPath);

app.use(cors({
  origin: ['https://chiperchat.netlify.app', 'http://localhost:3000']
}));
app.use(express.json());

initSocket(io);

app.get('/health', (req, res) => res.json({ ok: true }));

app.get('/create-room', async (req, res) => {
  try {
    const id = generateId();
    res.json({ id });
  } catch (err) {
    console.error('Create-room error:', err);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;