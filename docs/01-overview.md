# AI-NAD — Project Overview

## What Is AI-NAD?

**AI-NAD** (_Autonomous AI Application Developer_) is a full-stack, AI-powered software factory that converts a single plain-English sentence into a **complete, runnable web application** — backend, frontend, database schema, authentication, tests, and all.

You type:

```
Create a task manager web app with user login and team collaboration
```

AI-NAD produces a fully structured project folder containing:

- A **Node.js/Express TypeScript backend** with REST API routes, controllers, services, and data models
- A **React + TypeScript frontend** with components, pages, and API integration
- A **database schema** with tables and relationships
- **Firebase Authentication** integration
- **Unit and integration test files**
- A ready-to-run `package.json` with all dependencies

---

## The Problem It Solves

Building a new application from scratch is repetitive and time-consuming:

- Developers spend hours setting up boilerplate structures
- Architectural decisions (which services? what endpoints? what DB tables?) are made repeatedly for every project
- Teams with mixed experience levels produce inconsistent code structures

AI-NAD solves this by **automating the entire scaffolding and architecture phase**, letting developers focus on business-specific logic instead of boilerplate.

---

## Motive & Goals

| Goal            | How AI-NAD Achieves It                                                                                     |
| --------------- | ---------------------------------------------------------------------------------------------------------- |
| **Speed**       | Generate a full-stack project in minutes instead of hours                                                  |
| **Consistency** | Every project follows the same layered architecture (Models → Services → Controllers → Routes)             |
| **Correctness** | An iterative self-correction repair loop runs TypeScript validation (`tsc`) and automatically fixes errors |
| **Flexibility** | Supports multiple AI backends: Google Gemini API or local Ollama models (no cost, no internet required)    |
| **Security**    | A dedicated Security Agent reviews and hardens the architecture before code is generated                   |

---

## What Makes It Different

- **Not just a template generator** — It reasons about the project, designs the architecture, and writes meaningful business logic
- **Self-correcting** — Up to 3 repair iterations are run automatically if generated TypeScript fails to compile
- **Layered generation** — Code is generated in dependency order (Models first, then Services that reference Models, then Controllers that reference Services) to avoid circular import hallucinations
- **Agent-based pipeline** — Each specialist AI agent focuses on one concern, producing higher quality output than a single monolithic prompt

---

## Intended Users

- **Developers** who want to skip boilerplate and prototype faster
- **Students** learning full-stack architecture patterns
- **Tech leads** who want a consistent architectural baseline for new projects
- **Entrepreneurs** who want to rapidly validate app ideas
