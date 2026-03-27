# AI-NAD — Project Structure

## Full Directory Tree

```
AI_NAD/
│
├── agents/                          # All AI agent implementations
│   ├── architecture-agent/
│   │   ├── index.ts                 # Source (TypeScript)
│   │   └── index.js                 # Compiled (used by runtime imports)
│   ├── auth-agent/                  # Firebase authentication code generator
│   ├── code-agent/                  # Main code generation agent (decomposed)
│   ├── intent-agent/                # Prompt → structured intent + requirements
│   ├── requirement-agent/           # (Merged into intent-agent in v1)
│   ├── security-agent/              # Architecture security hardening
│   ├── test-agent/                  # Test file generation
│   └── validation-agent/            # Static + tsc validation
│
├── backend/                         # Express API server
│   ├── src/
│   │   ├── ai/
│   │   │   ├── ai-service-factory.ts   # Factory: creates Gemini or Ollama service
│   │   │   ├── gemini-service.ts       # Google Gemini API integration
│   │   │   ├── gemini-service.js       # Compiled JS (imported by agents)
│   │   │   ├── gemini-model-finder.ts  # Auto-detects best available Gemini model
│   │   │   └── ollama-service.ts       # Local Ollama HTTP integration
│   │   ├── controllers/
│   │   │   └── pipeline.controller.ts  # Handles /api/pipeline/* HTTP requests
│   │   ├── pipeline/
│   │   │   └── orchestrator.ts         # Coordinates all agents in sequence
│   │   ├── routes/
│   │   │   └── pipeline.ts             # Express router for pipeline endpoints
│   │   ├── services/
│   │   │   ├── pipeline-service.ts     # Business logic, status tracking
│   │   │   └── project-builder.ts      # Writes generated files to disk
│   │   ├── types/
│   │   │   └── index.ts                # All shared TypeScript interfaces
│   │   ├── utils/
│   │   │   └── logger.ts               # Structured console logger
│   │   └── index.ts                    # Express app entry point
│   ├── .env                            # Environment variables (never commit!)
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                        # React web UI
│   ├── src/
│   │   ├── components/
│   │   │   ├── blocks/
│   │   │   │   └── hero-section.tsx    # Landing page hero component
│   │   │   └── ui/                     # shadcn-style UI primitives (Button, etc.)
│   │   ├── pages/
│   │   │   └── GeneratePage.tsx        # Main generation form + progress display
│   │   ├── services/
│   │   │   └── api.ts                  # Axios client for backend REST API
│   │   ├── App.tsx                     # Root component with ThemeProvider
│   │   ├── App.css                     # Global styles
│   │   ├── index.css                   # Tailwind base + custom CSS variables
│   │   └── main.tsx                    # Vite entry point
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── package.json
│
├── generated-projects/              # OUTPUT: All AI-generated apps land here
│   └── <project-name>/
│       ├── backend/
│       └── frontend/
│
├── configs/                         # Additional configuration files
├── scripts/                         # Utility/helper scripts
├── docs/                            # ← You are here
│
├── package.json                     # Root workspace package.json
├── tsconfig.json                    # Root TypeScript config
├── PROJECT_STRUCTURE.md             # Legacy structure reference
├── README.md                        # Quick project overview
└── QUICKSTART.md                    # Short getting-started guide
```

---

## Key Files Explained

### `backend/src/ai/ai-service-factory.ts`

The central switching point for AI providers. Reads `AI_SERVICE_TYPE` from `.env` and instantiates either `GeminiService` or `OllamaService`. All agents receive an `AIService` interface — they never know which provider is running.

### `backend/src/pipeline/orchestrator.ts`

The brain of the operation. Instantiates all 8 agents and calls them in sequence. Manages the **Repair Loop** (Code → Validate → Repair, up to 3 iterations).

### `backend/src/services/pipeline-service.ts`

Manages generation jobs (each has a UUID), tracks progress through the steps, and intercepts `Logger.pipelineStep` calls to update status in real time. The frontend polls this for progress updates.

### `backend/src/services/project-builder.ts`

Takes the complete `PipelineContext` and writes all files to `generated-projects/<name>/`. Auto-generates `package.json`, `tsconfig.json`, and `.env.example` for the generated project.

### `agents/code-agent/index.ts`

The most complex agent. Breaks code generation into 5 sub-calls (Models → Services → Controllers → Routes → Frontend). Uses **Zod** to validate that the AI returned a properly structured JSON array of `{ path, content }` objects.

### `.env`

The only file you need to change to switch AI providers:

```
AI_SERVICE_TYPE=gemini   # or 'ollama'
GEMINI_API_KEY=your-key
GEMINI_MODEL=gemini-1.5-flash
```
