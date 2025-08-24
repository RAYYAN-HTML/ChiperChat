require('dotenv').config();
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: {
    origin: '*', // Allow all for simplicity; restrict in prod if needed
  }
});
const cors = require('cors');
const { generateId } = require('./utils');
const initSocket = require('./socket');

app.use(cors({
  origin: '*' // Allow all for dev; configure for prod static host
}));

initSocket(io);

app.get('/health', (req, res) => res.json({ ok: true }));

app.get('/create-room', (req, res) => {
  const id = generateId();
  res.json({ id });
});

const port = process.env.PORT || 3000;
http.listen(port, () => console.log(`Server running on port ${port}`));