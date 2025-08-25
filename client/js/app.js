const backendURL = location.hostname === 'localhost' || location.port ? 'http://localhost:3000' : 'https://chiper-chat.vercel.app/'; // Replace with your production backend URL


function connectSocket() {
  socket = io(backendURL, {
    reconnection: true,
    transports: ['polling'],
    polling: { extraHeaders: {}, delay: 2000 }
  });




  let socket;
  let roomId;
  let username;
  let typingUsers = new Set();
  let isTyping = false;
  let typingTimer;

  function init() {
    const path = location.pathname;
    if (path.startsWith('/room/')) {
      roomId = path.split('/room/')[1].split('/')[0];
      document.getElementById('landing').classList.add('hidden');
      document.getElementById('chat').classList.remove('hidden');
      document.getElementById('room-title').textContent = `Room: ${roomId}`;
      document.getElementById('room-code-display').textContent = `Code: ${roomId}`;
      username = localStorage.getItem('username');
      if (!username) {
        username = prompt('Enter your username:');
        if (!username?.trim()) {
          location.href = '/';
          return;
        }
        localStorage.setItem('username', username.trim());
      } else {
        username = username.trim();
      }
      connectSocket();
      initChat();
    } else {
      initLanding();
    }
  }

  function initLanding() {
    const usernameInput = document.getElementById('username');
    const createBtn = document.getElementById('create-btn');
    const joinBtn = document.getElementById('join-btn');
    const joinForm = document.getElementById('join-form');
    const roomCode = document.getElementById('room-code');
    const enterBtn = document.getElementById('enter-room');

    createBtn.onclick = async () => {
      username = usernameInput.value.trim();
      if (!username) return alert('Please enter a username');
      localStorage.setItem('username', username);
      try {
        const res = await fetch(`${backendURL}/create-room`);
        if (!res.ok) throw new Error('Failed to create room');
        const { id } = await res.json();
        location.href = `/room/${id}`;
      } catch (err) {
        alert('Error creating room: ' + err.message);
      }
    };

    joinBtn.onclick = () => {
      joinForm.classList.toggle('hidden');
    };

    enterBtn.onclick = () => {
      username = usernameInput.value.trim();
      if (!username) return alert('Please enter a username');
      const code = roomCode.value.trim();
      if (!code) return alert('Please enter room code');
      localStorage.setItem('username', username);
      location.href = `/room/${code}`;
    };
  }

  function connectSocket() {
    socket = io(backendURL, { reconnection: true });

    socket.on('connect', () => {
      socket.emit('join-room', { roomId, username });
    });

    socket.on('username-changed', ({ newUsername, reason }) => {
      username = newUsername;
      localStorage.setItem('username', username);
      alert(`Your username was changed to ${username} due to a ${reason}.`);
    });

    socket.on('room-state', ({ users }) => {
      const list = document.getElementById('members-list');
      list.innerHTML = '';
      users.forEach((u) => {
        const li = document.createElement('li');
        li.textContent = u;
        list.appendChild(li);
      });
    });

    socket.on('chat-message', (msg) => {
      appendMessage(`${msg.username}: ${msg.text}`, false);
    });

    socket.on('system-message', ({ text }) => {
      appendMessage(text, true);
    });

    socket.on('typing', ({ username: typer, isTyping }) => {
      if (isTyping) {
        typingUsers.add(typer);
      } else {
        typingUsers.delete(typer);
      }
      updateTyping();
    });
  }

  function initChat() {
    const form = document.getElementById('message-form');
    const input = document.getElementById('message-input');
    const copyBtn = document.getElementById('copy-link');

    copyBtn.onclick = () => {
      const link = `${location.origin}/room/${roomId}`;
      navigator.clipboard.writeText(link).then(() => {
        alert('Link copied to clipboard!');
      }).catch(() => {
        alert('Failed to copy link');
      });
    };

    input.addEventListener('input', () => {
      clearTimeout(typingTimer);
      if (input.value.trim() && !isTyping) {
        isTyping = true;
        socket.emit('typing', true);
      } else if (!input.value.trim() && isTyping) {
        isTyping = false;
        socket.emit('typing', false);
      }
      typingTimer = setTimeout(() => {
        if (isTyping) {
          isTyping = false;
          socket.emit('typing', false);
        }
      }, 3000); // Debounce stop typing
    });

    form.onsubmit = (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (text) {
        socket.emit('chat-message', text);
        input.value = '';
        if (isTyping) {
          isTyping = false;
          socket.emit('typing', false);
        }
      }
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        form.onsubmit(e);
      }
    });
  }

  function updateTyping() {
    const ind = document.getElementById('typing-indicator');
    if (typingUsers.size === 0) {
      ind.textContent = '';
    } else if (typingUsers.size === 1) {
      ind.textContent = `${[...typingUsers][0]} is typing...`;
    } else {
      ind.textContent = `${typingUsers.size} users are typing...`;
    }
  }

  function appendMessage(text, isSystem) {
    const div = document.createElement('div');
    div.classList.add('mb-2', isSystem ? 'text-gray-500 italic text-center' : 'text-black');
    div.textContent = text;
    const msgs = document.getElementById('messages');
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }
}

init();