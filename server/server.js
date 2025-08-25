// server/server.js
require('dotenv').config();
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: {
    origin: 'https://chiperchat.netlify.app/', // Replace with your frontend URL
    methods: ['GET', 'POST']
  },
  transports: ['polling'],
  allowEIO3: true
});
const cors = require('cors');
const { generateId } = require('./utils');
const initSocket = require('./socket');

app.use(cors({ origin: 'https://chiperchat.netlify.app/' }));
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

module.exports = app;