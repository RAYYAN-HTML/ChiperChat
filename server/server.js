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
const { nanoid } = require('nanoid');
const rooms = new Map();

// Utils functions
async function generateId(length = 8) {
  return nanoid(length);
}

function sanitize(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

app.use(cors({
  origin: ['https://chiperchat.netlify.app', 'http://localhost:3000']
}));
app.use(express.json());

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('New connection:', socket.id);
  socket.on('error', (err) => console.error('Socket error:', err));
  let currentRoom = null;
  let currentUsername = null;

  socket.on('join-room', async ({ roomId, username }) => {
    try {
      if (!roomId || !username) throw new Error('Invalid roomId or username');
      if (currentRoom) {
        socket.leave(currentRoom);
      }

      if (!rooms.has(roomId)) {
        rooms.set(roomId, {
          users: new Map(),
          rateLimits: new Map(),
          typing: new Set(),
        });
      }

      const room = rooms.get(roomId);

      if (room.users.size >= 10) {
        socket.emit('system-message', { text: 'Room is full' });
        socket.disconnect();
        return;
      }

      let origUsername = username;
      let disamb = 1;
      const currentUsernames = new Set(
        Array.from(room.users.values()).map((u) => u.username)
      );
      while (currentUsernames.has(username)) {
        username = `${origUsername}-${disamb}`;
        disamb++;
      }

      if (username !== origUsername) {
        socket.emit('username-changed', {
          newUsername: username,
          reason: 'clash',
        });
      }

      currentUsername = username;
      currentRoom = roomId;
      socket.join(roomId);
      room.users.set(socket.id, { username });

      io.to(roomId).emit('system-message', {
        text: `${username} has joined`,
      });

      const usersList = Array.from(room.users.values()).map((u) => u.username);
      io.to(roomId).emit('room-state', { users: usersList });
    } catch (err) {
      console.error('Join-room error:', err.message);
      socket.emit('system-message', { text: 'Error joining room' });
    }
  });

  socket.on('chat-message', async (text) => {
    try {
      if (!currentRoom) throw new Error('Not in a room');
      text = sanitize(text).trim();
      if (!text || text.length > 500) throw new Error('Invalid message');

      const room = rooms.get(currentRoom);
      if (!room.rateLimits.has(socket.id)) room.rateLimits.set(socket.id, []);
      const now = Date.now();
      const recent = room.rateLimits.get(socket.id).filter((ts) => now - ts < 3000);
      room.rateLimits.set(socket.id, recent);
      if (recent.length >= 5) return;
      recent.push(now);
      room.rateLimits.set(socket.id, recent);

      const msg = {
        id: await generateId(),
        username: currentUsername,
        text,
        ts: now,
      };
      io.to(currentRoom).emit('chat-message', msg);
    } catch (err) {
      console.error('Chat-message error:', err.message);
    }
  });

  socket.on('typing', (isTyping) => {
    try {
      if (!currentRoom) return;
      const room = rooms.get(currentRoom);
      if (isTyping) {
        room.typing.add(currentUsername);
      } else {
        room.typing.delete(currentUsername);
      }
      io.to(currentRoom).emit('typing', { users: Array.from(room.typing) });
    } catch (err) {
      console.error('Typing error:', err.message);
    }
  });

  socket.on('disconnect', () => {
    try {
      if (!currentRoom) return;
      const room = rooms.get(currentRoom);
      if (room.users.has(socket.id)) {
        io.to(currentRoom).emit('system-message', {
          text: `${currentUsername} has left`,
        });
        room.users.delete(socket.id);
        room.rateLimits.delete(socket.id);
        room.typing.delete(currentUsername);

        const usersList = Array.from(room.users.values()).map((u) => u.username);
        io.to(currentRoom).emit('room-state', { users: usersList });
        io.to(currentRoom).emit('typing', { users: Array.from(room.typing) });

        if (room.users.size === 0) {
          setTimeout(() => {
            if (rooms.has(currentRoom) && rooms.get(currentRoom).users.size === 0) {
              rooms.delete(currentRoom);
              console.log(`Room ${currentRoom} deleted`);
            }
          }, 10000);
        }
      }
    } catch (err) {
      console.error('Disconnect error:', err.message);
    }
  });
});

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

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;