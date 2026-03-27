"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PipelineOrchestrator = void 0;
const intent_agent_1 = require("../../../agents/intent-agent");
const architecture_agent_1 = require("../../../agents/architecture-agent");
const security_agent_1 = require("../../../agents/security-agent");
const auth_agent_1 = require("../../../agents/auth-agent");
const code_agent_1 = require("../../../agents/code-agent");
const test_agent_1 = require("../../../agents/test-agent");
const validation_agent_1 = require("../../../agents/validation-agent");
const project_builder_1 = require("../services/project-builder");
const logger_1 = require("../utils/logger");
class PipelineOrchestrator {
    constructor(aiService) {
        this.intentAgent = new intent_agent_1.IntentAgent(aiService);
        this.architectureAgent = new architecture_agent_1.ArchitectureAgent(aiService);
        this.securityAgent = new security_agent_1.SecurityAgent(aiService);
        this.authAgent = new auth_agent_1.FirebaseAuthAgent(aiService);
        this.codeAgent = new code_agent_1.CodeAgent(aiService);
        this.testAgent = new test_agent_1.TestAgent(aiService);
        this.validationAgent = new validation_agent_1.ValidationAgent();
        this.projectBuilder = new project_builder_1.ProjectBuilder();
    }
    async execute(userPrompt) {
        const context = { userPrompt };
        try {
            logger_1.Logger.pipelineStep('pipeline_started', { userPrompt });
            // Step 1+2: Intent + Requirement
            logger_1.Logger.pipelineStep('step_1_intent_agent');
            const intentResponse = await this.intentAgent.process(userPrompt);
            if (!intentResponse.success || !intentResponse.data) {
                throw new Error(`Intent Agent failed: ${intentResponse.error}`);
            }
            context.intent = intentResponse.data.intent;
            context.requirements = intentResponse.data.requirements;
            // Step 3: Architecture Agent
            logger_1.Logger.pipelineStep('step_3_architecture_agent');
            const architectureResponse = await this.architectureAgent.process(context.requirements);
            if (!architectureResponse.success || !architectureResponse.data) {
                throw new Error(`Architecture Agent failed: ${architectureResponse.error}`);
            }
            context.architecture = architectureResponse.data;
            // Step 3b: Security Agent
            logger_1.Logger.pipelineStep('step_3b_security_agent');
            const securityResponse = await this.securityAgent.process(context.intent, context.requirements, context.architecture);
            if (securityResponse.success && securityResponse.data) {
                context.architecture = securityResponse.data;
            }
            // Step 3c: Auth Agent (Firebase)
            logger_1.Logger.pipelineStep('step_3c_auth_agent');
            const authResponse = await this.authAgent.process(context.intent, context.architecture);
            let authFiles = [];
            if (authResponse.success && authResponse.data) {
                authFiles = authResponse.data;
            }
            // Step 4-6: Code Generation & Validation with Repair Loop
            logger_1.Logger.pipelineStep('step_4_code_agent');
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
                }
                else {
                    logger_1.Logger.info(`🔄 Repair loop iteration ${repairIteration}/${MAX_REPAIRS}...`);
                    const repairResponse = await this.codeAgent.repair(context.validation.errors, context.code, context.architecture, context.userPrompt);
                    if (!repairResponse.success || !repairResponse.data) {
                        logger_1.Logger.warn(`⚠️ Repair attempt ${repairIteration} failed, stopping repair loop.`);
                        break;
                    }
                    context.code = repairResponse.data;
                }
                logger_1.Logger.pipelineStep('code_generated', {
                    backendFiles: context.code.backend.length,
                    frontendFiles: context.code.frontend.length,
                    iteration: repairIteration
                });
                // Step 6: Validation Agent
                logger_1.Logger.pipelineStep('step_6_validation_agent');
                const projectPath = await this.projectBuilder.prepareProject(context);
                const validationResponse = await this.validationAgent.process(context.code, projectPath);
                if (!validationResponse.success || !validationResponse.data) {
                    logger_1.Logger.warn('Validation Agent failed to run', validationResponse.error);
                    break;
                }
                context.validation = validationResponse.data;
                isValid = context.validation.valid;
                logger_1.Logger.pipelineStep('validation_completed', {
                    valid: isValid,
                    errors: context.validation.errors.length,
                    iteration: repairIteration
                });
                if (!isValid) {
                    repairIteration++;
                }
            }
            if (!isValid && repairIteration > MAX_REPAIRS) {
                logger_1.Logger.warn('🚫 Reached maximum repair iterations. Proceeding with best-effort project.');
            }
            // Step 7: Build Project
            logger_1.Logger.pipelineStep('step_7_project_builder');
            const finalProjectPath = await this.projectBuilder.buildProject(context);
            context.projectPath = finalProjectPath;
            logger_1.Logger.pipelineStep('project_generated', { path: finalProjectPath });
            logger_1.Logger.pipelineStep('pipeline_completed', { projectPath: finalProjectPath });
            return context;
        }
        catch (error) {
            logger_1.Logger.error('Pipeline execution failed', error);
            throw error;
        }
    }
}
exports.PipelineOrchestrator = PipelineOrchestrator;
