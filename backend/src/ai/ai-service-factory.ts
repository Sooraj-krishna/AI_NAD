import { OllamaService } from './ollama-service';
import { GeminiService } from './gemini-service';

export type AIServiceType = 'ollama' | 'gemini';

export interface AIService {
  generate(prompt: string, systemPrompt?: string): Promise<string>;
  generateJSON<T>(prompt: string, systemPrompt?: string): Promise<T>;
  setModel(model: string): void;
}

export class AIServiceFactory {
  static create(type: AIServiceType = 'gemini'): AIService {
    if (type === 'gemini') {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY is required when using Gemini. Please set it in your .env file.');
      }
      const model = process.env.GEMINI_MODEL;
      return new GeminiService(apiKey, model);
    } else {
      const model = process.env.OLLAMA_MODEL || 'deepseek-coder';
      const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
      return new OllamaService(model, baseUrl);
    }
  }
}
