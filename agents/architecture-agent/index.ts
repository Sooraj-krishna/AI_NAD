import { AIService } from '../../backend/src/ai/ai-service-factory';
import { RequirementOutput, ArchitectureOutput, AgentResponse } from '../../backend/src/types';
import { Logger } from '../../backend/src/utils/logger';

export class ArchitectureAgent {
  private aiService: AIService;

  constructor(aiService: AIService) {
    this.aiService = aiService;
  }

  async process(requirements: RequirementOutput): Promise<AgentResponse<ArchitectureOutput>> {
    const MAX_RETRIES = 2;
    let attempt = 0;
    let lastError = '';

    while (attempt <= MAX_RETRIES) {
      try {
        Logger.pipelineStep('architecture_generated', { requirements, attempt });

        const systemPrompt = `You are an expert software architect.
Generate a comprehensive, scalable technical architecture.
You MUST output a single valid JSON object.

### Rules:
1. Group endpoints into controllers.
2. DATABASE: Use PostgreSQL (standard for AI-NAD).
3. DESIGN FIRST: Create a "design_system" with colors, typography, and effects.

### EXAMPLE:
{
  "architecture": { "frontend": "React", "backend": "Express", "database": "PostgreSQL" },
  "folder_structure": { "backend": ["controllers", "models", "routes"], "frontend": ["components", "pages"] },
  "api_endpoints": [{ "method": "GET", "path": "/api/users", "description": "Get users", "controller": "UserController" }],
  "services": ["UserService"],
  "workflows": [{ "name": "Login", "steps": ["Verify", "Token"] }],
  "design_system": {
    "colors": { "primary": "#6366f1", "secondary": "#a855f7", "background": "#0f172a", "surface": "rgba(30, 41, 59, 0.7)", "accent": "#22d3ee" },
    "typography": { "font_family": "Inter", "base_size": "16px" },
    "effects": { "glassmorphism": true, "border_radius": "1rem" }
  }
}`;

        const prompt = attempt === 0 
          ? `Based on these requirements: ${JSON.stringify(requirements, null, 2)}\n\nGenerate the complete technical architecture.`
          : `Your previous response was missing required fields: ${lastError}\n\nPlease generate the architecture again, ensuring "architecture", "folder_structure", and "api_endpoints" are ALL present and filled.\n\nRequirements: ${JSON.stringify(requirements, null, 2)}`;

        const result = await this.aiService.generateJSON<ArchitectureOutput>(prompt, systemPrompt);

        // Validate structure
        const missingFields = [];
        if (!result.architecture) missingFields.push('architecture');
        if (!result.folder_structure) missingFields.push('folder_structure');
        if (!result.api_endpoints) missingFields.push('api_endpoints');
        if (!result.services) missingFields.push('services');
        if (!result.workflows) missingFields.push('workflows');
        if (!result.design_system) missingFields.push('design_system');
        
        if (missingFields.length > 0) {
          throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }

        return {
          success: true,
          data: result
        };
      } catch (error) {
        attempt++;
        lastError = error instanceof Error ? error.message : 'Unknown error';
        Logger.warn(`Architecture Agent attempt ${attempt} failed: ${lastError}`);
        
        if (attempt > MAX_RETRIES) {
          Logger.error('Architecture Agent failed after all retries', error);
          return {
            success: false,
            error: lastError
          };
        }
      }
    }

    return { success: false, error: 'Max retries exceeded' };
  }
}


