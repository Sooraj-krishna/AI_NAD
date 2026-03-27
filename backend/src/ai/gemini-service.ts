import { GoogleGenerativeAI } from '@google/generative-ai';
import { GeminiModelFinder } from './gemini-model-finder';

/**
 * A simple pro-active request queue to ensure we don't spam the API and
 * hit the 429 rate limit (typically 15 RPM on the free tier).
 */
class RequestQueue {
  private queue: (() => Promise<void>)[] = [];
  private isProcessing = false;
  private minTimeBetweenRequestsMs: number;
  private lastRequestTime = 0;

  constructor(minTimeBetweenRequestsMs: number) {
    this.minTimeBetweenRequestsMs = minTimeBetweenRequestsMs;
  }

  async enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
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
        } catch (error) {
          reject(error);
        }
      });
      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }

  private async processQueue() {
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

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: string;
  private apiKey: string;
  private modelInitialized: boolean = false;
  private forceAutoDetect: boolean = false;

  constructor(apiKey: string, model?: string) {
    if (!apiKey) {
      throw new Error('Gemini API key is required');
    }
    this.apiKey = apiKey;
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = model || '';
  }

  /**
   * Initialize the model (auto-detect if not specified).
   * Re-checks env vars every time in case .env was updated.
   */
  private async ensureModelInitialized(excludeModels: string[] = []): Promise<void> {
    // Always prefer current env var — allows hot-reload to pick up changes
    const envModel = process.env.GEMINI_MODEL;
    const envKey = process.env.GEMINI_API_KEY;

    // Re-initialise if API key has changed in env
    if (envKey && envKey !== this.apiKey) {
      this.apiKey = envKey;
      this.genAI = new GoogleGenerativeAI(envKey);
      this.modelInitialized = false;
      this.forceAutoDetect = false;
      GeminiModelFinder.clearCache();
    }

    // If an explicit env model is set, prefer it unless we're forcing auto-detect
    if (envModel && envModel !== this.model && !this.forceAutoDetect) {
      this.model = envModel;
      this.modelInitialized = false;
    }

    // If we already initialized and the model isn't excluded, we're done
    if (this.modelInitialized && !excludeModels.includes(this.model)) {
      return;
    }

    // If we already have a model set and we are not forcing auto-detection, use it
    if (!this.forceAutoDetect && this.model && this.model.length > 0 && !excludeModels.includes(this.model)) {
      console.log(`📌 Using model: ${this.model}`);
      this.modelInitialized = true;
      return;
    }

    // Auto-detect if no model is set (or excluded / forced)
    const apiKey = this.apiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not found in environment');
    }

    console.log('🔍 Auto-detecting Gemini model...');
    try {
      const detectedModel = await GeminiModelFinder.findAvailableModel(apiKey);
      this.model = detectedModel;
      console.log(`✅ Auto-detected Gemini model: ${this.model}`);
      this.modelInitialized = true;
      this.forceAutoDetect = false;
    } catch (error) {
      console.error('❌ Auto-detection failed:', error);
      this.modelInitialized = false;
      throw new Error(
        `Failed to auto-detect Gemini model: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
          'Please set GEMINI_MODEL in your .env file with a valid model name.'
      );
    }
  }

  /** Sleep helper */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async generate(prompt: string, systemPrompt?: string): Promise<string> {
    await this.ensureModelInitialized();

    const maxRetries = 4;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const model = this.genAI.getGenerativeModel({ model: this.model });

        const fullPrompt = systemPrompt
          ? `${systemPrompt}\n\n${prompt}`
          : prompt;

        // Wrap the actual API call in our proactive global rate limiter queue
        const result = await globalGeminiQueue.enqueue(async () => {
             console.log(`[RateLimiter] Dispatching Gemini request...`);
             return await model.generateContent(fullPrompt);
        });
        const response = await result.response;
        return response.text();
      } catch (error: any) {
        lastError = error;
        const errorMsg = (error.message || String(error)).toLowerCase();

        // --- 429 Rate limit: wait and retry with exponential backoff ---
        if (errorMsg.includes('429') || errorMsg.includes('too many requests') || errorMsg.includes('quota')) {
          // Try to extract retryDelay from error message, default to 2^attempt * 5s
          const retryMatch = error.message?.match(/retry in (\d+(?:\.\d+)?)s/i);
          const waitSec = retryMatch
            ? Math.ceil(parseFloat(retryMatch[1])) + 1
            : Math.pow(2, attempt) * 5;

          // If the wait time is long, try switching to a different model to bypass rate limit
          if (waitSec > 10 && attempt < maxRetries - 1) {
             console.warn(`⏳ Rate limited on ${this.model} for ${waitSec}s. Attempting to switch models...`);
             const excludedModel = this.model;
             GeminiModelFinder.clearCache();
             this.modelInitialized = false;
             this.model = ''; 
             this.forceAutoDetect = true; // Temporarily ignore .env model
             try {
               await this.ensureModelInitialized([excludedModel]);
               console.log(`🔄 Switched to model: ${this.model} to avoid rate limit.`);
               continue; // Retry immediately with the new model!
             } catch (detectError) {
               console.warn('❌ Auto-detection for model switch failed, falling back to waiting...');
               this.model = excludedModel; // Restore so logs show the correct model
             }
          }

          if (attempt < maxRetries - 1) {
            console.warn(`⏳ Rate limited (429). Waiting ${waitSec}s before retry ${attempt + 1}/${maxRetries - 1}...`);
            await this.sleep(waitSec * 1000);
            continue;
          }
          // Exhausted retries
          break;
        }

        // --- Model not found: try auto-detection once ---
        if ((errorMsg.includes('404') || errorMsg.includes('not found')) && attempt === 0) {
          console.log('⚠️ Model not found, attempting to auto-detect...');
          GeminiModelFinder.clearCache();
          this.modelInitialized = false;
          this.model = '';
          // Ignore GEMINI_MODEL from env for this retry; it may be invalid for
          // this API key / account / SDK method mapping.
          this.forceAutoDetect = true;
          try {
            await this.ensureModelInitialized();
            console.log(`🔄 Retrying with model: ${this.model}`);
            continue;
          } catch (detectError) {
            console.error('❌ Auto-detection failed:', detectError);
          }
        }

        // Non-retryable error
        break;
      }
    }

    console.error('Gemini service error:', lastError);
    throw new Error(`Failed to generate response: ${lastError instanceof Error ? lastError.message : 'Unknown error'}`);
  }

  async generateJSON<T>(prompt: string, systemPrompt?: string): Promise<T> {
    const enhancedPrompt = `${prompt}\n\nReturn only valid JSON, no markdown formatting, no code blocks. Ensure the response is valid JSON that can be parsed.`;

    const response = await this.generate(enhancedPrompt, systemPrompt);

    try {
      let cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      const jsonMatch = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (jsonMatch) {
        cleaned = jsonMatch[0];
      }

      // Deterministic state machine to fix unescaped control characters in JSON string literals
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
          if (char === '\n') sanitized += '\\n';
          else if (char === '\r') sanitized += '\\r';
          else if (char === '\t') sanitized += '\\t';
          // Escape other control characters U+0000 to U+001F
          else if (char.charCodeAt(0) < 32) {
             sanitized += '\\u00' + char.charCodeAt(0).toString(16).padStart(2, '0');
          }
          else sanitized += char;
        } else {
          sanitized += char;
        }
      }

      return JSON.parse(sanitized) as T;
    } catch (error) {
      console.error('JSON parsing error:', error);
      const fs = require('fs');
      try {
        fs.writeFileSync('failed_json_response.txt', response);
        console.error('Wrote failed response to failed_json_response.txt for debugging.');
      } catch (e) {}
      throw new Error(`Failed to parse JSON response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  setModel(model: string): void {
    this.model = model;
    this.modelInitialized = false; // Force re-init on next call
  }
}

