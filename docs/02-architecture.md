# AI-NAD — System Architecture

## High-Level Architecture

AI-NAD is composed of three main systems:

```
┌─────────────────────────────────────────────────────┐
│                  User Browser                       │
│          React + Vite + TailwindCSS Frontend        │
│              http://localhost:5173                  │
└─────────────────────┬───────────────────────────────┘
                      │ HTTP (REST API)
                      ▼
┌─────────────────────────────────────────────────────┐
│            Express + TypeScript Backend             │
│              http://localhost:5000                  │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │           Pipeline Orchestrator              │  │
│  │                                              │  │
│  │  Intent → Architecture → Security → Auth    │  │
│  │       ↓                                     │  │
│  │  ┌─────────────────────────────────────┐    │  │
│  │  │     Code Generation Repair Loop     │    │  │
│  │  │   CodeAgent → Validate → Repair     │    │  │
│  │  │   (max 3 iterations)                │    │  │
│  │  └─────────────────────────────────────┘    │  │
│  │       ↓                                     │  │
│  │  Project Builder → generated-projects/      │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │            AI Service Layer                  │  │
│  │   ┌──────────────┐  ┌────────────────────┐  │  │
│  │   │ GeminiService│  │   OllamaService    │  │  │
│  │   │ (Google API) │  │ (Local LLM Server) │  │  │
│  │   └──────────────┘  └────────────────────┘  │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                      │
                      ▼
         generated-projects/<name>/
         ├── backend/   (Node.js/Express)
         └── frontend/  (React/Vite)
```

---

## The AI Pipeline — Step by Step

### Step 1 — Intent + Requirement Agent (Combined)

**Input:** Raw user prompt string  
**Output:** Structured `IntentOutput` + `RequirementOutput` JSON

Both are computed in a **single LLM call** to save API quota.

- Identifies `project_type`, `core_modules`, `recommended_stack`, whether authentication is needed, and API requirements
- Breaks the intent into `services`, `entities` (database tables with typed fields), and `workflows`

---

### Step 2 — Architecture Agent

**Input:** `RequirementOutput`  
**Output:** `ArchitectureOutput`

Designs the full technical blueprint:

- API endpoints with HTTP methods, request/response shapes
- Database schema (tables, columns, types, relationships)
- Service dependencies graph

---

### Step 3 — Security Agent

**Input:** `IntentOutput` + `RequirementOutput` + `ArchitectureOutput`  
**Output:** Hardened `ArchitectureOutput`

Reviews and enhances the architecture:

- Adds authentication middleware to protected routes
- Flags sensitive data fields for encryption
- Applies CORS, rate-limiting, and input validation recommendations
- Returns a modified architecture with security controls baked in

---

### Step 3c — Firebase Auth Agent

**Input:** `IntentOutput` + `ArchitectureOutput`  
**Output:** Auth-related `FileContent[]`

Generates Firebase Authentication integration files:

- Backend middleware for verifying Firebase ID tokens
- Frontend Firebase SDK initialization and login/logout components
- Injects these into the code context before code generation

---

### Step 4 — Code Agent (Decomposed Generation)

**Input:** Hardened `ArchitectureOutput`  
**Output:** `CodeOutput` with `backend[]` and `frontend[]` file arrays

Generated in **dependency order** to minimize import errors:

| Sub-step             | What's Generated                                   | Why First?                        |
| -------------------- | -------------------------------------------------- | --------------------------------- |
| **4a — Models**      | TypeScript interfaces and DB models                | Everything else imports from here |
| **4b — Services**    | Business logic classes referencing Models          | Controllers depend on Services    |
| **4c — Controllers** | Express route handler classes referencing Services | Routes depend on Controllers      |
| **4d — Routes**      | Express router connecting all Controllers          | Must know all controller paths    |
| **4e — Frontend**    | React components, pages, and API clients           | Separate from backend             |

Each sub-step is a separate, focused LLM call — smaller context = fewer hallucinations.

---

### Step 5 — Test Agent

**Input:** `ArchitectureOutput`  
**Output:** Test files (Jest unit/integration tests)

Generates test stubs for each service and controller.

---

### Step 6 — Validation Agent + Repair Loop

**Input:** `CodeOutput` + project path  
**Output:** `ValidationOutput` with `valid: boolean` and `errors[]`

Two-stage validation:

1. **Static Analysis** — Regex checks for known bad patterns (missing imports, common security issues)
2. **Native TypeScript Validation** — Runs `npx tsc --noEmit` against the generated project

If errors are found and `iteration < 3`:

- The errors are passed back to `CodeAgent.repair()`
- The repair agent fixes only the affected files
- Validation runs again

This loop runs up to **3 times**, then proceeds with best-effort output.

---

### Step 7 — Project Builder

**Input:** Full `PipelineContext` (all generated files + architecture)  
**Output:** Assembled project directory at `generated-projects/<projectName>/`

- Writes all files to disk
- Auto-generates `package.json` with inferred dependencies
- Produces `tsconfig.json`, `.env.example`, and `README.md`

---

## Pipeline Flow Diagram

```
User Prompt
    │
    ▼
┌─────────────────────┐
│  Intent Agent       │  ← 1 LLM call
│  + Requirement Agent│
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Architecture Agent │  ← 1 LLM call
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Security Agent     │  ← 1 LLM call
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Firebase Auth Agent│  ← 1 LLM call
└──────────┬──────────┘
           │
    ┌──────▼──────────────────────────────┐
    │         REPAIR LOOP (max 3)         │
    │                                     │
    │  ┌──────────────────────────────┐   │
    │  │  Code Agent (Decomposed)     │   │
    │  │  4a Models  → 1 LLM call    │   │
    │  │  4b Services → 1 LLM call   │   │
    │  │  4c Controllers → 1 LLM call│   │
    │  │  4d Routes → 1 LLM call     │   │
    │  │  4e Frontend → 1 LLM call   │   │
    │  └──────────────┬───────────────┘   │
    │                 │                   │
    │  ┌──────────────▼───────────────┐   │
    │  │  Validation Agent            │   │
    │  │  (static + tsc)              │   │
    │  └──────────────┬───────────────┘   │
    │              valid?                 │
    │           NO ──►  Repair Agent      │
    │                   ← 1 LLM call      │
    └──────────────────────────────────── ┘
           │ YES (or max iterations hit)
           ▼
┌─────────────────────┐
│  Project Builder    │  ← File I/O only
│  Writes to disk     │
└─────────────────────┘
           │
           ▼
  generated-projects/<name>/
```

---

## AI Service Abstraction

All agents use the `AIService` interface, making the underlying LLM completely swappable:

```typescript
interface AIService {
  generate(prompt: string, systemPrompt?: string): Promise<string>;
  generateJSON<T>(prompt: string, systemPrompt?: string): Promise<T>;
  setModel(model: string): void;
}
```

Implementations:

- **`GeminiService`** — Google Gemini API with a 5s rate-limit queue, auto model detection, and exponential backoff on 429s
- **`OllamaService`** — Local Ollama HTTP API (zero cost, full privacy)

The active service is chosen via `AI_SERVICE_TYPE` in `.env`.
