"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequirementAgent = void 0;
const logger_1 = require("../../backend/src/utils/logger");
class RequirementAgent {
    constructor(aiService) {
        this.aiService = aiService;
    }
    async process(intent) {
        try {
            logger_1.Logger.pipelineStep('requirements_generated', { intent });
            const systemPrompt = `You are a system analyst.
Break this system into services, entities and workflows.
Return structured JSON.

Output format:
{
  "services": ["service-name-1", "service-name-2"],
  "entities": [
    {
      "name": "entity-name",
      "fields": [
        {"name": "field-name", "type": "string", "required": true}
      ]
    }
  ],
  "workflows": [
    {
      "name": "workflow-name",
      "steps": ["step1", "step2"]
    }
  ]
}`;
            const prompt = `Based on this project specification:
${JSON.stringify(intent, null, 2)}

Break down the system into:
1. Services (business logic modules)
2. Entities (data models)
3. Workflows (business processes)`;
            const result = await this.aiService.generateJSON(prompt, systemPrompt);
            // Validate structure
            if (!result.services || !result.entities) {
                throw new Error('Invalid requirement output: missing services or entities');
            }
            return {
                success: true,
                data: result
            };
        }
        catch (error) {
            logger_1.Logger.error('Requirement Agent error', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
}
exports.RequirementAgent = RequirementAgent;
