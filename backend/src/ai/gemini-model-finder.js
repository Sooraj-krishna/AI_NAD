"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiModelFinder = void 0;
const generative_ai_1 = require("@google/generative-ai");
class GeminiModelFinder {
    /**
     * Automatically find an available Gemini model
     * Caches the result to avoid repeated API calls
     */
    static async findAvailableModel(apiKey) {
        // Return cached model if available
        if (this.cachedModel) {
            return this.cachedModel;
        }
        // If a check is already in progress, wait for it
        if (this.modelCheckPromise) {
            return this.modelCheckPromise;
        }
        // Start checking for available models
        this.modelCheckPromise = this.checkModels(apiKey);
        this.cachedModel = await this.modelCheckPromise;
        this.modelCheckPromise = null;
        return this.cachedModel;
    }
    static async checkModels(apiKey) {
        const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
        // List of models to try in order of preference
        const preferredModels = [
            'gemini-2.0-flash', // Fast and widely available
            'gemini-2.0-flash-001', // Pinned version
            'gemini-2.5-flash', // Latest flash
            'gemini-2.5-flash-lite', // Lightweight flash
            'gemini-2.0-flash-lite', // Lightweight flash (older)
            'gemini-2.0-flash-lite-001', // Pinned lightweight
            'gemini-2.5-pro', // Latest pro
            'gemini-1.5-pro', // Legacy pro
            'gemini-1.5-flash', // Legacy flash
            'gemini-pro', // Oldest stable
            'gemini-1.0-pro', // Oldest stable alt
        ];
        console.log('🔍 Detecting available Gemini models...');
        // First, try to get list of available models from the API
        let availableModelNames = [];
        try {
            const response = await fetch('https://generativelanguage.googleapis.com/v1/models?key=' + apiKey, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (response.ok) {
                const data = await response.json();
                console.log('📋 Received model list from API');
                if (data.models && Array.isArray(data.models)) {
                    availableModelNames = data.models
                        .filter((m) => {
                        const methods = m.supportedGenerationMethods || [];
                        return methods.includes('generateContent');
                    })
                        .map((m) => {
                        // Extract model name (format: "models/gemini-pro" or just "gemini-pro")
                        const name = m.name || '';
                        return name.replace(/^models\//, '');
                    })
                        .filter((name) => name && name.length > 0);
                    console.log(`📝 Found ${availableModelNames.length} available models:`, availableModelNames);
                }
            }
            else {
                const errorText = await response.text();
                console.warn(`⚠️ Model list API returned ${response.status}:`, errorText.substring(0, 200));
            }
        }
        catch (error) {
            console.warn('⚠️ Could not fetch model list from API:', error.message);
        }
        // Prefer models from `preferredModels` that are confirmed available by the model list API.
        // Important: do NOT call `generateContent` here; that consumes quota and can turn auto-detection
        // into a 429 quota failure loop.
        const preferredAvailable = preferredModels.filter(m => availableModelNames.includes(m));
        const restAvailable = availableModelNames.filter(m => !preferredAvailable.includes(m));
        const modelsToSelectFrom = availableModelNames.length > 0
            ? preferredAvailable.concat(restAvailable)
            : preferredModels;
        console.log(`🧾 Selecting Gemini model from:`, modelsToSelectFrom);
        const selected = modelsToSelectFrom[0];
        if (!selected) {
            const availableList = availableModelNames.length > 0
                ? ` Available models: ${availableModelNames.join(', ')}`
                : '';
            throw new Error(`No available Gemini models found.${availableList} ` +
                'Please check your API key and ensure you have access to Gemini models. ' +
                'You can also manually set GEMINI_MODEL in your .env file.');
        }
        console.log(`✅ Selected Gemini model: ${selected}`);
        return selected;
        // Note: keeping `testModel` below for possible future "health checks".
    }
    /**
     * Test if a model is actually usable
     * Makes a minimal API call to verify the model works
     */
    static async testModel(genAI, modelName) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            // Make a very small test request with timeout
            const testPromise = model.generateContent('Hi');
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000));
            const result = await Promise.race([testPromise, timeoutPromise]);
            if (result && result.response) {
                return true;
            }
            return false;
        }
        catch (error) {
            const errorMsg = (error.message || String(error)).toLowerCase();
            // If rate-limited (429), bubble up — the API key itself is exhausted,
            // no point testing other models with the same key
            if (errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('too many requests')) {
                throw error;
            }
            // Model-specific errors (404, 403, not found, timeout) → just skip this model
            return false;
        }
    }
    /**
     * Clear the cached model (useful for testing or if API key changes)
     */
    static clearCache() {
        this.cachedModel = null;
        this.modelCheckPromise = null;
    }
}
exports.GeminiModelFinder = GeminiModelFinder;
GeminiModelFinder.cachedModel = null;
GeminiModelFinder.modelCheckPromise = null;
