"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OllamaService = void 0;
class OllamaService {
    constructor(model = 'qwen2.5:3b', baseUrl = 'http://localhost:11434') {
        this.model = model;
        this.baseUrl = baseUrl;
    }
    async generate(prompt, systemPrompt) {
        try {
            if (this.model.includes('phi3') || this.model.includes('gemma2')) {
                console.warn("⚠️ WARNING: Consider switching to OLLAMA_MODEL=qwen2.5:3b for better JSON accuracy and code generation.");
            }
            console.log("🤖 Using model:", this.model);
            const messages = [];
            if (systemPrompt) {
                messages.push({ role: "system", content: systemPrompt });
            }
            messages.push({ role: "user", content: prompt });
            console.log("🧠 Prompt size:", prompt.length);
            console.log("🧠 Sending to Ollama...");
            console.log("📝 Preview:", prompt.slice(0, 200));
            const body = {
                model: this.model,
                messages: messages,
                stream: false,
                options: {
                    temperature: 0,
                    num_ctx: 4096,
                    repeat_penalty: 1.1
                }
            };
            if (prompt.toLowerCase().includes('json') || (systemPrompt && systemPrompt.toLowerCase().includes('json'))) {
                body.format = 'json';
            }
            const response = await fetch(`${this.baseUrl}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (!response.ok) {
                const text = await response.text();
                console.error("❌ Ollama raw error:", text);
                throw new Error(`Ollama API error: ${response.statusText}`);
            }
            const data = await response.json();
            if (!data?.message?.content) {
                console.error("❌ Invalid response:", data);
                throw new Error("Invalid Ollama response format");
            }
            return data.message.content;
        }
        catch (error) {
            console.error('Ollama service error:', error);
            throw new Error(`Failed to generate response: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async generateJSON(prompt, systemPrompt) {
        const enhancedPrompt = `${prompt}\n\nSTRICT RULES:\n- Output MUST be valid JSON\n- Use ONLY double quotes\n- No comments (# or //)\n- No trailing commas\n- No explanations\n- No markdown\n- No text outside JSON`;
        const response = await this.generate(enhancedPrompt, systemPrompt);
        let cleaned = '';
        try {
            cleaned = response
                .replace(/```json\s*/gi, '')
                .replace(/```\s*/g, '')
                .trim();
            cleaned = this.extractJSON(cleaned);
            cleaned = this.sanitizeJSON(cleaned);
            return JSON.parse(cleaned);
        }
        catch (error) {
            console.error('❌ JSON parsing error:', error);
            console.error('🔴 RAW RESPONSE:\n', response);
            console.error('🟡 CLEANED RESPONSE:\n', cleaned);
            throw new Error(`Failed to parse JSON response: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    extractJSON(text) {
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start === -1 || end === -1 || end <= start) {
            throw new Error('No valid JSON found in response');
        }
        return text.substring(start, end + 1);
    }
    extractJSONArray(text) {
        const start = text.indexOf('[');
        const end = text.lastIndexOf(']');
        if (start === -1 || end === -1 || end <= start) {
            throw new Error('No valid JSON array found');
        }
        return text.substring(start, end + 1);
    }
    sanitizeJSON(text) {
        return text
            .replace(/\/\/.*$/gm, '')
            .replace(/#.*$/gm, '')
            .replace(/\u201c|\u201d/g, '"')
            .replace(/\u00ab|\u00bb/g, '"')
            .replace(/,\s*}/g, '}')
            .replace(/,\s*]/g, ']')
            .replace(/\s+/g, ' ')
            .replace(/[^\x20-\x7E\n\r\t]+/g, '')
            .trim();
    }
    setModel(model) {
        this.model = model;
    }
}
exports.OllamaService = OllamaService;

