"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntentAgent = void 0;
const logger_1 = require("../../backend/src/utils/logger");
class IntentAgent {
    constructor(aiService) {
        this.aiService = aiService;
    }
    async process(userPrompt) {
        try {
            logger_1.Logger.pipelineStep('intent_parsed', { prompt: userPrompt });
            const systemPrompt = `You are a senior software product manager and system analyst.
Analyze a user request and output BOTH the intent specification AND the system requirements in one response.
Return only valid JSON with this exact structure:

{
  "intent": {
    "project_type": "web app",
    "core_modules": ["module1", "module2"],
    "recommended_stack": { "frontend": "React", "backend": "Node.js", "database": "PostgreSQL" },
    "database": "PostgreSQL",
    "authentication": true,
    "api_requirements": ["REST API for users", "REST API for tasks"]
  },
  "requirements": {
    "services": ["AuthService", "TaskService"],
    "entities": [
      {
        "name": "User",
        "fields": [
          { "name": "id", "type": "uuid", "required": true },
          { "name": "email", "type": "string", "required": true }
        ]
      }
    ],
    "workflows": [
      { "name": "User Registration", "steps": ["validate input", "hash password", "save user"] }
    ]
  }
}`;
            const prompt = `User request: ${userPrompt}

Analyze this request and return BOTH:
1. The intent (project type, modules, stack, auth needs, API requirements)
2. The system requirements (services split, data entities with fields, business workflows)

Keep it concise but complete.`;
            const result = await this.aiService.generateJSON(prompt, systemPrompt);
            if (!result.intent?.project_type || !result.intent?.core_modules) {
                throw new Error('Invalid output: missing intent fields');
            }
            if (!result.requirements?.services || !result.requirements?.entities) {
                throw new Error('Invalid output: missing requirement fields');
            }
            return {
                success: true,
                data: result
            };
        }
        catch (error) {
            logger_1.Logger.error('Intent Agent error', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
}
exports.IntentAgent = IntentAgent;
