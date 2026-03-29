export class OllamaService {
  private baseUrl: string;
  private model: string;

  constructor(
    model: string = 'qwen2.5:3b', // ✅ Qwen2.5 (3B) — best instruction-following model for 4GB RAM
    baseUrl: string = 'http://localhost:11434'
  ) {
    this.model = model;
    this.baseUrl = baseUrl;
  }

  // 🔹 BASIC GENERATION
  async generate(prompt: string, systemPrompt?: string): Promise<string> {
    try {
      if (this.model.includes('phi3') || this.model.includes('gemma2')) {
        console.warn("⚠️ WARNING: Consider switching to OLLAMA_MODEL=qwen2.5:3b for better JSON accuracy and code generation.");
      }

      console.log("🤖 Using model:", this.model);

      const messages: any[] = [];

      if (systemPrompt) {
        messages.push({
          role: "system",
          content: systemPrompt
        });
      }

      messages.push({
        role: "user",
        content: prompt
      });

      console.log("🧠 Prompt size:", prompt.length);
      console.log("🧠 Sending to Ollama...");
      console.log("📝 Preview:", prompt.slice(0, 200));

      const body: any = {
        model: this.model,
        messages: messages,
        stream: false,
        options: {
          temperature: 0,   // ✅ Deterministic — essential for stable JSON output
          num_ctx: 4096,    // ✅ qwen2.5:3b handles 4096 ctx comfortably within 4GB RAM
          repeat_penalty: 1.1 // ✅ Reduces repetition loops without truncating output
        }
      };

      if (prompt.toLowerCase().includes('json') || systemPrompt?.toLowerCase().includes('json')) {
        body.format = 'json'; // ✅ Force native JSON mode
      }

      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const text = await response.text();
        console.error("❌ Ollama raw error:", text);
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json() as { message?: { content?: string } };

      if (!data?.message?.content) {
        console.error("❌ Invalid response:", data);
        throw new Error("Invalid Ollama response format");
      }

      return data.message.content;

    } catch (error) {
      console.error("Ollama service error:", error);

      throw new Error(
        `Failed to generate response: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  // 🔹 JSON GENERATION
  async generateJSON<T>(prompt: string, systemPrompt?: string): Promise<T> {
    const enhancedPrompt = `
${prompt}

STRICT RULES:
- Output MUST be valid JSON
- Use ONLY double quotes
- No comments (# or //)
- No trailing commas
- No explanations
- No markdown
- No text outside JSON
`;

    const response = await this.generate(enhancedPrompt, systemPrompt);

    let cleaned = '';

    try {
      // 🔹 Remove markdown
      cleaned = response
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();

      // 🔹 Extract JSON
      cleaned = this.extractJSON(cleaned);

      // 🔹 Sanitize
      cleaned = this.sanitizeJSON(cleaned);

      // 🔹 Parse
      return JSON.parse(cleaned) as T;

    } catch (error) {
      console.error('❌ JSON parsing error:', error);
      console.error('🔴 RAW RESPONSE:\n', response);
      console.error('🟡 CLEANED RESPONSE:\n', cleaned);

      throw new Error(
        `Failed to parse JSON response: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  // 🔹 EXTRACT JSON OBJECT
  extractJSON(text: string): string {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');

    if (start === -1 || end === -1 || end <= start) {
      throw new Error('No valid JSON found in response');
    }

    return text.substring(start, end + 1);
  }

  // 🔹 EXTRACT JSON ARRAY
  extractJSONArray(text: string): string {
    const start = text.indexOf('[');
    const end = text.lastIndexOf(']');

    if (start === -1 || end === -1 || end <= start) {
      throw new Error('No valid JSON array found');
    }

    return text.substring(start, end + 1);
  }

  sanitizeJSON(text: string): string {
    let sanitized = text
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
      .replace(/[“”]/g, '"')     // Standardize smart quotes
      .replace(/[‘’]/g, "'")
      .replace(/«|»/g, '"')
      .replace(/,\s*}/g, '}')   // Remove trailing commas in objects
      .replace(/,\s*]/g, ']')   // Remove trailing commas in arrays
      .trim();

    // Check for double nested braces if the model confused the format
    if (sanitized.startsWith('{{') && sanitized.endsWith('}}')) {
        sanitized = sanitized.substring(1, sanitized.length - 1);
    }

    return sanitized;
  }

  // 🔹 CHANGE MODEL
  setModel(model: string): void {
    this.model = model;
  }
}