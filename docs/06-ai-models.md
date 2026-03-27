# AI-NAD — AI Model Options

AI-NAD supports two AI backends. You switch between them by setting one line in `backend/.env`:

```env
AI_SERVICE_TYPE=gemini   # Use Google Gemini API (recommended)
# AI_SERVICE_TYPE=ollama # Use Ollama local model
```

---

## Option 1 — Google Gemini API (Recommended)

### Why Gemini?

- **Free tier available** — 15 requests/minute, 1500 requests/day at no cost
- **No hardware required** — runs in Google's cloud
- **Large context window** — gemini-1.5-flash supports up to 1 million tokens
- **Fast** — typical response time of 1–3 seconds per agent call

### Getting a Free API Key

1. Go to **https://aistudio.google.com/app/apikey**
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Copy the key

### Configuration

Open `backend/.env`:

```env
AI_SERVICE_TYPE=gemini
GEMINI_API_KEY=AIzaSy...your-key-here...
GEMINI_MODEL=gemini-1.5-flash
```

### Available Free-Tier Models

| Model                  | Speed     | Quality         | Context   | Best For                   |
| ---------------------- | --------- | --------------- | --------- | -------------------------- |
| `gemini-1.5-flash`     | ⚡ Fast   | ⭐⭐⭐ Good     | 1M tokens | **Recommended default**    |
| `gemini-1.5-pro`       | 🐢 Slower | ⭐⭐⭐⭐ Better | 1M tokens | Higher quality output      |
| `gemini-2.0-flash-exp` | ⚡ Fast   | ⭐⭐⭐⭐ Better | 1M tokens | Experimental, very capable |

> **Auto-detection:** If `GEMINI_MODEL` is not set or the model returns a 404, AI-NAD automatically probes the API to find the best available model for your key.

### Rate Limits & How AI-NAD Handles Them

The free tier has a **15 requests/minute (RPM)** limit. The pipeline makes ~9 LLM calls per generation (8 agents, some combined). AI-NAD implements:

- **5-second minimum gap** between all requests (global queue across all requests)
- **Automatic retry** with exponential backoff on 429 errors
- **Automatic model switching** — if one model is rate-limited, it tries another available model
- **Multiple API key support** — add backup keys as comments in `.env` and swap when rate-limited:

```env
GEMINI_API_KEY=AIzaSy...primary-key...
# GEMINI_API_KEY=AIzaSy...backup-key-1...
# GEMINI_API_KEY=AIzaSy...backup-key-2...
```

### Paid Gemini Plans

If you need higher throughput:

1. Enable billing at **https://console.cloud.google.com/billing**
2. Go to the Gemini API section and upgrade your plan
3. `gemini-1.5-pro` or `gemini-1.5-flash` with billing gives 1000+ RPM

---

## Option 2 — Ollama (Free, Local, Private)

### Why Ollama?

- **Completely free** — no API key, no account, no cost
- **Private** — your prompts and generated code never leave your machine
- **Works offline** — no internet required after model download
- **Customisable** — use any model available on the Ollama library

### Tradeoffs vs Gemini

|          | Gemini (Cloud)      | Ollama (Local)                        |
| -------- | ------------------- | ------------------------------------- |
| Cost     | Free tier available | Completely free                       |
| Setup    | Get API key only    | Install Ollama + download model       |
| Privacy  | Sent to Google      | 100% local                            |
| Speed    | 1–3 seconds         | Depends on your GPU/CPU (~5–60s)      |
| Quality  | ⭐⭐⭐⭐ Excellent  | ⭐⭐–⭐⭐⭐ Depends on model/hardware |
| Context  | 1M tokens           | Model-dependent (usually 4k–128k)     |
| Internet | Required            | Not required                          |

### Step 1 — Install Ollama

**Linux:**

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**macOS:**

```bash
brew install ollama
# OR download from https://ollama.com/download
```

**Windows:**
Download the installer from **https://ollama.com/download/windows**

### Step 2 — Start the Ollama Server

```bash
ollama serve
```

The server runs at `http://localhost:11434`. Keep this terminal open.

### Step 3 — Download a Model

Choose a model based on your hardware:

#### Recommended: `deepseek-coder` (Default)

Best for code generation. ~4.7GB download.

```bash
ollama pull deepseek-coder
```

#### Alternative: `codellama`

Meta's Code Llama model. Good code quality. ~3.8GB.

```bash
ollama pull codellama
```

#### Alternative: `llama3`

General-purpose. Good for intent/architecture agents. ~4.7GB.

```bash
ollama pull llama3
```

#### Alternative: `qwen2.5-coder:7b`

Alibaba's Qwen Coder 7B. Excellent code quality. ~4.7GB.

```bash
ollama pull qwen2.5-coder:7b
```

> **Hardware guidance:**
>
> - **8GB RAM** minimum — can run 7B models (4-bit quantized)
> - **16GB RAM** — comfortable with 7B–13B models
> - **GPU (NVIDIA/AMD/Apple Silicon)** — dramatically faster inference; Ollama auto-detects and uses GPU

### Step 4 — Configure AI-NAD

```env
AI_SERVICE_TYPE=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=deepseek-coder
```

### Step 5 — Test the Connection

```bash
curl http://localhost:11434/api/tags
```

Should return a JSON list of your downloaded models. If it fails, run `ollama serve` first.

### Listing Available Models

```bash
ollama list
```

### Switching Models

Just change `OLLAMA_MODEL` in `.env` — no restart needed (tsx watch hot-reloads). The new model is used on the next pipeline run.

---

## Choosing the Right Option

```
Do you have a GPU or fast machine?
├── Yes → Ollama with qwen2.5-coder:7b or deepseek-coder
└── No  →
    Do you need privacy / offline?
    ├── Yes → Ollama (will be slower but works)
    └── No  → Gemini API (fastest, best quality)
```
