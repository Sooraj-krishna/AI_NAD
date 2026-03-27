import { AIService } from '../../backend/src/ai/ai-service-factory';
import { ArchitectureOutput, FileContent, AgentResponse, IntentOutput } from '../../backend/src/types';
import { Logger } from '../../backend/src/utils/logger';

export class FirebaseAuthAgent {
  private aiService: AIService;

  constructor(aiService: AIService) {
    this.aiService = aiService;
  }

  async process(intent: IntentOutput, architecture: ArchitectureOutput): Promise<AgentResponse<FileContent[]>> {
    try {
      if (!intent.authentication || !architecture.architecture.database.includes('Firebase')) {
        return { success: true, data: [] };
      }

      Logger.info('🚀 Generating Firebase Authentication implementation...');

      const systemPrompt = `You are a security expert and expert full-stack developer.
Generate production-ready Firebase Authentication implementation for both backend (Node.js) and frontend (React).

You must generate:
1. Backend: A middleware/service to verify Firebase ID tokens using 'firebase-admin'.
2. Frontend: Firebase initialization and an AuthContext/Hook for 'firebase/auth'.
3. A detailed 'FIREBASE_SETUP.md' guide for the user to get their credentials and set up environment variables.

Return ONLY a JSON array of files:
[
  { "path": "backend/src/services/FirebaseAuthService.ts", "content": "..." },
  { "path": "frontend/src/config/firebase.ts", "content": "..." },
  { "path": "FIREBASE_SETUP.md", "content": "..." }
]`;

      const prompt = `Intent: ${JSON.stringify(intent, null, 2)}
Architecture: ${JSON.stringify(architecture.architecture, null, 2)}

Generate the Firebase Auth implementation. 
Ensure the backend middleware correctly protects routes by verifying the Authorization header (Bearer token).
Ensure the frontend provider handles login, logout, and persistent auth state.`;

      const result = await this.aiService.generate(prompt, systemPrompt);
      const files = this.parseFileArray(result);

      return {
        success: true,
        data: files
      };
    } catch (error) {
      Logger.error('Firebase Auth Agent error', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private parseFileArray(text: string): FileContent[] {
    try {
      let cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
      if (arrayMatch) cleaned = arrayMatch[0];
      const parsed = JSON.parse(cleaned);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      Logger.warn('⚠️ Could not parse Firebase Auth file array');
      return [];
    }
  }
}
