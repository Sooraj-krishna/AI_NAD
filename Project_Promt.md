AI-NAD Cursor Autonomous Build Specification

Version 1.0

System type: Autonomous AI Software Factory

1. System Goal

AI-NAD converts natural language intent into runnable applications.

Pipeline:

User Intent
↓
Intent Parser
↓
Architecture Generator
↓
Code Generator
↓
Test Generator
↓
Validation Engine
↓
Project Builder

Output:
Fully generated software project.

2. Cost-Free Technology Stack

The system must use only free/open-source tools.

Runtime
Node.js
TypeScript
Express
Frontend
React
Vite
AI Framework

LangChain

LlamaIndex

Local AI Runtime

Ollama

AI Models

Free models supported

Llama 3

DeepSeek Coder

Mistral

Database
PostgreSQL

Free hosting options later:

Supabase free tier

Deployment (Free)

Supported free platforms

Cloudflare Workers

Render free tier

Railway free tier

3. Repository Structure

Cursor must generate this repository.

ai-nad/

agents/
intent-agent/
architecture-agent/
code-agent/
test-agent/
validation-agent/

backend/
src/
controllers/
routes/
services/
pipeline/
ai/
utils/

frontend/
src/
components/
pages/

generated-projects/

configs/

scripts/

docs/ 4. Multi-Agent Architecture

The system will run multiple AI agents.

Each agent performs one responsibility.

User Prompt
↓
Intent Agent
↓
Requirement Agent
↓
Architecture Agent
↓
Code Agent
↓
Test Agent
↓
Validation Agent
↓
Project Builder 5. Agent Definitions

Each agent is implemented as an LLM-powered module.

Agent 1
Intent Agent

Purpose

Convert human language into structured specification.

Input
Build a hospital management system
with patient records and billing
Output
{
"project_type":"web app",
"modules":[
"patient management",
"billing"
],
"stack":{
"frontend":"react",
"backend":"node",
"database":"postgres"
}
}
Agent Prompt
You are a senior software product manager.

Convert user request into structured
software requirements.

Output JSON only.

Include:

project_type
core_modules
recommended_stack
database
authentication
api_requirements
Agent 2
Requirement Agent

Purpose

Break modules into entities and services.

Example Output
services:
patient-service
billing-service

entities:
patient
invoice
payment
Prompt
You are a system analyst.

Break this system into services,
entities and workflows.

Return structured JSON.
Agent 3
Architecture Agent

Purpose

Generate system architecture.

Output
Frontend: React
Backend: Node + Express
Database: PostgreSQL

Services:
patient-service
billing-service
Prompt
You are a senior software architect.

Generate scalable architecture for
the following specification.

Return:

architecture
folder structure
api endpoints
database schema
Agent 4
Code Generation Agent

Purpose

Generate backend and frontend code.

Backend Targets
controllers
routes
models
services
Frontend Targets
pages
components
API hooks
Prompt
You are an expert full stack developer.

Generate production-ready code
for the following module.

Architecture:
{architecture}

Component:
{component}
Agent 5
Test Agent

Purpose

Generate test cases automatically.

Test Types
unit tests
API tests
integration tests
Prompt
Generate unit tests for the following code.

Use Jest framework.
Agent 6
Validation Agent

Purpose

Validate generated code.

Checks

syntax
security
dependency issues
Tools
ESLint
TypeScript 6. AI Pipeline Controller

Create a pipeline orchestrator.

Location

backend/src/pipeline/orchestrator.ts
Responsibilities

1 Execute agents sequentially
2 Pass outputs between agents
3 Handle failures
4 Log pipeline steps

Pipeline pseudocode

intent = IntentAgent(user_prompt)

requirements = RequirementAgent(intent)

architecture = ArchitectureAgent(requirements)

code = CodeAgent(architecture)

tests = TestAgent(code)

validation = ValidationAgent(code)

buildProject(code) 7. Automatic Repository Generation

The system must automatically generate projects.

Example output

generated-projects/

task-manager/

backend/
frontend/
database/
README.md 8. Project Builder

Responsibilities

create folders
write generated files
install dependencies
create README 9. Free Model Integration

AI calls must use local models via Ollama.

Example code

const model = new Ollama({
model: "deepseek-coder"
}) 10. Frontend Interface

User interface features

Intent Input

User describes system.

Architecture Preview

Show generated architecture.

Generate Button

Trigger pipeline.

Download Project

Download generated project.

11. Cursor Autonomous Execution Instructions

Paste the following command in Cursor chat.

Cursor Instruction Prompt

You are the autonomous development engine
for the AI-NAD platform.

Read the full build specification.

Tasks:

1 Generate repository structure
2 Implement all agents
3 Implement AI pipeline
4 Integrate Ollama models
5 Implement backend API
6 Implement frontend interface
7 Implement project generator
8 Test pipeline

Follow modular architecture.

Write production quality code.

Continue implementation until the
system generates runnable projects
from natural language prompts. 12. Development Phases

Cursor should implement in phases.

Phase 1

Intent Agent

Phase 2

Requirement Agent

Phase 3

Architecture Agent

Phase 4

Code Generator

Phase 5

Testing Agent

Phase 6

Validation Layer

Phase 7

Frontend Interface

13. Free Deployment Strategy

Deployment must remain free.

Backend

Deploy on

Render free instance

Frontend

Deploy on

Cloudflare Pages

Database

Free tier

Supabase

14. Security

Implement protections against

prompt injection
malicious code generation
dependency vulnerabilities 15. Logging

All pipeline steps logged.

intent_parsed
architecture_generated
code_generated
tests_created
project_generated 16. Expected MVP Capability

User input

Create a task manager web app
with login and dashboard

Output

React frontend
Express backend
Postgres schema
API routes
Project folder

Fully runnable.

17. Long Term Expansion

Future versions may add

multi-language support
mobile app generation
DevOps automation
CI/CD generation
microservice deployment

<!-- in current system, i find a disadvantage. when the user prompts to create a application using Authentication. it just create a simple auth code. i need a strong auth using firebase, i mean impliment a agent for authentication. the agent must use the firebase for auth and notify the user for the steps to get the cridentials for environmet variables.


this is my goal refine userself the goal and impliment this accuratly and efficiently. also must be consider all the security breaches in the authentication and fix then(if needed use a agent for that too). -->
