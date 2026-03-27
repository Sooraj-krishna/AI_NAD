import { AIService } from '../../backend/src/ai/ai-service-factory';
import { IntentOutput, RequirementOutput, ArchitectureOutput, AgentResponse } from '../../backend/src/types';
import { Logger } from '../../backend/src/utils/logger';

export class SecurityAgent {
  private aiService: AIService;

  constructor(aiService: AIService) {
    this.aiService = aiService;
  }

  async process(
    intent: IntentOutput,
    requirements: RequirementOutput,
    architecture: ArchitectureOutput
  ): Promise<AgentResponse<ArchitectureOutput>> {
    try {
      // Check if authentication is requested (either explicit flag or implied by intents/requirements)
      const needsAuth =
        intent.authentication ||
        intent.api_requirements?.some(req => req.toLowerCase().includes('auth') || req.toLowerCase().includes('login')) ||
        requirements.workflows.some(wf => wf.name.toLowerCase().includes('auth') || wf.name.toLowerCase().includes('login'));

      if (!needsAuth) {
        Logger.info('Security Agent: No authentication required for this project.');
        return { success: true, data: architecture };
      }

      Logger.pipelineStep('step_3b_security_agent', { processing: 'Integrating Advanced Security & Authentication' });

      const systemPrompt = `You are a strict Application Security Architect.
You are modifying an existing application architecture to embed an advanced, robust authorization and authentication system.
The user requested an authentication system which MUST include:
1. Firebase Authentication for user login (with email/password and Google OAuth)
2. Backend verification of ID tokens using the Firebase Admin SDK
3. Storage of tokens in HttpOnly secure cookies
4. Role-Based Access Control (RBAC) using Firebase custom claims
5. Encryption of sensitive user data using AES-256
6. Enforcement of HTTPS for all API communication
7. Login rate limiting and audit logging
8. Password reset and email verification flows

Update the provided architecture to include endpoints, database tables, and explicit developer instructions for these features.

CRITICAL INSTRUCTION: Your output MUST be strictly valid JSON. NEVER include unescaped newlines, tabs, or control characters inside JSON string literals. If you need a newline in a string, strictly use '\\n'.

Output format:
{
  "api_endpoints": [
    ...existing endpoints,
    {
      "method": "POST",
      "path": "/api/auth/login",
      "description": "Authenticate user, verify Firebase ID token, set HttpOnly cookie",
      "controller": "AuthController"
    },
    ...other required auth endpoints
  ],
  "database_schema": {
    "tables": [
      ...existing tables,
      {
        "name": "audit_logs",
        "columns": [
          {"name": "id", "type": "uuid", "constraints": ["PRIMARY KEY"]},
          {"name": "user_id", "type": "varchar(255)"},
          {"name": "action", "type": "varchar(255)"},
          {"name": "timestamp", "type": "timestamp"}
        ]
      }
    ]
  },
  "security_features": [
    "Use Firebase Admin SDK to verify ID tokens in an auth middleware.",
    "Store authenticated tokens in HttpOnly secure cookies.",
    "Implement Role-Based Access Control (RBAC) leveraging Firebase custom claims.",
    "Encrypt sensitive user fields using AES-256 before saving to the database.",
    "Enforce HTTPS on all requests in the express configuration.",
    "Implement rate limiting on the /api/auth/login route.",
    "Implement audit logging for sensitive actions."
  ]
}`;

      const prompt = `Current Architecture:
${JSON.stringify(architecture, null, 2)}

Modify this architecture by adding the necessary endpoints, tables, and security features for a complete, secure Firebase authentication system. Keep all existing endpoints and tables, just append to them!`;

      const result = await this.aiService.generateJSON<{
        api_endpoints: any[];
        database_schema: any;
        security_features: string[];
      }>(prompt, systemPrompt);

      // Merge the results back into the architecture
      const updatedArchitecture: ArchitectureOutput = {
        ...architecture,
        api_endpoints: result.api_endpoints,
        database_schema: result.database_schema,
        security_features: result.security_features
      };

      Logger.pipelineStep('security_architecture_updated', { features: result.security_features.length });

      return {
        success: true,
        data: updatedArchitecture
      };
    } catch (error) {
      Logger.error('Security Agent error', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
