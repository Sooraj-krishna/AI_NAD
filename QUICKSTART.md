# AI-NAD Quick Start Guide

## Prerequisites

1. **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
2. **Gemini API Key** (recommended) - [Get from Google AI Studio](https://makersuite.google.com/app/apikey)
   - OR **Ollama** - [Download](https://ollama.ai) for local usage

## Setup Steps

### Option 1: Using Gemini API (Recommended - No Local Installation)

1. **Get Gemini API Key:**
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a new API key
   - Copy the API key

2. **Configure Environment:**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env and set:
   # AI_SERVICE_TYPE=gemini
   # GEMINI_API_KEY=your-api-key-here
   ```

### Option 2: Using Ollama (Local)

1. **Install Ollama and Pull Model:**
   ```bash
   # Install Ollama from https://ollama.ai
   # Then pull a model:
   ollama pull deepseek-coder
   
   # Or use other models:
   # ollama pull llama3
   # ollama pull mistral
   ```

2. **Verify Ollama is Running:**
   ```bash
   # Check if Ollama is running
   curl http://localhost:11434/api/tags
   
   # If not running, start Ollama service
   # On Linux/Mac: ollama serve
   # On Windows: Start Ollama from the application
   ```

3. **Configure Environment:**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env and set:
   # AI_SERVICE_TYPE=ollama
   ```

### 3. Install Dependencies

```bash
# Install all dependencies (root, backend, frontend)
npm run install:all

# Or install individually:
npm install
cd backend && npm install
cd ../frontend && npm install
```

### 4. Start the Application

**Terminal 1 - Backend:**
```bash
npm run dev:backend
# Server runs on http://localhost:5000
```

**Terminal 2 - Frontend:**
```bash
npm run dev:frontend
# Frontend runs on http://localhost:3000
```

### 6. Use the Application

1. Open http://localhost:3000 in your browser
2. Enter a project description, e.g.:
   - "Create a task manager web app with login and dashboard"
   - "Build a blog platform with user authentication"
   - "Generate a todo list application"
3. Click "Generate Project"
4. Wait for the AI agents to process your request
5. Once complete, find your project in `generated-projects/`

## Troubleshooting

### Gemini API Error

If you see "GEMINI_API_KEY is required":
- Ensure you've set `GEMINI_API_KEY` in `backend/.env`
- Verify your API key is valid at [Google AI Studio](https://makersuite.google.com/app/apikey)
- Check that `AI_SERVICE_TYPE=gemini` in your `.env` file

### Ollama Connection Error

If you see "Failed to connect to Ollama":
- Ensure Ollama is running: `ollama serve`
- Check the URL in `backend/.env`: `OLLAMA_BASE_URL=http://localhost:11434`
- Verify the model is available: `ollama list`
- Ensure `AI_SERVICE_TYPE=ollama` in your `.env` file

### Port Already in Use

If port 5000 or 3000 is already in use:
- Change `PORT` in `backend/.env`
- Change port in `frontend/vite.config.ts`

### Model Not Found

If you get model errors:
- Pull the model: `ollama pull deepseek-coder`
- Or change model in `backend/.env`: `OLLAMA_MODEL=your-model-name`

## Example Prompts

- "Create a task manager web app with login and dashboard"
- "Build a blog platform with user authentication and comments"
- "Generate a todo list application with categories"
- "Create a simple e-commerce site with product listings"
- "Build a note-taking app with markdown support"

## Generated Project Structure

Each generated project includes:
- `backend/` - Express API with TypeScript
- `frontend/` - React app with Vite
- `database/` - SQL schema files
- `README.md` - Setup instructions

## Next Steps

After generation:
1. Navigate to the generated project
2. Install dependencies: `cd backend && npm install`
3. Start backend: `npm run dev`
4. In another terminal: `cd frontend && npm install && npm run dev`
5. Open the app in your browser


