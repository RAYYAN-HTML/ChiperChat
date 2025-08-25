// server/server.js
require('dotenv').config();
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: {
    origin: '*', // Update to your frontend URL in production
    methods: ['GET', 'POST']
  },
  transports: ['polling'], // Force HTTP polling for Vercel
  allowEIO3: true // Support Socket.io client compatibility
});
const cors = require('cors');
const { generateId } = require('./utils');
const initSocket = require('./socket');

app.use(cors({ origin: '*' }));
app.use(express.json()); // For serverless HTTP requests

initSocket(io);

app.get('/health', (req, res) => res.json({ ok: true }));

app.get('/create-room', (req, res) => {
  const id = generateId();
  res.json({ id });
});

// Export for Vercel serverless
module.exports = app;