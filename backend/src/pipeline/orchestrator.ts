import { PipelineContext, FileContent } from '../types';
import { IntentAgent } from '../../../agents/intent-agent';
import { ArchitectureAgent } from '../../../agents/architecture-agent';
import { SecurityAgent } from '../../../agents/security-agent';
import { FirebaseAuthAgent } from '../../../agents/auth-agent';
import { CodeAgent } from '../../../agents/code-agent';
import { TestAgent } from '../../../agents/test-agent';
import { ValidationAgent } from '../../../agents/validation-agent';
import { ProjectBuilder } from '../services/project-builder';
import { Logger } from '../utils/logger';
import { AIService } from '../ai/ai-service-factory';

export class PipelineOrchestrator {
  private intentAgent: IntentAgent;
  private architectureAgent: ArchitectureAgent;
  private securityAgent: SecurityAgent;
  private authAgent: FirebaseAuthAgent;
  private codeAgent: CodeAgent;
  private testAgent: TestAgent;
  private validationAgent: ValidationAgent;
  private projectBuilder: ProjectBuilder;

  constructor(aiService: AIService) {
    this.intentAgent = new IntentAgent(aiService);
    this.architectureAgent = new ArchitectureAgent(aiService);
    this.securityAgent = new SecurityAgent(aiService);
    this.authAgent = new FirebaseAuthAgent(aiService);
    this.codeAgent = new CodeAgent(aiService);
    this.testAgent = new TestAgent(aiService);
    this.validationAgent = new ValidationAgent();
    this.projectBuilder = new ProjectBuilder();
  }

  async execute(userPrompt: string): Promise<PipelineContext> {
    const context: PipelineContext = { userPrompt };

    try {
      Logger.pipelineStep('pipeline_started', { userPrompt });

      // Step 1+2: Intent + Requirement
      Logger.pipelineStep('step_1_intent_agent');
      const intentResponse = await this.intentAgent.process(userPrompt);
      if (!intentResponse.success || !intentResponse.data) {
        throw new Error(`Intent Agent failed: ${intentResponse.error}`);
      }
      context.intent = intentResponse.data.intent;
      context.requirements = intentResponse.data.requirements;

      // Step 3: Architecture Agent
      Logger.pipelineStep('step_3_architecture_agent');
      const architectureResponse = await this.architectureAgent.process(context.requirements);
      if (!architectureResponse.success || !architectureResponse.data) {
        throw new Error(`Architecture Agent failed: ${architectureResponse.error}`);
      }
      context.architecture = architectureResponse.data;

      // Step 3b: Security Agent
      Logger.pipelineStep('step_3b_security_agent');
      const securityResponse = await this.securityAgent.process(context.intent, context.requirements, context.architecture);
      if (securityResponse.success && securityResponse.data) {
        context.architecture = securityResponse.data;
      }

      // Step 3c: Auth Agent (Firebase)
      Logger.pipelineStep('step_3c_auth_agent');
      const authResponse = await this.authAgent.process(context.intent, context.architecture);
      let authFiles: FileContent[] = [];
      if (authResponse.success && authResponse.data) {
        authFiles = authResponse.data;
      }

      // Step 4-6: Code Generation & Validation with Repair Loop
      Logger.pipelineStep('step_4_code_agent');
      let repairIteration = 0;
      const MAX_REPAIRS = 3;
      let isValid = false;

      while (repairIteration <= MAX_REPAIRS && !isValid) {
        if (repairIteration === 0) {
          const codeResponse = await this.codeAgent.process(context.architecture);
          if (!codeResponse.success || !codeResponse.data) {
            throw new Error(`Code Agent failed: ${codeResponse.error}`);
          }
          context.code = codeResponse.data;
          
          // Inject Auth files
          context.code.backend.push(...authFiles.filter(f => f.path.startsWith('backend')));
          context.code.frontend.push(...authFiles.filter(f => f.path.startsWith('frontend')));
          // Handle other files like FIREBASE_SETUP.md
          const otherFiles = authFiles.filter(f => !f.path.startsWith('backend') && !f.path.startsWith('frontend'));
          context.code.backend.push(...otherFiles); 
        } else {
          Logger.info(`🔄 Repair loop iteration ${repairIteration}/${MAX_REPAIRS}...`);
          const repairResponse = await this.codeAgent.repair(context.validation!.errors, context.code!, context.architecture!, context.userPrompt);
          if (!repairResponse.success || !repairResponse.data) {
            Logger.warn(`⚠️ Repair attempt ${repairIteration} failed, stopping repair loop.`);
            break;
          }
          context.code = repairResponse.data;
        }

        Logger.pipelineStep('code_generated', {
          backendFiles: context.code!.backend.length,
          frontendFiles: context.code!.frontend.length,
          iteration: repairIteration
        });

        // Step 6: Validation Agent
        Logger.pipelineStep('step_6_validation_agent');
        const projectPath = await this.projectBuilder.prepareProject(context);
        const validationResponse = await this.validationAgent.process(context.code!, projectPath);
        
        if (!validationResponse.success || !validationResponse.data) {
          Logger.warn('Validation Agent failed to run', validationResponse.error);
          break;
        }

        context.validation = validationResponse.data;
        isValid = context.validation.valid;

        Logger.pipelineStep('validation_completed', {
          valid: isValid,
          errors: context.validation.errors.length,
          iteration: repairIteration
        });

        if (!isValid) {
          repairIteration++;
        }
      }

      if (!isValid && repairIteration > MAX_REPAIRS) {
        Logger.warn('🚫 Reached maximum repair iterations. Proceeding with best-effort project.');
      }

      // Step 7: Build Project
      Logger.pipelineStep('step_7_project_builder');
      const finalProjectPath = await this.projectBuilder.buildProject(context);
      context.projectPath = finalProjectPath;
      Logger.pipelineStep('project_generated', { path: finalProjectPath });

      Logger.pipelineStep('pipeline_completed', { projectPath: finalProjectPath });
      return context;
    } catch (error) {
      Logger.error('Pipeline execution failed', error);
      throw error;
    }
  }
}
