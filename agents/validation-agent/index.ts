import { CodeOutput, ValidationOutput, ValidationError, AgentResponse } from '../../backend/src/types';
import { Logger } from '../../backend/src/utils/logger';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

export class ValidationAgent {
  async process(code: CodeOutput, projectPath: string): Promise<AgentResponse<ValidationOutput>> {
    try {
      Logger.pipelineStep('validation_started', { projectPath });

      const errors: ValidationError[] = [];
      const warnings: string[] = [];

      // 1. Static Analysis
      for (const file of [...code.backend, ...code.frontend]) {
        const content = typeof file.content === 'string' ? file.content : JSON.stringify(file.content);
        
        const securityIssues = this.checkSecurity(content);
        if (securityIssues.length > 0) {
          errors.push(...securityIssues.map(issue => ({
            file: file.path,
            message: issue,
            type: 'security' as const
          })));
        }

        const syntaxResults = this.checkSyntax(content, file.path);
        if (syntaxResults.errors.length > 0) {
          errors.push(...syntaxResults.errors.map(msg => ({
            file: file.path,
            message: msg,
            type: 'syntax' as const
          })));
        }
        if (syntaxResults.warnings.length > 0) {
          warnings.push(...syntaxResults.warnings);
        }

        const depIssues = this.checkDependencies(content);
        if (depIssues.length > 0) {
          warnings.push(...depIssues);
        }
      }

      // 2. Native Validation (tsc)
      Logger.info('🚀 Running native validation with tsc...');
      const nativeErrors = await this.runNativeValidation(projectPath);
      
      // Filter out 'any' errors from native validation if any (though tsc usually doesn't literal "any type detected" unless configured)
      errors.push(...nativeErrors);

      const valid = errors.length === 0;

      Logger.pipelineStep('validation_completed', { 
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
    } catch (error) {
      Logger.error('Validation Agent error', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async runNativeValidation(projectPath: string): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];
    try {
      const backendPath = path.join(projectPath, 'backend');
      
      try {
        await execAsync('npx tsc --noEmit', { cwd: backendPath });
      } catch (err: any) {
        if (err.stdout) {
          const lines = err.stdout.split('\n');
          for (const line of lines) {
            if (line.includes('error TS')) {
              const matches = line.match(/(.*)\((\d+),(\d+)\): error TS(\d+): (.*)/);
              if (matches) {
                const [_, file, lineNum, col, code, message] = matches;
                
                if (code === '2307') {
                  const moduleMatch = message.match(/Cannot find module '([^']+)'/);
                  if (moduleMatch) {
                    const moduleName = moduleMatch[1];
                    if (moduleName.startsWith('.')) {
                      errors.push({
                        file: file.trim(),
                        message: `CRITICAL: Local module not found: ${moduleName}. Ensure the file exists and the path is correct.`,
                        type: 'syntax'
                      });
                      continue; 
                    } else {
                      continue;
                    }
                  }
                }

                errors.push({
                  file: file.trim(),
                  message: `${message} (Line ${lineNum})`,
                  type: 'syntax'
                });
              } else if (line.includes(': error TS')) {
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
    } catch (error) {
      Logger.warn('Native validation wrapper encountered an unexpected error', error);
    }
    return errors;
  }

  private checkSecurity(content: string): string[] {
    const issues: string[] = [];
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

  private checkSyntax(content: string, filePath: string): { errors: string[], warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    const openBraces = (content.match(/{/g) || []).length;
    const closeBraces = (content.match(/}/g) || []).length;
    if (openBraces !== closeBraces) {
      errors.push('Mismatched braces');
    }

    const openParens = (content.match(/\(/g) || []).length;
    const closeParens = (content.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      errors.push('Mismatched parentheses');
    }

    if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
      if (content.includes(': any') || content.includes('<any>') || content.includes('as any')) {
        if (!content.includes('// eslint-disable')) {
          warnings.push(`Use of "any" type detected in ${filePath} - consider using explicit types`);
        }
      }
    }

    return { errors, warnings };
  }

  private checkDependencies(content: string): string[] {
    const warnings: string[] = [];
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
