# AI-NAD: Autonomous AI Software Factory

AI-NAD converts natural language intent into runnable applications using a multi-agent AI pipeline.

## Features

- **Multi-Agent Architecture**: Intent, Requirement, Architecture, Code, Test, and Validation agents
- **Local AI Models**: Uses Ollama for free, local AI model execution
- **Full Stack Generation**: Generates complete React frontend and Express backend
- **Automatic Testing**: Generates unit tests for generated code
- **Code Validation**: Validates generated code for syntax, security, and dependencies

## Prerequisites

1. **Node.js** (v18 or higher)
2. **Gemini API Key** (recommended) or **Ollama** installed and running
   
   **Option 1: Gemini API (Recommended)**
   - Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
   - No local installation required
   
   **Option 2: Ollama (Local)**
   ```bash
   # Install Ollama from https://ollama.ai
   # Pull a model (e.g., deepseek-coder)
   ollama pull deepseek-coder
   ```

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm run install:all
   ```

3. Configure environment variables:
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your API configuration
   # For Gemini: Set GEMINI_API_KEY=your-api-key
   # For Ollama: Set AI_SERVICE_TYPE=ollama and ensure Ollama is running
   ```

## Running the Application

### Development Mode

1. Start the backend:
   ```bash
   npm run dev:backend
   ```

2. In another terminal, start the frontend:
   ```bash
   npm run dev:frontend
   ```

3. Open http://localhost:3000 in your browser

## Usage

1. Enter a project description in the web interface
   - Example: "Create a task manager web app with login and dashboard"

2. Click "Generate Project"

3. Wait for the AI agents to process your request

4. Once complete, navigate to the generated project in `generated-projects/`

5. Follow the README in the generated project to run it

## Architecture

### Agents

- **Intent Agent**: Converts natural language to structured requirements
- **Requirement Agent**: Breaks down requirements into services and entities
- **Architecture Agent**: Designs system architecture and API structure
- **Code Agent**: Generates production-ready code
- **Test Agent**: Creates unit and integration tests
- **Validation Agent**: Validates code quality and security

### Pipeline Flow

```
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
Project Builder
   ↓
Generated Project
```

## Technology Stack

- **Backend**: Node.js, TypeScript, Express
- **Frontend**: React, Vite, TypeScript
- **AI**: Ollama (local models)
- **Database**: PostgreSQL (for generated projects)

## Configuration

Edit `backend/.env` to configure:

**For Gemini API (Recommended):**
- `AI_SERVICE_TYPE`: Set to `gemini`
- `GEMINI_API_KEY`: Your Gemini API key from Google AI Studio
- `GEMINI_MODEL`: Model to use (default: gemini-1.5-flash)

**For Ollama (Local):**
- `AI_SERVICE_TYPE`: Set to `ollama`
- `OLLAMA_BASE_URL`: Ollama API URL (default: http://localhost:11434)
- `OLLAMA_MODEL`: Model to use (default: deepseek-coder)

**General:**
- `PORT`: Backend server port (default: 5000)

## Generated Projects

All generated projects are stored in `generated-projects/` directory. Each project includes:
- Complete backend with Express API
- React frontend with Vite
- Database schema
- Tests
- README with setup instructions

## Security

The system includes:
- Prompt injection protection
- Code security validation
- Dependency vulnerability checks

## License

MIT


