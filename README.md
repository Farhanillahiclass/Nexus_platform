# ⚡ NEXUS — Next-Generation Intelligence Platform

> Full-stack browser platform: AI assistant + Learning academy + Social hub + Ai Tools

## 🚀 Quick Start

### 1. Install
```bash
cd frontend && npm install
cd ../backend && npm install
```

### 2. Configure
```bash
cd backend
cp .env.example .env
# Add your API keys in .env
```

### 3. Run
```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

Open http://localhost:5173

## 🔑 Get Free AI Key
Gemini has a FREE tier → https://makersuite.google.com/app/apikey
Add it as GEMINI_API_KEY in backend/.env

## 📁 Structure
```
nexus/
├── frontend/src/
│   ├── pages/       # 7 pages: Home, AI, Learn, Social, Tools, Store, Profile
│   ├── context/     # AuthContext, AppStore (Zustand)
│   └── styles/      # globals.css
└── backend/src/
    ├── server.js    # Express + Socket.IO
    ├── config/      # db.js, ai.js
    ├── models/      # User.js, Chat.js
    ├── routes/      # auth, ai, user, learn
    ├── services/    # aiService.js (Claude+GPT4o+Gemini router)
    └── middleware/  # auth, rateLimiter, errorHandler
```

## 🛠 Tech Stack
- Frontend: React 18, Vite, Tailwind CSS, Zustand, React Router
- Backend: Node.js, Express, MongoDB, Mongoose, Socket.IO, JWT
- AI: Anthropic Claude, OpenAI GPT-4o, Google Gemini (auto-fallback)
