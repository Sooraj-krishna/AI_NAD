# AI-NAD — Agent Deep Dive

All agents are located in `agents/<name>/index.ts`. Each agent:

- Receives an `AIService` instance in its constructor
- Has a `process()` method that returns `AgentResponse<TOutput>`
- Only calls the LLM — no database, no file I/O (except `ValidationAgent`)

---

## Agent Response Shape

```typescript
interface AgentResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

---

## 1. Intent Agent

**File:** `agents/intent-agent/index.ts`  
**LLM Calls:** 1  
**Input:** `userPrompt: string`  
**Output:** `CombinedIntentRequirementOutput`

### What It Does

Combines the work of the old Intent Agent and Requirement Agent into a **single LLM call** to save API quota. It:

- Parses the user's plain-English prompt
- Identifies the project type, technology stack, and feature modules
- Breaks the project down into services and database entities

### Output Schema

```typescript
{
  intent: {
    project_type: string;          // e.g. "web app"
    core_modules: string[];        // e.g. ["auth", "tasks", "teams"]
    recommended_stack: {
      frontend: string;            // e.g. "React"
      backend: string;             // e.g. "Node.js"
      database: string;            // e.g. "PostgreSQL"
    };
    database: string;
    authentication: boolean;
    api_requirements: string[];
  };
  requirements: {
    services: string[];            // e.g. ["AuthService", "TaskService"]
    entities: Array<{
      name: string;
      fields: Array<{
        name: string;
        type: string;
        required: boolean;
      }>;
    }>;
    workflows: Array<{
      name: string;
      steps: string[];
    }>;
  };
}
```

---

## 2. Architecture Agent

**File:** `agents/architecture-agent/index.ts`  
**LLM Calls:** 1  
**Input:** `RequirementOutput`  
**Output:** `ArchitectureOutput`

### What It Does

Designs the full technical blueprint:

- Every API endpoint (method, path, request/response schema)
- The complete database schema (tables, columns with types, foreign keys)
- Service-to-service dependencies

### Output Schema

```typescript
{
  api_endpoints: Array<{
    method: string;           // GET, POST, PUT, DELETE
    path: string;             // e.g. /api/tasks/:id
    description: string;
    auth_required: boolean;
    request_body?: object;
    response: object;
  }>;
  database_schema: {
    tables: Array<{
      name: string;
      columns: Array<{
        name: string;
        type: string;         // uuid, varchar, boolean, timestamp, etc.
        nullable: boolean;
        primary_key?: boolean;
        foreign_key?: string;
      }>;
    }>;
  };
  services: string[];
}
```

---

## 3. Security Agent

**File:** `agents/security-agent/index.ts`  
**LLM Calls:** 1  
**Input:** `IntentOutput` + `RequirementOutput` + `ArchitectureOutput`  
**Output:** Modified `ArchitectureOutput`

### What It Does

Reviews the generated architecture and hardens it:

- Adds `auth_required: true` to endpoints that should be protected
- Recommends password hashing, token expiry, rate-limiting
- Flags sensitive fields (passwords, tokens) for special handling
- Returns the modified architecture with security controls embedded

If the Security Agent fails (LLM error), the pipeline **continues** with the original architecture — security is additive, not blocking.

---

## 4. Firebase Auth Agent

**File:** `agents/auth-agent/index.ts`  
**LLM Calls:** 1  
**Input:** `IntentOutput` + `ArchitectureOutput`  
**Output:** `FileContent[]` (array of auth-related files)

### What It Does

Generates Firebase Authentication integration files and injects them before code generation:

**Backend files generated:**

- Firebase Admin SDK initialization (`src/config/firebase.ts`)
- Auth middleware for verifying Firebase ID tokens (`src/middleware/auth.ts`)

**Frontend files generated:**

- Firebase client SDK initialization (`src/lib/firebase.ts`)
- Login/logout components with Firebase Auth methods

These files are merged into the `CodeOutput` in the orchestrator before the Code Agent runs.

---

## 5. Code Agent

**File:** `agents/code-agent/index.ts`  
**LLM Calls:** 5 (initial) + 1 per repair  
**Input:** `ArchitectureOutput`  
**Output:** `CodeOutput { backend: FileContent[], frontend: FileContent[] }`

### What It Does — Decomposed Generation

Rather than asking the AI to generate everything in one massive call, code is generated in **5 separate focused calls** in dependency order:

#### 4a — Models

Generates TypeScript interfaces and data model classes from the database schema.

```
Input: database_schema.tables
Output: [{ path: "src/models/user.model.ts", content: "..." }, ...]
```

#### 4b — Services

Generates service classes that implement business logic, referencing the Models from 4a.

```
Input: architecture + model files from 4a
Output: [{ path: "src/services/user.service.ts", content: "..." }, ...]
```

#### 4c — Controllers

Generates Express route handler classes referencing the Services from 4b.

```
Input: api_endpoints + service files from 4b
Output: [{ path: "src/controllers/user.controller.ts", content: "..." }, ...]
```

#### 4d — Routes

Generates the main Express router connecting all controllers.

```
Input: architecture + controller files from 4c
Output: [{ path: "src/routes/index.ts", content: "..." }]
```

#### 4e — Frontend

Generates React components, pages, and API client code.

```
Input: architecture
Output: [{ path: "src/components/TaskList.tsx", content: "..." }, ...]
```

### Repair Mode (`CodeAgent.repair()`)

When the Validation Agent finds errors, the orchestrator calls `repair()`:

- Receives the list of errors, the current code, the architecture, and the original prompt
- Returns only the files that need to be changed (not the entire project)
- Repaired files are merged back into the existing code context

### Output Validation (Zod)

Every sub-call result is validated with this Zod schema before use:

```typescript
const FileContentSchema = z.object({
  path: z.string().min(1),
  content: z.string().min(1),
});
const FileArraySchema = z.array(FileContentSchema);
```

If validation fails, an error is thrown immediately (which triggers the repair loop rather than writing broken files to disk).

---

## 6. Test Agent

**File:** `agents/test-agent/index.ts`  
**LLM Calls:** 1  
**Input:** `ArchitectureOutput`  
**Output:** `FileContent[]` (test files)

### What It Does

Generates Jest unit and integration test stubs for each service and controller. Tests are included in the final project output.

---

## 7. Validation Agent

**File:** `agents/validation-agent/index.ts`  
**LLM Calls:** 0 (no AI — uses `tsc` and static analysis)  
**Input:** `CodeOutput` + `projectPath`  
**Output:** `ValidationOutput { valid: boolean, errors: ValidationError[] }`

### What It Does — Two-Stage Validation

#### Stage 1 — Static Analysis

Regex-based checks for common problems:

- Missing required imports
- Hardcoded credentials (passwords, secrets in source)
- Basic security anti-patterns

#### Stage 2 — Native TypeScript Validation

Runs the TypeScript compiler against the prepared project:

```bash
npx tsc --noEmit --strict
```

Any compile errors are collected and returned as structured `ValidationError` objects with file name and line number.

This is the **most powerful check** — it catches the real-world errors that a regex could never detect (wrong types, missing exports, wrong function signatures, etc.).

---

## 8. Project Builder (Service)

**File:** `backend/src/services/project-builder.ts`  
**LLM Calls:** 0 (file I/O only)  
**Input:** Full `PipelineContext`  
**Output:** Project directory path string

### What It Does

**`prepareProject(context)`** — writes files to a temp location for validation  
**`buildProject(context)`** — writes final project to `generated-projects/<name>/`

Also generates:

- `package.json` with auto-detected dependencies from import statements
- `tsconfig.json` appropriate for a Node.js project
- `.env.example` with required environment variable names
- `README.md` with project description and run instructions
