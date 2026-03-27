/**
 * Security utility to sanitize user prompts and prevent injection attacks
 */
export class PromptSanitizer {
  private static readonly MAX_PROMPT_LENGTH = 10000;
  private static readonly DANGEROUS_PATTERNS = [
    /system\s*\(/i,
    /exec\s*\(/i,
    /eval\s*\(/i,
    /child_process/i,
    /require\s*\(['"]fs['"]\)/i,
    /require\s*\(['"]path['"]\)/i
  ];

  static sanitize(prompt: string): { valid: boolean; sanitized?: string; error?: string } {
    // Check length
    if (prompt.length > this.MAX_PROMPT_LENGTH) {
      return {
        valid: false,
        error: `Prompt exceeds maximum length of ${this.MAX_PROMPT_LENGTH} characters`
      };
    }

    // Check for dangerous patterns
    for (const pattern of this.DANGEROUS_PATTERNS) {
      if (pattern.test(prompt)) {
        return {
          valid: false,
          error: 'Prompt contains potentially dangerous code patterns'
        };
      }
    }

    // Basic sanitization: trim and remove excessive whitespace
    const sanitized = prompt
      .trim()
      .replace(/\s+/g, ' ')
      .substring(0, this.MAX_PROMPT_LENGTH);

    return {
      valid: true,
      sanitized
    };
  }
}


