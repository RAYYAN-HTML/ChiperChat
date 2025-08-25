const backendURL = 'https://chiper-chat.vercel.app';

let socket;
let roomId;
let username;
let typingUsers = new Set();
let isTyping = false;
let typingTimer;

function connectSocket() {
  console.log('Connecting to:', backendURL);
  socket = io(backendURL, {
    reconnection: true,
    transports: ['websocket', 'polling'],
    withCredentials: true
  });

  socket.on('connect', () => {
    console.log('Connected to server');
    socket.emit('join-room', { roomId, username });
  });

  socket.on('connect_error', (error) => {
    console.error('Connection error:', error);
    alert('Failed to connect to server. Please refresh.');
  });

  socket.on('disconnect', (reason) => {
    console.log('Disconnected:', reason);
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

  socket.on('typing', (data) => {
    if (data.users) {
      typingUsers = new Set(data.users);
    } else if (data.username !== undefined) {
      if (data.isTyping) {
        typingUsers.add(data.username);
      } else {
        typingUsers.delete(data.username);
      }
    }
    updateTyping();
  });
}

function initChat() {
  const form = document.getElementById('message-form');
  const input = document.getElementById('message-input');
  const copyBtn = document.getElementById('copy-link');

  copyBtn.onclick = () => {
    const link = `${location.origin}${location.pathname}`;
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
    }, 3000);
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
      form.dispatchEvent(new Event('submit'));
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
  div.classList.add('mb-2');
  if (isSystem) {
    div.classList.add('text-gray-500', 'italic', 'text-center');
  } else {
    div.classList.add('text-black');
  }
  div.textContent = text;
  const msgs = document.getElementById('messages');
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

async function validateRoom(roomId) {
  try {
    const response = await fetch(`${backendURL}/validate-room/${roomId}`);
    const data = await response.json();
    return data.exists;
  } catch (error) {
    console.error('Room validation failed:', error);
    return false;
  }
}

function initLanding() {
  const usernameInput = document.getElementById('username');
  const createBtn = document.getElementById('create-btn');
  const joinBtn = document.getElementById('join-btn');
  const joinForm = document.getElementById('join-form');
  const roomCode = document.getElementById('room-code');
  const enterBtn = document.getElementById('enter-room');

  const savedUsername = localStorage.getItem('username');
  if (savedUsername) {
    usernameInput.value = savedUsername;
  }

  createBtn.onclick = async () => {
    username = usernameInput.value.trim();
    if (!username) return alert('Please enter a username');
    localStorage.setItem('username', username);
    try {
      const res = await fetch(`${backendURL}/create-room`);
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Server error: ${res.status} - ${errorText}`);
      }
      const { id } = await res.json();
      if (!id) throw new Error('No room ID returned from server');
      location.href = `/room/${id}`;
    } catch (err) {
      console.error('Create room error:', err);
      alert('Error creating room: ' + err.message);
    }
  };

  joinBtn.onclick = () => {
    joinForm.classList.toggle('hidden');
  };

  enterBtn.onclick = async () => {
    username = usernameInput.value.trim();
    if (!username) return alert('Please enter a username');
    const code = roomCode.value.trim();
    if (!code) return alert('Please enter room code');
    
    // Validate room exists before redirecting
    const roomExists = await validateRoom(code);
    if (!roomExists) {
      alert('Room does not exist or is invalid');
      return;
    }
    
    localStorage.setItem('username', username);
    location.href = `/room/${code}`;
  };

  roomCode.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      enterBtn.click();
    }
  });
}

function init() {
  const path = location.pathname;
  if (path.startsWith('/room/')) {
    roomId = path.split('/room/')[1];
    document.getElementById('landing').classList.add('hidden');
    document.getElementById('chat').classList.remove('hidden');
    document.getElementById('room-title').textContent = `Room: ${roomId}`;
    document.getElementById('room-code-display').textContent = `Code: ${roomId}`;
    
    username = localStorage.getItem('username');
    if (!username) {
      username = prompt('Enter your username:');
      if (!username || !username.trim()) {
        location.href = '/';
        return;
      }
      username = username.trim();
      localStorage.setItem('username', username);
    }
    
    connectSocket();
    initChat();
  } else {
    initLanding();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}