import { AIService } from '../../backend/src/ai/ai-service-factory';
import { RequirementOutput, ArchitectureOutput, AgentResponse } from '../../backend/src/types';
import { Logger } from '../../backend/src/utils/logger';

export class ArchitectureAgent {
  private aiService: AIService;

  constructor(aiService: AIService) {
    this.aiService = aiService;
  }

  async process(requirements: RequirementOutput): Promise<AgentResponse<ArchitectureOutput>> {
    try {
      Logger.pipelineStep('architecture_generated', { requirements });

      const systemPrompt = `You are a senior software architect.
Generate scalable architecture for the following specification.
Return structured JSON.

### Route Classification Rules:
- Group related endpoints into logical controllers (e.g., all user-related routes under 'UserController').
- Use RESTful naming conventions for paths.
- Ensure each endpoint has a specific controller assigned.

Output format:
{
  "architecture": {
    "frontend": "React",
    "backend": "Node.js + Express",
    "database": "Postgres/Firebase"
  },
  "folder_structure": {
    "backend": ["src/controllers", "src/routes", "src/services", "src/models"],
    "frontend": ["src/components", "src/pages", "src/hooks", "src/utils"]
  },
  "api_endpoints": [
    {
      "method": "GET",
      "path": "/api/users",
      "description": "Get all users",
      "controller": "UserController"
    }
  ],
  "database_schema": {
    "tables": [
      {
        "name": "users",
        "columns": [
          {"name": "id", "type": "uuid", "constraints": ["PRIMARY KEY"]},
          {"name": "email", "type": "varchar(255)", "constraints": ["NOT NULL", "UNIQUE"]}
        ]
      }
    ]
  }
}`;

      const prompt = `Based on these requirements:
${JSON.stringify(requirements, null, 2)}

Generate:
1. System architecture (frontend, backend, database). 
   NOTE: if the user requested "Strong Auth" or "Firebase Auth", set database to "PostgreSQL + Firebase" and include "Firebase" in architecture.
2. Folder structure for backend and frontend.
3. API endpoints logically grouped into CONTROLLERS.
4. Database schema for core data.`;

      const result = await this.aiService.generateJSON<ArchitectureOutput>(prompt, systemPrompt);

      // Validate structure
      if (!result.architecture || !result.folder_structure || !result.api_endpoints) {
        throw new Error('Invalid architecture output: missing required fields');
      }

      return {
        success: true,
        data: result
      };
    } catch (error) {
      Logger.error('Architecture Agent error', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}


