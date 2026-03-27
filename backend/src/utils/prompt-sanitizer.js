"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromptSanitizer = void 0;
/**
 * Security utility to sanitize user prompts and prevent injection attacks
 */
class PromptSanitizer {
    static sanitize(prompt) {
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
exports.PromptSanitizer = PromptSanitizer;
PromptSanitizer.MAX_PROMPT_LENGTH = 10000;
PromptSanitizer.DANGEROUS_PATTERNS = [
    /system\s*\(/i,
    /exec\s*\(/i,
    /eval\s*\(/i,
    /child_process/i,
    /require\s*\(['"]fs['"]\)/i,
    /require\s*\(['"]path['"]\)/i
];
