# 🔐 MERN Auth Starter (Learning Project)

A clean, full-stack **MERN (MongoDB, Express, React, Node.js)** authentication starter application designed specifically for learning authentication concepts: user registration, password hashing with bcrypt, JWT token generation, route protection middleware, and persistent client sessions.

---

## 🚀 Quick Start

### 1. Backend Setup (Express + MongoDB + Socket.io)
```bash
cd backend
npm install
npm run dev
```
- Backend runs on **`http://localhost:5000`**
- Realtime WebSocket server listening on `ws://localhost:5000`
- MongoDB connects to `mongodb://127.0.0.1:27017/mern_auth_db`

### 2. Frontend Setup (React + Vite + Socket.io Client)
```bash
cd frontend
npm install
npm run dev
```
- Frontend runs on **`http://localhost:3001`** (or `:3000`)
- Vite dev proxy forwards `/api` and `/socket.io` to `http://localhost:5000`

---

## 💬 Realtime 2-User Chat & Feature Highlights

1. **Realtime 1-on-1 Chat via Socket.io**:
   - Open `http://localhost:3001` in your main browser window and an **Incognito Window**.
   - Sign in as two different users (e.g. `alex@example.com` and `sarah@example.com`).
   - Both users will immediately see each other with a **🟢 Live Online** glowing indicator.
   - Messages appear instantaneously on both screens in real time without refreshing.
   - Realtime **typing indicator** ("... is typing a message ✍️") appears as you type.

2. **Read Receipts & Delivery Checkmarks (✓ / ✓✓)**:
   - Sent messages show delivery status checkmarks next to timestamps.
   - When the recipient opens the conversation, checkmarks automatically turn to **glowing blue double checkmarks (`✓✓`)** in real-time.

3. **Unread Message Badges**:
   - A bright red badge appears next to contacts showing unread messages (e.g. `[2]`) if they send messages while you are chatting with someone else.
   - Count automatically resets when you open their conversation.

4. **Soft Audio Notification Chime**:
   - Built-in audio chime synthesized via the Web Audio API pings softly when incoming messages arrive.
   - Includes a toggle button in the header (🔔 / 🔕) to mute/unmute sounds anytime.

5. **Message Reactions (Emoji Reactions)**:
   - Hover or tap any message bubble to reveal a floating quick reaction bar (`❤️`, `👍`, `🔥`, `😂`, `🎉`).
   - Reaction chips display below the bubble with live count indicators and sync in real-time for both participants.

6. **In-Conversation Search**:
   - Click the 🔍 icon in the chat header to filter and find previous messages in the current conversation instantly.

7. **Emoji Picker & Image Sharing**:
   - Categorized emoji picker with quick tabs (*Reactions*, *Smileys*, *Hands*, *Fun*).
   - Upload images from your device with preview chips and view in a **Fullscreen Lightbox**.

8. **Voice Notes with 1x / 1.5x / 2x Playback Speed**:
   - Built-in microphone recording with audio visualizer waveform and timer.
   - Audio playback rate toggle directly within the message bubble.

9. **Pinned Messages & Starred Messages Drawer**:
   - Pin important messages to the top of any direct or group conversation.
   - Star messages and access them quickly via the ⭐ Starred drawer.

10. **Collaborative Group Chat Rooms & Administration Drawer**:
    - Create custom groups with custom icons (👥, 🚀, 💻, 🎮, etc.) and descriptions.
    - View group roster, add members, remove members (admin only), leave group, or delete group.
    - Real-time group messaging with sender name, avatars, and live presence.

11. **WebRTC Peer-to-Peer Voice, Video & Screen Sharing Calling**:
    - Direct 1-on-1 **📞 Voice Calls** and **📹 Video Calls** built on WebRTC and STUN servers.
    - **🖥️ Screen Sharing**: Toggle between camera video and live desktop screen sharing during video calls.
    - Synthesized ringtone, dialtone, and connect sounds using the Web Audio API.
    - Picture-in-Picture (PIP) local camera feed, remote stream, call timer, mic mute, and fullscreen mode.

12. **📊 Interactive Live Polls & Voting**:
    - Create dynamic multi-option polls in direct or group chats.
    - Instant live vote count updates and animated percentage progress bars synchronized via Socket.io.

13. **⏱️ Disappearing / Ephemeral Messages**:
    - Self-destruct timer selector (10 seconds, 1 minute, 1 hour, 24 hours).
    - Backed by MongoDB TTL indexes for automated expiration and live chat badge indicators.

14. **💻 Formatted Code Snippets**:
    - Share syntax-highlighted code blocks with language badges (JavaScript, Python, TypeScript, HTML, CSS, SQL, Bash, etc.).
    - One-click "📋 Copy Code" button for quick developer workflows.

15. **✏️ Message Editing ("Edit for Everyone")**:
    - Inline edit trigger for sent messages.
    - Updates text in real-time across all connected clients with an `(edited)` indicator.

16. **🎮 In-Chat Turn-based Mini-Game (Tic-Tac-Toe)**:
    - Challenge friends or group members to real-time interactive Tic-Tac-Toe.
    - 3x3 interactive board with turn indicators, winner celebration banners, and draw detection.

17. **🗣️ Speech-to-Text Voice Transcription**:
    - Dictate messages hands-free using the browser's native Web Speech API.
    - Live animated microphone pulse with automatic transcription into the message input field.

18. **👻 Incognito / Ghost Mode**:
    - Toggle Ghost Mode in the navbar to hide typing indicators and online presence while maintaining full chat access.

---

## 📁 Project Architecture

```
mern-auth-app/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js               # MongoDB connection with Mongoose
│   │   ├── controllers/
│   │   │   └── authController.js   # register, login, getMe, updateProfile
│   │   ├── middleware/
│   │   │   └── auth.js             # JWT Bearer token protect middleware
│   │   ├── models/
│   │   │   └── User.js             # User Schema with bcrypt pre-save hook
│   │   ├── routes/
│   │   │   └── authRoutes.js       # Public & protected route definitions
│   │   └── server.js               # Express app, CORS, error handling
│   ├── .env                        # Environment variables (PORT, MONGO_URI, JWT_SECRET)
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Navbar.jsx          # Header with live server connection pill
    │   │   ├── LoginForm.jsx       # Sign in form + demo account pre-fill
    │   │   ├── RegisterForm.jsx    # Registration form + password strength meter
    │   │   ├── Dashboard.jsx       # Protected dashboard, profile edit & JWT inspector
    │   │   └── LearningGuide.jsx   # Interactive full-stack architecture guide
    │   ├── context/
    │   │   └── AuthContext.jsx     # Centralized auth state & localStorage token sync
    │   ├── services/
    │   │   └── api.js              # Fetch client with auto-Bearer headers
    │   ├── App.jsx                 # App routing between Auth, Dashboard, and Guide
    │   ├── App.css                 # Dark glassmorphic design system
    │   └── index.css               # Global theme tokens and fonts
    ├── vite.config.js              # Vite server & API proxy config
    └── package.json
```

---

## 📡 API Endpoints

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register new user with name, email, password, bio |
| `POST` | `/api/auth/login` | Public | Login with email & password, returns JWT token |
| `GET` | `/api/auth/me` | Protected | Fetch current authenticated user's profile |
| `PUT` | `/api/auth/profile` | Protected | Update authenticated user's name & bio |
| `GET` | `/api/health` | Public | Check if backend is running |

---

## 💡 Key Learning Concepts

1. **Password Hashing (`bcryptjs`)**:
   - Plain text passwords are never saved to MongoDB.
   - A salt with cost factor 10 is generated, and the password is encrypted inside Mongoose's `pre('save')` hook.
   
2. **JSON Web Tokens (`jsonwebtoken`)**:
   - On successful login or registration, the server signs a token containing `{ id: user._id }` with expiration time.
   - The client stores this in `localStorage` and includes it in the `Authorization: Bearer <token>` header for subsequent requests.

3. **Route Protection (`auth.js`)**:
   - Middleware extracts the Bearer token, verifies its digital signature, decodes the user ID, and queries the user without the password field (`select('-password')`).
