"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationAgent = void 0;
const logger_1 = require("../../backend/src/utils/logger");
const child_process_1 = require("child_process");
const util_1 = require("util");
const path = __importStar(require("path"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class ValidationAgent {
    async process(code, projectPath) {
        try {
            logger_1.Logger.pipelineStep('validation_started', { projectPath });
            const errors = [];
            const warnings = [];
            // 1. Static Analysis
            for (const file of [...code.backend, ...code.frontend]) {
                const content = typeof file.content === 'string' ? file.content : JSON.stringify(file.content);
                const securityIssues = this.checkSecurity(content);
                if (securityIssues.length > 0) {
                    errors.push(...securityIssues.map(issue => ({
                        file: file.path,
                        message: issue,
                        type: 'security'
                    })));
                }
                const syntaxIssues = this.checkSyntax(content, file.path);
                if (syntaxIssues.length > 0) {
                    errors.push(...syntaxIssues.map(issue => ({
                        file: file.path,
                        message: issue,
                        type: 'syntax'
                    })));
                }
                const depIssues = this.checkDependencies(content);
                if (depIssues.length > 0) {
                    warnings.push(...depIssues);
                }
            }
            // 2. Native Validation (tsc)
            logger_1.Logger.info('🚀 Running native validation with tsc...');
            const nativeErrors = await this.runNativeValidation(projectPath);
            errors.push(...nativeErrors);
            const valid = errors.length === 0;
            logger_1.Logger.pipelineStep('validation_completed', {
                valid,
                errors: errors.length,
                warnings: warnings.length
            });
            return {
                success: true,
                data: {
                    valid,
                    errors,
                    warnings
                }
            };
        }
        catch (error) {
            logger_1.Logger.error('Validation Agent error', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    async runNativeValidation(projectPath) {
        const errors = [];
        try {
            const backendPath = path.join(projectPath, 'backend');
            // Attempt to run tsc --noEmit
            try {
                await execAsync('npx tsc --noEmit', { cwd: backendPath });
            }
            catch (err) {
                if (err.stdout) {
                    const lines = err.stdout.split('\n');
                    for (const line of lines) {
                        if (line.includes('error TS')) {
                            const matches = line.match(/(.*)\((\d+),(\d+)\): error TS(\d+): (.*)/);
                            if (matches) {
                                const [_, file, lineNum, col, code, message] = matches;
                                // Heuristic: If it's a "Cannot find module" error, check if it's local
                                if (code === '2307') {
                                    const moduleMatch = message.match(/Cannot find module '([^']+)'/);
                                    if (moduleMatch) {
                                        const moduleName = moduleMatch[1];
                                        if (moduleName.startsWith('.')) {
                                            // CRITICAL: Missing local module
                                            errors.push({
                                                file: file.trim(),
                                                message: `CRITICAL: Local module not found: ${moduleName}. Ensure the file exists and the path is correct.`,
                                                type: 'syntax'
                                            });
                                            continue;
                                        }
                                        else {
                                            // External module: skip if we haven't run npm install
                                            continue;
                                        }
                                    }
                                }
                                errors.push({
                                    file: file.trim(),
                                    message: `${message} (Line ${lineNum})`,
                                    type: 'syntax'
                                });
                            }
                            else if (line.includes(': error TS')) {
                                // Fallback for different tsc output formats
                                errors.push({
                                    file: line.split(':')[0].trim(),
                                    message: line.substring(line.indexOf(': error TS') + 2),
                                    type: 'syntax'
                                });
                            }
                        }
                    }
                }
            }
        }
        catch (error) {
            logger_1.Logger.warn('Native validation wrapper encountered an unexpected error', error);
        }
        return errors;
    }
    checkSecurity(content) {
        const issues = [];
        const dangerousPatterns = [
            { pattern: /eval\s*\(/, message: 'Use of eval() detected - security risk' },
            { pattern: /dangerouslySetInnerHTML/, message: 'dangerouslySetInnerHTML usage - ensure sanitization' },
            { pattern: /process\.env\.\w+.*password/i, message: 'Potential hardcoded credentials' },
            { pattern: /SELECT.*\+.*FROM/i, message: 'Potential SQL injection risk' }
        ];
        for (const { pattern, message } of dangerousPatterns) {
            if (pattern.test(content)) {
                issues.push(message);
            }
        }
        return issues;
    }
    checkSyntax(content, filePath) {
        const issues = [];
        // Basic syntax checks
        const openBraces = (content.match(/{/g) || []).length;
        const closeBraces = (content.match(/}/g) || []).length;
        if (openBraces !== closeBraces) {
            issues.push('Mismatched braces');
        }
        const openParens = (content.match(/\(/g) || []).length;
        const closeParens = (content.match(/\)/g) || []).length;
        if (openParens !== closeParens) {
            issues.push('Mismatched parentheses');
        }
        // Check for common TypeScript/React issues
        if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
            if (content.includes('any') && !content.includes('// eslint-disable')) {
                issues.push('Use of "any" type detected - consider using explicit types');
            }
        }
        return issues;
    }
    checkDependencies(content) {
        const warnings = [];
        // Check for potentially outdated or insecure dependencies
        const deprecatedPatterns = [
            { pattern: /require\(['"]request['"]\)/, message: 'request package is deprecated' }
        ];
        for (const { pattern, message } of deprecatedPatterns) {
            if (pattern.test(content)) {
                warnings.push(message);
            }
        }
        return warnings;
    }
}
exports.ValidationAgent = ValidationAgent;
