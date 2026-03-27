"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIServiceFactory = void 0;
const ollama_service_1 = require("./ollama-service");
const gemini_service_1 = require("./gemini-service");
class AIServiceFactory {
    static create(type = 'gemini') {
        if (type === 'gemini') {
            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) {
                throw new Error('GEMINI_API_KEY is required when using Gemini. Please set it in your .env file.');
            }
            // If GEMINI_MODEL is explicitly set, use it; otherwise let GeminiService auto-detect
            const model = process.env.GEMINI_MODEL;
            return new gemini_service_1.GeminiService(apiKey, model);
        }
        else {
            const model = process.env.OLLAMA_MODEL || 'deepseek-coder';
            const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
            return new ollama_service_1.OllamaService(model, baseUrl);
        }
    }
}
exports.AIServiceFactory = AIServiceFactory;
