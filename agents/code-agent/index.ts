import { AIService } from '../../backend/src/ai/ai-service-factory';
import { ArchitectureOutput, CodeOutput, FileContent, AgentResponse } from '../../backend/src/types';
import { Logger } from '../../backend/src/utils/logger';
import { z } from 'zod';

// Define a strict schema for the expected file output
const FileContentSchema = z.object({
  path: z.string().min(1, "File path cannot be empty"),
  content: z.string().min(1, "File content cannot be empty")
});
const FileArraySchema = z.array(FileContentSchema);

export class CodeAgent {
  private aiService: AIService;

  constructor(aiService: AIService) {
    this.aiService = aiService;
  }

  async process(architecture: ArchitectureOutput): Promise<AgentResponse<CodeOutput>> {
    try {
      Logger.pipelineStep('code_generated', { architecture });

      // --- DECOMPOSED GENERATION ---
      // 1. Generate Models/Entities
      Logger.info('🚀 Step 4a: Generating Models...');
      const models = await this.generateModels(architecture);

      // 2. Generate Services (referencing Models)
      Logger.info('🚀 Step 4b: Generating Services...');
      const services = await this.generateServices(architecture, models);

      // 3. Generate Controllers (referencing Services)
      Logger.info('🚀 Step 4c: Generating Controllers...');
      const controllers = await this.generateControllers(architecture, services);

      // 4. Generate Routes (referencing Controllers)
      Logger.info('🚀 Step 4d: Generating Routes...');
      const routes = await this.generateRoutes(architecture, controllers);

      // 5. Generate Frontend (referencing API)
      Logger.info('🚀 Step 4e: Generating Frontend...');
      const frontendFiles = await this.generateFrontend(architecture);

      const backendFiles = [...models, ...services, ...controllers, ...routes];

      Logger.info(`✅ Decomposed code generation complete: ${backendFiles.length} backend files, ${frontendFiles.length} frontend files`);

      return {
        success: true,
        data: { backend: backendFiles, frontend: frontendFiles }
      };
    } catch (error) {
      Logger.error('Code Agent error', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Repairs existing code based on validation errors.
   */
  async repair(errors: any[], currentCode: CodeOutput, architecture: ArchitectureOutput, userPrompt: string): Promise<AgentResponse<CodeOutput>> {
    try {
      Logger.info(`🔧 Repairing code based on ${errors.length} validation errors...`);

      const systemPrompt = `You are an expert developer. You are provided with existing code, a list of validation errors, and the original user intent.
Your task is to fix these errors and return the REPAIRED files.
Return ONLY a JSON array of the files that were modified:

[
  { "path": "src/controllers/UserController.ts", "content": "// repaired code" }
]`;

      const prompt = `Original User Intent:
${userPrompt}

Validation Errors:
${JSON.stringify(errors, null, 2)}

Current Architecture:
${JSON.stringify(architecture, null, 2)}

Current Code (relevant files):
${JSON.stringify(currentCode, null, 2)} // Using full code for better context

Please fix the errors and return the corrected files in a JSON array.`;

      const responseText = await this.aiService.generate(prompt, systemPrompt);
      const repairedFiles = this.parseFileArray(responseText, 'repair');

      // Merge repaired files back into the context
      const newBackend = [...currentCode.backend];
      const newFrontend = [...currentCode.frontend];

      for (const repaired of repairedFiles) {
        let found = false;
        // Try to update in backend
        for (let i = 0; i < newBackend.length; i++) {
          if (newBackend[i].path === repaired.path) {
            newBackend[i] = repaired;
            found = true;
            break;
          }
        }
        if (found) continue;
        // Try to update in frontend
        for (let i = 0; i < newFrontend.length; i++) {
          if (newFrontend[i].path === repaired.path) {
            newFrontend[i] = repaired;
            found = true;
            break;
          }
        }
        if (!found) {
            // New file? Add to backend by default unless path hints frontend
            if (repaired.path.includes('frontend') || repaired.path.includes('src/components')) {
                newFrontend.push(repaired);
            } else {
                newBackend.push(repaired);
            }
        }
      }

      return {
        success: true,
        data: { backend: newBackend, frontend: newFrontend }
      };
    } catch (error) {
      Logger.error('Code Agent repair error', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async generateModels(architecture: ArchitectureOutput): Promise<FileContent[]> {
    const systemPrompt = `You are a senior backend architect. Generate TypeScript interfaces/models for the following database schema.
    MUST RETURN ONLY A JSON ARRAY OF OBJECTS WITH 'path' AND 'content' PROPERTIES.
    Example: [{"path": "src/models/user.model.ts", "content": "export interface User {}"}]`;
    const prompt = `Generate model files for: ${JSON.stringify(architecture.database_schema.tables, null, 2)}`;
    const responseText = await this.aiService.generate(prompt, systemPrompt);
    return this.parseFileArray(responseText, 'models');
  }

  private async generateServices(architecture: ArchitectureOutput, models: FileContent[]): Promise<FileContent[]> {
    const systemPrompt = `You are a senior backend developer. Generate services implementing business logic for the following architecture and models.
    MUST RETURN ONLY A JSON ARRAY OF OBJECTS WITH 'path' AND 'content' PROPERTIES.
    Example: [{"path": "src/services/user.service.ts", "content": "export class UserService {}"}]`;
    const prompt = `Architecture: ${JSON.stringify(architecture, null, 2)}\nModels: ${JSON.stringify(models, null, 2)}`;
    const responseText = await this.aiService.generate(prompt, systemPrompt);
    return this.parseFileArray(responseText, 'services');
  }

  private async generateControllers(architecture: ArchitectureOutput, services: FileContent[]): Promise<FileContent[]> {
    const systemPrompt = `You are a senior backend developer. Generate controllers with Express routes based on these services.
    MUST RETURN ONLY A JSON ARRAY OF OBJECTS WITH 'path' AND 'content' PROPERTIES. DO NOT RETURN A SINGLE INDEX FILE IF MULTIPLE CONTROLLERS ARE APPROPRIATE.
    Example: [{"path": "src/controllers/user.controller.ts", "content": "export class UserController {}"}]`;
    const prompt = `Endpoints: ${JSON.stringify(architecture.api_endpoints, null, 2)}\nServices: ${JSON.stringify(services, null, 2)}`;
    const responseText = await this.aiService.generate(prompt, systemPrompt);
    return this.parseFileArray(responseText, 'controllers');
  }

  async generateRoutes(architecture: ArchitectureOutput, controllers: FileContent[]): Promise<FileContent[]> {
    const systemPrompt = `You are a senior backend developer. Generate the main router file (src/routes/index.ts) that connects all controllers to their paths.
    MUST RETURN ONLY A JSON ARRAY OF OBJECTS WITH 'path' AND 'content' PROPERTIES.
    Example: [{"path": "src/routes/index.ts", "content": "import { Router } from 'express';"}]`;
    const prompt = `Architecture: ${JSON.stringify(architecture, null, 2)}\nControllers: ${JSON.stringify(controllers, null, 2)}`;
    const responseText = await this.aiService.generate(prompt, systemPrompt);
    return this.parseFileArray(responseText, 'routes');
  }

  private async generateFrontend(architecture: ArchitectureOutput): Promise<FileContent[]> {
    // Keep existing frontend generation logic but wrap it
    const systemPrompt = `You are an expert React/TypeScript frontend developer. Generate frontend files.
    MUST RETURN ONLY A JSON ARRAY OF OBJECTS WITH 'path' AND 'content' PROPERTIES. DO NOT RETURN A SINGLE APP.TSX FILE IF MULTIPLE COMPONENTS ARE APPROPRIATE.
    Example: [{"path": "src/components/Button.tsx", "content": "export const Button = () => <button/>"}]`;
    const prompt = `Architecture: ${JSON.stringify(architecture, null, 2)}`;
    const responseText = await this.aiService.generate(prompt, systemPrompt);
    return this.parseFileArray(responseText, 'frontend');
  }

  private parseFileArray(text: string, label: string): FileContent[] {
    try {
      // Improved cleaning: find the first '[' and last ']'
      let cleaned = text.trim();
      const firstBracket = cleaned.indexOf('[');
      const lastBracket = cleaned.lastIndexOf(']');
      
      if (firstBracket !== -1 && lastBracket !== -1) {
        cleaned = cleaned.substring(firstBracket, lastBracket + 1);
      }

      // Strip markdown code fences if still present inside or around
      cleaned = cleaned
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      const rawParsed = JSON.parse(cleaned);
      if (!Array.isArray(rawParsed)) {
        throw new Error('Expected a JSON array');
      }

      // Validate using Zod - this throws a detailed error if the schema doesn't match
      const validatedFiles = FileArraySchema.parse(rawParsed);

      // Ensure paths are correct and content is present
      return validatedFiles.map(f => {
        // If the path was dumped as just a filename, prepend the expected directory
        if (!f.path.includes('/')) {
            f.path = `src/${label}/${f.path.endsWith('.ts') || f.path.endsWith('.tsx') ? f.path : f.path + '.ts'}`;
        }
        return f;
      }).filter((f): f is FileContent => Boolean(f.path && f.content));
    } catch (err) {
      Logger.warn(`⚠️ Could not parse ${label} file array. This indicates a hallucination in the AI response format. Returning empty array to force pipeline failure or repair.`, err);
      // Fallback: Return empty array, which should trigger the validation/repair loop instead of creating broken files.
      // Or we can throw an error to immediately stop exactly what's failing.
      throw new Error(`Failed to parse AI response as JSON array for ${label}. Raw output was malformed.`);
    }
  }
}
