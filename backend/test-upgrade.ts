
import { PipelineOrchestrator } from "./src/pipeline/orchestrator";
import { AIServiceFactory } from "./src/ai/ai-service-factory";
import { Logger } from "./src/utils/logger";
import * as dotenv from "dotenv";

dotenv.config();

async function testGeneration() {
  const aiServiceType = (process.env.AI_SERVICE_TYPE || "gemini") as any;
  const aiService = AIServiceFactory.create(aiServiceType);
  const orchestrator = new PipelineOrchestrator(aiService);

  const prompt = "Create a modern personal portfolio website with a terminal-like header, project gallery, and contact form. Use a dark theme with neon green accents and glassmorphism.";

  try {
    console.log("🚀 Starting test generation...");
    const context = await orchestrator.execute(prompt);
    console.log("✅ Generation completed!");
    console.log("📂 Project Path:", context.projectPath);
    
    // Check for design tokens in context
    if (context.architecture?.design_system) {
      console.log("🎨 Design System generated:", JSON.stringify(context.architecture.design_system, null, 2));
    } else {
      console.log("❌ Design System missing!");
    }

    // List generated files
    console.log("📄 Backend files:", context.code?.backend.length);
    console.log("📄 Frontend files:", context.code?.frontend.length);

  } catch (error) {
    console.error("❌ Generation failed:", error);
  }
}

testGeneration();
