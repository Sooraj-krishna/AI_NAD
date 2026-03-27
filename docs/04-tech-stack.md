# AI-NAD — Tech Stack

## Overview Table

| Layer                  | Technology               | Version                     | Role                                |
| ---------------------- | ------------------------ | --------------------------- | ----------------------------------- |
| **Backend Runtime**    | Node.js                  | ≥ 18                        | Server runtime                      |
| **Backend Framework**  | Express.js               | 4.18                        | HTTP API server                     |
| **Backend Language**   | TypeScript               | 5.3                         | Type-safe backend code              |
| **Backend Dev Server** | `tsx watch`              | 4.7                         | Hot-reload TS without pre-compiling |
| **AI (Primary)**       | Google Gemini API        | `@google/generative-ai` 0.2 | LLM for all agents                  |
| **AI (Alternative)**   | Ollama                   | Local HTTP                  | Privacy-first local LLM             |
| **Schema Validation**  | Zod                      | 3.x                         | Validates AI JSON output            |
| **Frontend Framework** | React                    | 18.2                        | UI component system                 |
| **Frontend Bundler**   | Vite                     | 5.0                         | Fast dev build tool                 |
| **Frontend Language**  | TypeScript + TSX         | 5.3                         | Type-safe UI code                   |
| **Styling**            | Tailwind CSS             | 3.4                         | Utility-first CSS                   |
| **UI Primitives**      | Radix UI + custom shadcn | -                           | Accessible component base           |
| **Theme**              | next-themes              | 0.4                         | Dark/light mode switching           |
| **HTTP Client**        | Axios                    | 1.6                         | Frontend → backend API calls        |
| **Icons**              | Lucide React             | 0.577                       | Icon library                        |
| **Env Management**     | dotenv                   | 16.3                        | `.env` file loader                  |
| **File System**        | fs-extra                 | 11.1                        | Enhanced file operations            |

---

## Why Each Technology?

### Express.js

**Simple and battle-tested.** The AI pipeline is inherently asynchronous and stateful (tracking job progress in memory). Express gives complete control over routing and middleware without the overhead of a heavier framework. For an internal tool like AI-NAD, Next.js or NestJS would be overkill.

### TypeScript (both frontend + backend)

**Correctness and catch errors early.** Given that AI-NAD _generates_ TypeScript code, eating our own dogfood is important — we validate the AI's output with `tsc`. TypeScript also makes the pipeline's complex data structures (agent `InputOutput` types, `PipelineContext`, etc.) safe to refactor.

### `tsx watch` (instead of `ts-node` or compiled `node dist/`)

**No compile step in development.** `tsx` transpiles TypeScript on the fly, meaning `npm run dev` immediately reflects any saved change with zero build delay. This was chosen over `ts-node` because `tsx` is significantly faster and more compatible with ESM.

### Google Gemini API (`gemini-1.5-flash`)

**Best free-tier quality-to-cost ratio.** The `gemini-1.5-flash` model is:

- Free on the Gemini API free tier (up to 15 RPM, 1500 RPD)
- Fast (responds in 1–3 seconds for typical code prompts)
- Large context window (1M tokens) — fits entire architectures and code bases as context

The `GeminiService` implements a **5-second request queue** to stay under the 15 RPM limit, and exponential backoff + automatic model switching on 429 errors.

### Ollama (local model alternative)

**Zero cost and full privacy.** For users who cannot or do not want to send code to an external API, Ollama runs LLMs like `deepseek-coder`, `codellama`, or `llama3` entirely on the local machine. The `OllamaService` hits `http://localhost:11434` using the same `AIService` interface, so no pipeline code changes are needed.

### Vite

**Instant HMR (Hot Module Replacement).** For a project where the frontend is a relatively simple single-page app, Vite's near-instant dev server startup and HMR provide a much better development experience than Create React App (Webpack). Vite also produces optimized production builds out of the box.

### Tailwind CSS

**Rapid, consistent styling.** Tailwind's utility classes allow building a polished dark-mode interface quickly without writing custom CSS. The design uses CSS custom properties defined in `index.css` for theming (colors, radii, etc.), with Tailwind handling spacing, layout, and typography.

### Radix UI / shadcn-style components

**Accessible and unstyled.** Radix UI provides accessible primitives (dialogs, dropdowns, slots) without opinionated styling. Styled with Tailwind + `class-variance-authority` (`cva`), they give shadcn-compatible components that are fully customisable.

### Zod

**AI output validation.** Because LLMs sometimes return malformed JSON, Zod schemas are used in the `CodeAgent` to validate that the AI returned a proper `{ path: string, content: string }[]` array. If validation fails, the parse error is clear and actionable rather than a cryptic runtime crash.

### fs-extra

**Richer file system API.** Used by the `ProjectBuilder` to recursively create directories and copy files. Provides promise-based alternatives to Node's `fs` module with better error handling.

---

## Design Decisions

### Why a monorepo?

All agents, the backend, and the frontend share TypeScript types from `backend/src/types/index.ts`. A monorepo (single root `package.json`) lets agents import directly from each other and from the backend without publishing packages or setting up complex path aliases.

### Why pre-compiled `.js` agent files alongside `.ts`?

The backend server runs via `tsx` on the `.ts` files, but agents have **both** `.ts` source and compiled `.js` files alongside them. This is because some import paths within the agents use Node CommonJS `require()`, and having the `.js` compiled output ensures compatibility when agents are imported via `require()` in the pipeline (some agents were originally written in plain JS). In the future these should all be unified to ESM + `.ts` only.

### Why no database in the backend itself?

AI-NAD is a **generator**, not an application server. There is no persistent database for the generator itself — job state is held in memory (`Map<string, GenerationStatus>`). This keeps the setup zero-friction (no DB to install or migrate). A Redis store could be added later for multi-process deployments.
