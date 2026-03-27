# AI-NAD — REST API Reference

Base URL: `http://localhost:5000`

---

## Health Check

### `GET /health`

Returns server status.

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2026-03-27T12:00:00.000Z"
}
```

---

## Pipeline Endpoints

All pipeline endpoints are prefixed with `/api/pipeline`.

---

### Start Generation

**`POST /api/pipeline/generate`**

Starts a new AI generation pipeline job. Returns a job ID immediately (async — the pipeline runs in the background).

**Request Body:**

```json
{
  "prompt": "create a task manager web app with user login and team collaboration"
}
```

**Response `200 OK`:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Generation started"
}
```

**Error `400`:**

```json
{
  "error": "Prompt is required"
}
```

---

### Get Generation Status

**`GET /api/pipeline/status/:id`**

Polls the status of a running or completed pipeline job. The frontend polls this every 2 seconds to show live progress.

**URL Parameter:** `id` — the UUID returned by the `generate` endpoint

**Response `200 OK` — Processing:**

```json
{
  "id": "550e8400-...",
  "status": "processing",
  "progress": "Generating code files...",
  "currentStep": "Code Agent",
  "stepNumber": 4,
  "totalSteps": 8,
  "steps": [
    { "name": "Intent Agent", "status": "completed" },
    { "name": "Requirement Agent", "status": "completed" },
    { "name": "Architecture Agent", "status": "completed" },
    { "name": "Security Agent", "status": "completed" },
    { "name": "Code Agent", "status": "processing" },
    { "name": "Test Agent", "status": "pending" },
    { "name": "Validation Agent", "status": "pending" },
    { "name": "Project Builder", "status": "pending" }
  ]
}
```

**Response `200 OK` — Completed:**

```json
{
  "id": "550e8400-...",
  "status": "completed",
  "progress": "Project generated successfully",
  "currentStep": "Complete",
  "stepNumber": 8,
  "totalSteps": 8,
  "context": {
    "userPrompt": "create a task manager web app",
    "projectPath": "/home/user/AI_NAD/generated-projects/task-manager-app",
    "intent": { ... },
    "requirements": { ... },
    "architecture": { ... }
  }
}
```

**Response `200 OK` — Failed:**

```json
{
  "id": "550e8400-...",
  "status": "failed",
  "error": "Intent Agent failed: ..."
}
```

**Error `404`:**

```json
{
  "error": "Generation not found"
}
```

---

### List Generated Projects

**`GET /api/pipeline/projects`**

Returns paths to all successfully generated projects in the current session (in-memory only — resets on server restart).

**Response `200 OK`:**

```json
{
  "projects": [
    "/home/user/AI_NAD/generated-projects/task-manager-app",
    "/home/user/AI_NAD/generated-projects/blog-platform"
  ]
}
```

---

## Status Values

| Status       | Meaning                                    |
| ------------ | ------------------------------------------ |
| `pending`    | Job queued, not started yet                |
| `processing` | Pipeline is actively running               |
| `completed`  | Project successfully generated             |
| `failed`     | Pipeline errored out — check `error` field |

## Step Status Values

| Status       | Meaning                        |
| ------------ | ------------------------------ |
| `pending`    | Step not yet reached           |
| `processing` | This step is currently running |
| `completed`  | Step finished successfully     |
| `failed`     | Step encountered an error      |
