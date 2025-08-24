Real-Time Chat App
A minimal, production-ready real-time chat web app allowing users to chat without accounts. Users provide a username, create or join a room via a shareable link or room code, and communicate in real time using WebSockets. Messages are volatile (no persistence) in this basic version.
Features

Username-only entry (no email/phone).
Create room to get a unique URL and code to share.
Join via URL or room code.
Real-time messaging with Socket.io.
Member list, typing indicators, join/leave events.
Username clash resolution (appends -1, -2, etc.).
Rate limiting (5 messages/3s per user), max 10 users per room.
Responsive design for desktop and mobile.
Accessible with aria-live regions for messages.
No tracking cookies or analytics.

Limitations

No message persistence; history clears on refresh/server restart.
No identity verification; anyone with the link/code can join.
Messages are not encrypted.
No file sharing or advanced features in the basic version.
Potential for username spoofing due to no authentication.

Getting Started
Prerequisites

Node.js 18 or higher
Git for cloning the repository
A browser (Chrome, Firefox, Safari, etc.)

Setup

Clone the repository:
git clone https://github.com/your-username/real-time-chat.git
cd real-time-chat


Install server dependencies:
cd server
npm install


Set up environment variables:

Copy server/.env.example to server/.env:cp server/.env.example server/.env


Edit server/.env to set PORT (default is 3000).


Run the server:
npm run dev

The server runs on http://localhost:3000 (uses nodemon for auto-restart).

Serve the client:

Option 1: Use a static file server:cd client
npx serve . -s

This serves the client on http://localhost:5000 (or another port if 5000 is in use). The -s flag ensures SPA routing.
Option 2: Use any static server (e.g., VS Code Live Server) pointing to the client folder.


Access the app:

Open http://localhost:5000 in your browser.
Enter a username, create or join a room, and start chatting.



Environment Variables

PORT: Server port (default: 3000).
For optional message history (not implemented): MONGODB_URI for MongoDB Atlas.

Deployment
Backend (Render or Railway)

Render:
Create a Render account and new Web Service.
Connect this GitHub repo, select the server folder.
Set:
Runtime: Node
Build Command: npm install
Start Command: npm start


Environment variables: None required (Render sets PORT automatically).
Deploy and note the URL (e.g., https://chat-server.onrender.com).


Railway:
Create a Railway project, link this repo, select server.
Build: npm install, Start: npm start.
Deploy and get the URL.



Frontend (Netlify or Vercel)

Netlify:

Create a Netlify site, drag/drop the client folder or link this repo.
No build command (static site).
Add a _redirects file in client:/* /index.html 200


Deploy and get the URL.


Vercel:

Create a Vercel project, import repo or upload client.
Framework: Other (static).
Add client/vercel.json:{ "rewrites": [{ "source": "/.*", "destination": "/index.html" }] }


Deploy.


Update client:

In client/js/app.js, set backendURL to your backend URL (e.g., https://chat-server.onrender.com).
Commit and redeploy the frontend.


Ensure backend CORS allows the frontend origin (currently * for simplicity).


Testing (Manual)

Open the frontend URL.
Enter a username, click "Create Room" → redirects to /room/:id, shows copyable link and code.
Copy the link, open in another tab/browser → enter username, join room, see member list.
Send messages → appear instantly in all tabs.
Start typing → other tabs show "is typing...".
Join with the same username → auto-appends -1, notifies user.
Send >5 messages in 3s → some are ignored.
Add 10 users (use incognito tabs) → 11th user is rejected.
Refresh a tab → reconnects, but no message history.
Test on mobile → layout and inputs work.
Check browser console and server logs for no uncaught errors.

Project Structure
.
├── .gitignore          # Ignores node_modules, .env, etc.
├── README.md           # This file
├── client
│   ├── index.html      # Frontend HTML with Tailwind and Socket.io
│   └── js
│       └── app.js      # Client-side logic
└── server
    ├── .env.example    # Template for env vars
    ├── package.json     # Server dependencies and scripts
    ├── rooms.js        # In-memory room store
    ├── server.js       # Express + Socket.io server
    ├── socket.js       # Socket.io event handlers
    └── utils.js        # Helpers (ID generation, sanitization)

Optional Extensions
(To be implemented in separate commits/branches)

Message History: Use MongoDB Atlas with Mongoose, store last 50 messages per room, load on join.
Private Rooms: Add optional passphrase on room creation, require it to join.
File Sharing: Support text files, then small images via base64.
E2E Encryption: Use Web Crypto API, exchange keys on join (document approach).

Why These Choices

Simplicity: Vanilla JS for frontend, no frameworks for minimal footprint.
Low Latency: Socket.io for real-time communication.
Easy Deployment: Free tiers of Render/Railway (backend) and Netlify/Vercel (frontend).
No Signup: Quick entry, volatile messages for privacy.
GitHub-Ready: Clear structure, .gitignore, and README for easy cloning.

Contributing

Fork the repo, create a branch for your feature/bugfix.
Follow the same code style (ESLint not enforced, but keep it clean).
Test locally before submitting a PR.
For extensions, use separate branches (e.g., feature/message-history).

License
MIT License (feel free to add one to the repo).