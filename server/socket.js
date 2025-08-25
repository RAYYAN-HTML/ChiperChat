const rooms = require('./rooms');
const { sanitize } = require('./utils');
function initSocket(io) {
  io.on('connection', (socket) => {
    console.log('New connection:', socket.id);
    socket.on('error', (err) => console.error('Socket error:', err));
    let currentRoom = null;
    let currentUsername = null;

    socket.on('join-room', ({ roomId, username }) => {
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
    });

    socket.on('chat-message', (text) => {
      if (!currentRoom) return;
      text = sanitize(text).trim();
      if (!text || text.length > 500) return;

      const room = rooms.get(currentRoom);
      if (!room.rateLimits.has(socket.id)) room.rateLimits.set(socket.id, []);
      const now = Date.now();
      const recent = room.rateLimits.get(socket.id).filter((ts) => now - ts < 3000);
      if (recent.length >= 5) return;
      recent.push(now);
      room.rateLimits.set(socket.id, recent);

      const msg = {
        id: generateId(),
        username: currentUsername,
        text,
        ts: now,
      };
      io.to(currentRoom).emit('chat-message', msg);
    });

    socket.on('typing', (isTyping) => {
      if (!currentRoom) return;
      io.to(currentRoom).emit('typing', { username: currentUsername, isTyping });
    });

    socket.on('disconnect', () => {
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
        io.to(currentRoom).emit('typing', { users: Array.from(room.typing) }); // Cleanup if needed, but since per event
      }
      if (room.users.size === 0) {
        rooms.delete(currentRoom);
      }
    });
  });
}

module.exports = initSocket;