import { AIService } from '../../backend/src/ai/ai-service-factory';
import { IntentOutput, RequirementOutput, AgentResponse } from '../../backend/src/types';
import { Logger } from '../../backend/src/utils/logger';

export class RequirementAgent {
  private aiService: AIService;

  constructor(aiService: AIService) {
    this.aiService = aiService;
  }

  async process(intent: IntentOutput): Promise<AgentResponse<RequirementOutput>> {
    try {
      Logger.pipelineStep('requirements_generated', { intent });

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

      const result = await this.aiService.generateJSON<RequirementOutput>(prompt, systemPrompt);

      // Validate structure
      if (!result.services || !result.entities) {
        throw new Error('Invalid requirement output: missing services or entities');
      }

      return {
        success: true,
        data: result
      };
    } catch (error) {
      Logger.error('Requirement Agent error', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}


