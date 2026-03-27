"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OllamaService = void 0;
class OllamaService {
    constructor(model = 'deepseek-coder', baseUrl = 'http://localhost:11434') {
        this.model = model;
        this.baseUrl = baseUrl;
    }
    async generate(prompt, systemPrompt) {
        try {
            const messages = [];
            if (systemPrompt) {
                messages.push({
                    role: 'system',
                    content: systemPrompt
                });
            }
            messages.push({
                role: 'user',
                content: prompt
            });
            const response = await fetch(`${this.baseUrl}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: messages,
                    stream: false
                })
            });
            if (!response.ok) {
                throw new Error(`Ollama API error: ${response.statusText}`);
            }
            const data = await response.json();
            return data.message.content;
        }
        catch (error) {
            console.error('Ollama service error:', error);
            throw new Error(`Failed to generate response: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async generateJSON(prompt, systemPrompt) {
        const response = await this.generate(`${prompt}\n\nReturn only valid JSON, no markdown formatting, no code blocks.`, systemPrompt);
        try {
            // Remove markdown code blocks if present
            const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            return JSON.parse(cleaned);
        }
        catch (error) {
            console.error('JSON parsing error:', error);
            console.error('Response:', response);
            throw new Error(`Failed to parse JSON response: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    setModel(model) {
        this.model = model;
    }
}
exports.OllamaService = OllamaService;
