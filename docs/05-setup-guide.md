# AI-NAD — Setup Guide

## Prerequisites

Ensure the following are installed before you begin:

| Tool    | Minimum Version          | Install             |
| ------- | ------------------------ | ------------------- |
| Node.js | 18.x                     | https://nodejs.org  |
| npm     | 9.x (comes with Node.js) | —                   |
| Git     | any                      | https://git-scm.com |

**Optional (for local AI models only):**
| Tool | Purpose | Install |
|---|---|---|
| Ollama | Run LLMs locally | https://ollama.com/download |

---

## 1. Clone the Repository

```bash
git clone <your-repo-url> AI_NAD
cd AI_NAD
```

---

## 2. Install Root Dependencies

```bash
npm install
```

---

## 3. Install Backend Dependencies

```bash
cd backend
npm install
cd ..
```

---

## 4. Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

---

## 5. Configure Environment Variables

```bash
cp backend/.env.example backend/.env   # if .env.example exists
# OR just open backend/.env directly
```

Open `backend/.env` and fill in your settings:

```env
PORT=5000

# ─── AI Service ───────────────────────────────────────────────
# Options: 'gemini' or 'ollama'
AI_SERVICE_TYPE=gemini

# ─── Gemini API (used when AI_SERVICE_TYPE=gemini) ────────────
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash

# ─── Ollama (used when AI_SERVICE_TYPE=ollama) ────────────────
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=deepseek-coder

# ─── General ──────────────────────────────────────────────────
NODE_ENV=development
```

> See [06-ai-models.md](./06-ai-models.md) for detailed instructions on getting a Gemini API key or setting up Ollama.

---

## 6. Start the Backend

```bash
cd backend
npm run dev
```

You should see:

```
[INFO] Server running on port 5000
```

The backend uses `tsx watch` — it automatically reloads on any `.ts` file change. Leave this terminal running.

---

## 7. Start the Frontend

Open a **new terminal**:

```bash
cd frontend
npm run dev
```

You should see:

```
  VITE v5.x.x  ready in XXX ms
  ➜  Local:   http://localhost:5173/
```

---

## 8. Open the App

Navigate to **http://localhost:5173** in your browser.

Type a project description in the input box and click **Generate**. The pipeline will start and you'll see live progress through each step.

---

## 9. Find Your Generated Project

When generation completes, the project is saved to:

```
AI_NAD/generated-projects/<project-name>/
├── backend/
│   ├── src/
│   ├── package.json
│   └── tsconfig.json
└── frontend/
    ├── src/
    ├── package.json
    └── vite.config.ts
```

### Running a Generated Project

```bash
# Backend
cd generated-projects/<project-name>/backend
npm install
npm run dev   # or: node src/index.js

# Frontend (new terminal)
cd generated-projects/<project-name>/frontend
npm install
npm run dev
```

---

## Troubleshooting

### Port Already in Use

```bash
# Kill whatever is on port 5000
lsof -ti:5000 | xargs kill -9
# Then restart backend
```

### `tsx: command not found`

```bash
cd backend
npm install   # tsx is a devDependency, ensure it's installed
```

### Gemini 429 Rate Limit

The free tier allows 15 requests/minute. AI-NAD's 5-second rate-limit queue should handle this automatically. If you're still hitting limits, wait 60 seconds and retry, or switch to a different API key (add backup keys as comments in `.env`).

### Ollama "Connection Refused"

Ensure Ollama is running:

```bash
ollama serve
```
