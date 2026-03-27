"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.pipelineService = void 0;
const orchestrator_1 = require("../pipeline/orchestrator");
const ai_service_factory_1 = require("../ai/ai-service-factory");
const logger_1 = require("../utils/logger");
const crypto = __importStar(require("crypto"));
class PipelineService {
    constructor() {
        this.generations = new Map();
        this.orchestrator = null;
    }
    getOrchestrator() {
        if (!this.orchestrator) {
            const aiServiceType = (process.env.AI_SERVICE_TYPE || "gemini");
            const aiService = ai_service_factory_1.AIServiceFactory.create(aiServiceType);
            this.orchestrator = new orchestrator_1.PipelineOrchestrator(aiService);
        }
        return this.orchestrator;
    }
    async startGeneration(prompt) {
        const id = crypto.randomUUID();
        const status = {
            id,
            status: "pending",
            progress: "Initializing...",
        };
        this.generations.set(id, status);
        // Execute pipeline asynchronously
        this.executePipeline(id, prompt).catch((error) => {
            logger_1.Logger.error("Pipeline execution error", error);
            const currentStatus = this.generations.get(id);
            if (currentStatus) {
                currentStatus.status = "failed";
                currentStatus.error =
                    error instanceof Error ? error.message : "Unknown error";
            }
        });
        return id;
    }
    async executePipeline(id, prompt) {
        const status = this.generations.get(id);
        if (!status)
            return;
        const steps = [
            { name: "Intent Agent", status: "pending" },
            { name: "Requirement Agent", status: "pending" },
            { name: "Architecture Agent", status: "pending" },
            { name: "Security Agent", status: "pending" },
            { name: "Code Agent", status: "pending" },
            { name: "Test Agent", status: "pending" },
            { name: "Validation Agent", status: "pending" },
            { name: "Project Builder", status: "pending" },
        ];
        status.steps = steps;
        status.totalSteps = steps.length;
        // Track progress through pipeline steps
        const stepMap = {
            step_1_intent_agent: 0,
            step_2_requirement_agent: 1,
            step_3_architecture_agent: 2,
            step_3b_security_agent: 3,
            step_4_code_agent: 4,
            step_5_test_agent: 5,
            step_6_validation_agent: 6,
            step_7_project_builder: 7,
        };
        const stepNames = [
            "Intent Agent",
            "Requirement Agent",
            "Architecture Agent",
            "Security Agent",
            "Code Agent",
            "Test Agent",
            "Validation Agent",
            "Project Builder",
        ];
        const messages = {
            0: "Analyzing your project requirements...",
            1: "Breaking down into services and entities...",
            2: "Designing system architecture...",
            3: "Applying advanced security protocols...",
            4: "Generating code files...",
            5: "Creating test files...",
            6: "Validating generated code...",
            7: "Building project structure...",
        };
        // Intercept Logger calls to update progress
        const originalPipelineStep = logger_1.Logger.pipelineStep;
        logger_1.Logger.pipelineStep = (step, data) => {
            originalPipelineStep.call(logger_1.Logger, step, data);
            const stepIndex = stepMap[step];
            if (stepIndex !== undefined && status.steps) {
                // Mark previous step as completed
                if (stepIndex > 0 && status.steps[stepIndex - 1]) {
                    status.steps[stepIndex - 1].status = "completed";
                }
                // Mark current step as processing
                if (status.steps[stepIndex]) {
                    status.steps[stepIndex].status = "processing";
                    status.stepNumber = stepIndex;
                    status.currentStep = stepNames[stepIndex];
                    status.progress =
                        messages[stepIndex] || `Running ${stepNames[stepIndex]}...`;
                }
            }
        };
        try {
            status.status = "processing";
            status.stepNumber = 0;
            status.currentStep = steps[0].name;
            status.progress = messages[0] || `Starting ${steps[0].name}...`;
            const context = await this.getOrchestrator().execute(prompt);
            // Mark all steps as completed
            steps.forEach((step) => {
                step.status = "completed";
            });
            status.status = "completed";
            status.stepNumber = steps.length;
            status.currentStep = "Complete";
            status.progress = "Project generated successfully";
            status.context = context;
        }
        catch (error) {
            status.status = "failed";
            status.error = error instanceof Error ? error.message : "Unknown error";
            // Mark current step as failed
            if (status.stepNumber !== undefined && status.steps) {
                const currentStep = status.steps[status.stepNumber];
                if (currentStep) {
                    currentStep.status = "failed";
                    currentStep.message = status.error;
                }
            }
            logger_1.Logger.error("Pipeline execution failed", error);
        }
        finally {
            // Restore original logger
            logger_1.Logger.pipelineStep = originalPipelineStep;
        }
    }
    getStatus(id) {
        return this.generations.get(id) || null;
    }
    async listProjects() {
        const projects = [];
        for (const [id, status] of this.generations.entries()) {
            if (status.status === "completed" && status.context?.projectPath) {
                projects.push(status.context.projectPath);
            }
        }
        return projects;
    }
}
exports.pipelineService = new PipelineService();
