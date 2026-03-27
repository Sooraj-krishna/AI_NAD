import { AIService } from '../../backend/src/ai/ai-service-factory';
import { CodeOutput, TestOutput, FileContent, AgentResponse } from '../../backend/src/types';
import { Logger } from '../../backend/src/utils/logger';

export class TestAgent {
  private aiService: AIService;

  constructor(aiService: AIService) {
    this.aiService = aiService;
  }

  async process(code: CodeOutput): Promise<AgentResponse<TestOutput>> {
    try {
      Logger.pipelineStep('tests_created', { codeFiles: code.backend.length + code.frontend.length });

      const systemPrompt = `You are a test automation expert.
Generate unit tests for the following code using Jest framework.
Return only valid JSON with test file paths and content.

Output format:
{
  "tests": [
    {
      "path": "src/__tests__/ResourceController.test.ts",
      "content": "// Jest test code here"
    }
  ]
}

Generate comprehensive tests with:
- Unit tests for functions
- API endpoint tests
- Integration tests where appropriate`;

      const testFiles: FileContent[] = [];

      // Generate tests for backend files
      for (const file of code.backend) {
        if (file.path.includes('controller') || file.path.includes('service')) {
          const prompt = `Generate Jest unit tests for this code:

${file.content}

Test file path: ${file.path.replace('.ts', '.test.ts')}`;

          const testCode = await this.aiService.generate(prompt, systemPrompt);
          testFiles.push({
            path: file.path.replace('src/', 'src/__tests__/').replace('.ts', '.test.ts'),
            content: this.extractCode(testCode)
          });
        }
      }

      // Generate tests for frontend components
      for (const file of code.frontend) {
        if (file.path.includes('component') || file.path.includes('Component')) {
          const prompt = `Generate Jest + React Testing Library tests for this React component:

${file.content}

Test file path: ${file.path.replace('.tsx', '.test.tsx')}`;

          const testCode = await this.aiService.generate(prompt, systemPrompt);
          testFiles.push({
            path: file.path.replace('src/', 'src/__tests__/').replace('.tsx', '.test.tsx'),
            content: this.extractCode(testCode)
          });
        }
      }

      return {
        success: true,
        data: {
          tests: testFiles
        }
      };
    } catch (error) {
      Logger.error('Test Agent error', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private extractCode(text: string): string {
    return text
      .replace(/```typescript\n?/g, '')
      .replace(/```tsx\n?/g, '')
      .replace(/```ts\n?/g, '')
      .replace(/```javascript\n?/g, '')
      .replace(/```jsx\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
  }
}


