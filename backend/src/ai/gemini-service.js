"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiService = void 0;
const generative_ai_1 = require("@google/generative-ai");
const gemini_model_finder_1 = require("./gemini-model-finder");

class RequestQueue {
    constructor(minTimeBetweenRequestsMs) {
        this.queue = [];
        this.isProcessing = false;
        this.lastRequestTime = 0;
        this.minTimeBetweenRequestsMs = minTimeBetweenRequestsMs;
    }
    async enqueue(task) {
        return new Promise((resolve, reject) => {
            this.queue.push(async () => {
                try {
                    const now = Date.now();
                    const timeSinceLast = now - this.lastRequestTime;
                    if (timeSinceLast < this.minTimeBetweenRequestsMs) {
                        const waitTime = this.minTimeBetweenRequestsMs - timeSinceLast;
                        await new Promise(r => setTimeout(r, waitTime));
                    }
                    this.lastRequestTime = Date.now();
                    const result = await task();
                    resolve(result);
                }
                catch (error) {
                    reject(error);
                }
            });
            if (!this.isProcessing) {
                this.processQueue();
            }
        });
    }
    async processQueue() {
        this.isProcessing = true;
        while (this.queue.length > 0) {
            const task = this.queue.shift();
            if (task) {
                await task();
            }
        }
        this.isProcessing = false;
    }
}

// Global queue across all GeminiService instances (1 request every 5s = 12 RPM)
const globalGeminiQueue = new RequestQueue(5000);

class GeminiService {
    constructor(apiKey, model) {
        this.modelInitialized = false;
        this.forceAutoDetect = false;
        if (!apiKey) {
            throw new Error('Gemini API key is required');
        }
        this.apiKey = apiKey;
        this.genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
        this.model = model || '';
    }
    async ensureModelInitialized(excludeModels = []) {
        const envModel = process.env.GEMINI_MODEL;
        const envKey = process.env.GEMINI_API_KEY;
        if (envKey && envKey !== this.apiKey) {
            this.apiKey = envKey;
            this.genAI = new generative_ai_1.GoogleGenerativeAI(envKey);
            this.modelInitialized = false;
            this.forceAutoDetect = false;
            gemini_model_finder_1.GeminiModelFinder.clearCache();
        }
        if (envModel && envModel !== this.model && !this.forceAutoDetect) {
            this.model = envModel;
            this.modelInitialized = false;
        }
        if (this.modelInitialized && !excludeModels.includes(this.model)) {
            return;
        }
        if (!this.forceAutoDetect && this.model && this.model.length > 0 && !excludeModels.includes(this.model)) {
            console.log(`📌 Using model: ${this.model}`);
            this.modelInitialized = true;
            return;
        }
        const apiKey = this.apiKey || process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY not found in environment');
        }
        console.log('🔍 Auto-detecting Gemini model...');
        try {
            const detectedModel = await gemini_model_finder_1.GeminiModelFinder.findAvailableModel(apiKey);
            this.model = detectedModel;
            console.log(`✅ Auto-detected Gemini model: ${this.model}`);
            this.modelInitialized = true;
            this.forceAutoDetect = false;
        }
        catch (error) {
            console.error('❌ Auto-detection failed:', error);
            this.modelInitialized = false;
            throw new Error(`Failed to auto-detect Gemini model: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
                'Please set GEMINI_MODEL in your .env file with a valid model name.');
        }
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async generate(prompt, systemPrompt) {
        await this.ensureModelInitialized();
        const maxRetries = 4;
        let lastError = null;
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                const model = this.genAI.getGenerativeModel({ model: this.model });
                const fullPrompt = systemPrompt
                    ? `${systemPrompt}\n\n${prompt}`
                    : prompt;
                const result = await globalGeminiQueue.enqueue(async () => {
                    console.log(`[RateLimiter] Dispatching Gemini request...`);
                    return await model.generateContent(fullPrompt);
                });
                const response = await result.response;
                return response.text();
            }
            catch (error) {
                lastError = error;
                const errorMsg = (error.message || String(error)).toLowerCase();
                if (errorMsg.includes('429') || errorMsg.includes('too many requests') || errorMsg.includes('quota')) {
                    const retryMatch = error.message?.match(/retry in (\d+(?:\.\d+)?)s/i);
                    const waitSec = retryMatch
                        ? Math.ceil(parseFloat(retryMatch[1])) + 1
                        : Math.pow(2, attempt) * 5;
                    if (waitSec > 10 && attempt < maxRetries - 1) {
                        console.warn(`⏳ Rate limited on ${this.model} for ${waitSec}s. Attempting to switch models...`);
                        const excludedModel = this.model;
                        gemini_model_finder_1.GeminiModelFinder.clearCache();
                        this.modelInitialized = false;
                        this.model = '';
                        this.forceAutoDetect = true;
                        try {
                            await this.ensureModelInitialized([excludedModel]);
                            console.log(`🔄 Switched to model: ${this.model} to avoid rate limit.`);
                            continue;
                        }
                        catch (detectError) {
                            console.warn('❌ Auto-detection for model switch failed, falling back to waiting...');
                            this.model = excludedModel;
                        }
                    }
                    if (attempt < maxRetries - 1) {
                        console.warn(`⏳ Rate limited (429). Waiting ${waitSec}s before retry ${attempt + 1}/${maxRetries - 1}...`);
                        await this.sleep(waitSec * 1000);
                        continue;
                    }
                    break;
                }
                if ((errorMsg.includes('404') || errorMsg.includes('not found')) && attempt === 0) {
                    console.log('⚠️ Model not found, attempting to auto-detect...');
                    gemini_model_finder_1.GeminiModelFinder.clearCache();
                    this.modelInitialized = false;
                    this.model = '';
                    this.forceAutoDetect = true;
                    try {
                        await this.ensureModelInitialized();
                        console.log(`🔄 Retrying with model: ${this.model}`);
                        continue;
                    }
                    catch (detectError) {
                        console.error('❌ Auto-detection failed:', detectError);
                    }
                }
                break;
            }
        }
        console.error('Gemini service error:', lastError);
        throw new Error(`Failed to generate response: ${lastError instanceof Error ? lastError.message : 'Unknown error'}`);
    }
    async generateJSON(prompt, systemPrompt) {
        const enhancedPrompt = `${prompt}\n\nReturn only valid JSON, no markdown formatting, no code blocks. Ensure the response is valid JSON that can be parsed.`;
        const response = await this.generate(enhancedPrompt, systemPrompt);
        try {
            let cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const jsonMatch = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
            if (jsonMatch) {
                cleaned = jsonMatch[0];
            }
            let inString = false;
            let escapeNext = false;
            let sanitized = "";
            for (let i = 0; i < cleaned.length; i++) {
                const char = cleaned[i];
                if (escapeNext) {
                    sanitized += char;
                    escapeNext = false;
                    continue;
                }
                if (char === '\\') {
                    escapeNext = true;
                    sanitized += char;
                    continue;
                }
                if (char === '"') {
                    inString = !inString;
                    sanitized += char;
                    continue;
                }
                if (inString) {
                    if (char === '\n')
                        sanitized += '\\n';
                    else if (char === '\r')
                        sanitized += '\\r';
                    else if (char === '\t')
                        sanitized += '\\t';
                    else if (char.charCodeAt(0) < 32) {
                        sanitized += '\\u00' + char.charCodeAt(0).toString(16).padStart(2, '0');
                    }
                    else
                        sanitized += char;
                }
                else {
                    sanitized += char;
                }
            }
            return JSON.parse(sanitized);
        }
        catch (error) {
            console.error('JSON parsing error:', error);
            const fs = require('fs');
            try {
                fs.writeFileSync('failed_json_response.txt', response);
                console.error('Wrote failed response to failed_json_response.txt for debugging.');
            }
            catch (e) { }
            throw new Error(`Failed to parse JSON response: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    setModel(model) {
        this.model = model;
        this.modelInitialized = false;
    }
}
exports.GeminiService = GeminiService;
