import { PipelineOrchestrator } from "../pipeline/orchestrator";
import { AIServiceFactory, AIServiceType } from "../ai/ai-service-factory";
import { PipelineContext } from "../types";
import { Logger } from "../utils/logger";
import * as crypto from "crypto";

interface GenerationStatus {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress?: string;
  currentStep?: string;
  stepNumber?: number;
  totalSteps?: number;
  steps?: Array<{
    name: string;
    status: "pending" | "processing" | "completed" | "failed";
    message?: string;
  }>;
  context?: PipelineContext;
  error?: string;
}

class PipelineService {
  private generations: Map<string, GenerationStatus> = new Map();
  private orchestrator: PipelineOrchestrator | null = null;

  private getOrchestrator(): PipelineOrchestrator {
    if (!this.orchestrator) {
      const aiServiceType = (process.env.AI_SERVICE_TYPE || "gemini") as AIServiceType;
      const aiService = AIServiceFactory.create(aiServiceType);
      this.orchestrator = new PipelineOrchestrator(aiService);
    }
    return this.orchestrator;
  }

  async startGeneration(prompt: string): Promise<string> {
    const id = crypto.randomUUID();

    const status: GenerationStatus = {
      id,
      status: "pending",
      progress: "Initializing...",
    };

    this.generations.set(id, status);

    // Execute pipeline asynchronously
    this.executePipeline(id, prompt).catch((error) => {
      Logger.error("Pipeline execution error", error);
      const currentStatus = this.generations.get(id);
      if (currentStatus) {
        currentStatus.status = "failed";
        currentStatus.error =
          error instanceof Error ? error.message : "Unknown error";
      }
    });

    return id;
  }

  private async executePipeline(id: string, prompt: string): Promise<void> {
    const status = this.generations.get(id);
    if (!status) return;

    const steps: Array<{
      name: string;
      status: "pending" | "processing" | "completed" | "failed";
      message?: string;
    }> = [
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
    const stepMap: Record<string, number> = {
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

    const messages: Record<number, string> = {
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
    const originalPipelineStep = Logger.pipelineStep;
    Logger.pipelineStep = (step: string, data?: any) => {
      originalPipelineStep.call(Logger, step, data);

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
    } catch (error) {
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

      Logger.error("Pipeline execution failed", error);
    } finally {
      // Restore original logger
      Logger.pipelineStep = originalPipelineStep;
    }
  }

  getStatus(id: string): GenerationStatus | null {
    return this.generations.get(id) || null;
  }

  async listProjects(): Promise<string[]> {
    const projects: string[] = [];
    for (const [id, status] of this.generations.entries()) {
      if (status.status === "completed" && status.context?.projectPath) {
        projects.push(status.context.projectPath);
      }
    }
    return projects;
  }
}

export const pipelineService = new PipelineService();
