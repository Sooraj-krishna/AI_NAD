import { AIService } from '../../backend/src/ai/ai-service-factory';
import { ArchitectureOutput, CodeOutput, FileContent, AgentResponse } from '../../backend/src/types';
import { Logger } from '../../backend/src/utils/logger';
import { z } from 'zod';

// Define a strict schema for the expected file output
const FileContentSchema = z.object({
  path: z.string().min(1, "File path cannot be empty"),
  content: z.string().min(1, "File content cannot be empty")
});
const FileArraySchema = z.array(FileContentSchema);

export class CodeAgent {
  private aiService: AIService;

  constructor(aiService: AIService) {
    this.aiService = aiService;
  }

  async process(architecture: ArchitectureOutput): Promise<AgentResponse<CodeOutput>> {
    try {
      Logger.pipelineStep('code_generated', { architecture });

      // --- DECOMPOSED GENERATION ---
      Logger.info('🚀 Step 4a: Generating Models...');
      const models = await this.generateModels(architecture);

      Logger.info('🚀 Step 4b: Generating Services...');
      const services = await this.generateServices(architecture, models);

      Logger.info('🚀 Step 4c: Generating Controllers...');
      const controllers = await this.generateControllers(architecture, services);

      Logger.info('🚀 Step 4d: Generating Routes...');
      const routes = await this.generateRoutes(architecture, controllers);

      Logger.info('🚀 Step 4e: Generating Frontend...');
      const frontendFiles = await this.generateFrontend(architecture);

      const backendFiles = [...models, ...services, ...controllers, ...routes];

      // --- V19: MANIFEST VERIFICATION & FIX ---
      Logger.info('🔍 Step 4f: Verifying Project Blueprint...');
      const fixedCode = this.verifyAndFixManifest({ backend: backendFiles, frontend: frontendFiles }, architecture);

      Logger.info(`✅ Decomposed code generation complete: ${fixedCode.backend.length} backend files, ${fixedCode.frontend.length} frontend files`);

      return {
        success: true,
        data: fixedCode
      };
    } catch (error) {
      Logger.error('Code Agent error', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async repair(errors: any[], currentCode: CodeOutput, architecture: ArchitectureOutput, userPrompt: string): Promise<AgentResponse<CodeOutput>> {
    try {
      Logger.info(`🔧 Repairing code based on ${errors.length} validation errors...`);

      const systemPrompt = `You are an expert developer. Fix the provided TypeScript errors for the given files.
    
    STRICT RULES:
    - Fix ALL TypeScript errors.
    - NEVER use "any" type. Replace "any" with proper interfaces or types.
    - Return ONLY a JSON array of the files that were modified.
    - NEVER use literal "..." as a placeholder. Write the FULL code.
    
    Example Fix:
    BAD: const data: any = JSON.parse(str);
    GOOD: interface Data { id: string }; const data: Data = JSON.parse(str);
    
    Output Format: [{"path": "...", "content": "..."}]`;

      const prompt = `Original User Intent:
${userPrompt}

Validation Errors:
${JSON.stringify(errors, null, 2)}

Current Architecture:
${JSON.stringify(architecture, null, 2)}

Current Code (relevant files):
${JSON.stringify(currentCode, null, 2)}

Please fix the errors and return the corrected files in a JSON array.`;

      const responseText = await this.aiService.generate(prompt, systemPrompt);
      const repairedFiles = this.parseFileArray(responseText, 'repair');

      const newBackend = [...currentCode.backend];
      const newFrontend = [...currentCode.frontend];

      for (const repaired of repairedFiles) {
        let found = false;
        for (let i = 0; i < newBackend.length; i++) {
          if (newBackend[i].path === repaired.path) {
            newBackend[i] = repaired;
            found = true;
            break;
          }
        }
        if (found) continue;
        for (let i = 0; i < newFrontend.length; i++) {
          if (newFrontend[i].path === repaired.path) {
            newFrontend[i] = repaired;
            found = true;
            break;
          }
        }
        if (!found) {
            if (repaired.path.includes('frontend') || repaired.path.includes('src/components')) {
                newFrontend.push(repaired);
            } else {
                newBackend.push(repaired);
            }
        }
      }

      return {
        success: true,
        data: { backend: newBackend, frontend: newFrontend }
      };
    } catch (error) {
      Logger.error('Code Agent repair error', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async generateWithRetry(label: string, prompt: string, systemPrompt: string): Promise<FileContent[]> {
    const MAX_RETRIES = 2;
    let attempt = 0;
    let lastError = '';
    let currentPrompt = prompt;

    while (attempt <= MAX_RETRIES) {
      try {
        const responseText = await this.aiService.generate(currentPrompt, systemPrompt);
        return this.parseFileArray(responseText, label);
      } catch (error) {
        attempt++;
        lastError = error instanceof Error ? error.message : 'Unknown error';
        Logger.warn(`⚠️ ${label} generation attempt ${attempt} failed: ${lastError}`);
        
        if (attempt <= MAX_RETRIES) {
          currentPrompt = `Your previous output for ${label} was INVALID.
Error: ${lastError}

STRICT RULE: DO NOT USE PLACEHOLDERS LIKE "// logic here" OR "...". 
You MUST implement working business logic for every function.
Do NOT use "..." to represent omitted code. Write EVERY line of code.

Original Context:
${prompt}`;
        } else {
          Logger.warn(`❌ ${label} failed after all retries. Falling back to project blueprint enforcer.`);
          return []; // Return empty so enforcer can inject template
        }
      }
    }
    return [];
  }

  private async generateModels(architecture: ArchitectureOutput): Promise<FileContent[]> {
    const systemPrompt = `You are a senior backend architect. Generate TypeScript models for this database schema.
    
    STRICT RULES:
    - MUST RETURN ONLY A JSON ARRAY OF FILES.
    - NEVER use "any" type. Always define an interface for each table.
    
    ONE-SHOT EXAMPLE:
    Input Tables: [{"name": "users", "columns": [{"name": "id", "type": "serial"}]}]
    Output: [{"path": "src/models/user.model.ts", "content": "export interface User { id: number; }"}]`;
    const prompt = `Tables to generate models for: ${JSON.stringify(architecture.database_schema.tables, null, 2)}`;
    return this.generateWithRetry('models', prompt, systemPrompt);
  }

  private async generateServices(architecture: ArchitectureOutput, models: FileContent[]): Promise<FileContent[]> {
    const serviceFiles: FileContent[] = [];
    
    for (const serviceName of architecture.services) {
      Logger.info(`   - Generating ${serviceName}...`);
      const systemPrompt = `You are a senior backend developer. Generate the ${serviceName} logic.
      
      STRICT RULES:
      - Return ONLY a JSON array containing THIS service file.
      - YOU MUST implement full CRUD/Business Logic. DO NOT use placeholders.
      - Export a default instance: "export default new ${serviceName}();"
      - Import models from '../models/'.
      
      ONE-SHOT EXAMPLE:
      Input: Service: AuthService
      Output: [{"path": "src/services/auth.service.ts", "content": "class AuthService { ... }\\nexport default new AuthService();"}]`;

      const prompt = `Service: ${serviceName}\nArchitecture: ${JSON.stringify(architecture, null, 2)}`;
      const result = await this.generateWithRetry(serviceName, prompt, systemPrompt);
      serviceFiles.push(...result);
    }
    
    return serviceFiles;
  }

  private async generateControllers(architecture: ArchitectureOutput, services: FileContent[]): Promise<FileContent[]> {
    const controllerFiles: FileContent[] = [];
    
    // Group endpoints by controller name
    const groupedEndpoints: Record<string, any[]> = {};
    for (const endpoint of architecture.api_endpoints) {
      const controllerName = endpoint.controller || 'DefaultController';
      if (!groupedEndpoints[controllerName]) groupedEndpoints[controllerName] = [];
      groupedEndpoints[controllerName].push(endpoint);
    }

    for (const [controllerName, endpoints] of Object.entries(groupedEndpoints)) {
      Logger.info(`   - Generating ${controllerName}...`);
      const systemPrompt = `You are a senior backend Express.js developer. Generate the ${controllerName} source code.

      STRICT RULES:
      - Return ONLY a JSON array containing THIS controller file.
      - YOU MUST implement full business logic. No placeholders.
      - Export a default instance: "export default new ${controllerName}();"
      - Reference services correctly (e.g., from '../services/').
      
      ONE-SHOT EXAMPLE:
      Input: Controller: AuthController
      Output: [{"path": "src/controllers/auth.controller.ts", "content": "import { Request, Response } from 'express';\\nclass AuthController { ... }\\nexport default new AuthController();"}]`;

      const prompt = `Controller: ${controllerName}\nRequired Endpoints: ${JSON.stringify(endpoints, null, 2)}\nArchitecture: ${JSON.stringify(architecture, null, 2)}`;
      const result = await this.generateWithRetry(controllerName, prompt, systemPrompt);
      controllerFiles.push(...result);
    }
    
    return controllerFiles;
  }

  async generateRoutes(architecture: ArchitectureOutput, controllers: FileContent[]): Promise<FileContent[]> {
    const controllerNames = controllers.map(c => {
        const parts = c.path.split('/');
        return parts[parts.length - 1];
    });
    
    const systemPrompt = `You are a senior backend developer. Generate the Express router configuration based on the controller files provided.
    
    STRICT RULES:
    - YOU MUST GENERATE ALL FILES: src/routes/index.ts AND one sub-router file for EACH controller (e.g. auth.router.ts, task.router.ts).
    - If a file is imported in index.ts, it MUST be included in your output array.
    - Router files MUST use the controllers provided. 
    - Output format MUST be a JSON array of files.
    - DO NOT use placeholders like "...".
    
    CONTROLLER LIST: ${JSON.stringify(controllerNames)}
    
    ONE-SHOT EXAMPLE:
    Input: Controllers: ["auth.controller.ts", "user.controller.ts"]
    Output: [
      {"path": "src/routes/index.ts", "content": "import { Router } from 'express';\\nimport authRouter from './auth.router';\\nimport userRouter from './user.router';\\nconst router = Router();\\nrouter.use('/auth', authRouter);\\nrouter.use('/users', userRouter);\\nexport default router;"},
      {"path": "src/routes/auth.router.ts", "content": "import { Router } from 'express';\\nimport { AuthController } from '../controllers/auth.controller';\\n..."},
      {"path": "src/routes/user.router.ts", "content": "import { Router } from 'express';\\nimport { UserController } from '../controllers/user.controller';\\n..."}
    ]`;

    const prompt = `Generate the Express routes for these controllers: ${JSON.stringify(controllerNames, null, 2)}.
    Use the following API Architecture to ensure paths match the requirements: ${JSON.stringify(architecture.api_endpoints, null, 2)}`;
    
    return this.generateWithRetry('routes', prompt, systemPrompt);
  }

  private async generateFrontend(architecture: ArchitectureOutput): Promise<FileContent[]> {
    const frontendFiles: FileContent[] = [];
    
    // Define the essential frontend files to generate
    const componentList = [
      { name: 'App.tsx', path: 'src/App.tsx', purpose: 'Root component with React Router and Layout wrapper.' },
      { name: 'Dashboard.tsx', path: 'src/pages/Dashboard.tsx', purpose: 'Main overview page showing heart rate, steps, and activity.' },
      { name: 'ActivityLog.tsx', path: 'src/pages/ActivityLog.tsx', purpose: 'A page to display historical fitness data.' },
      { name: 'Profile.tsx', path: 'src/pages/Profile.tsx', purpose: 'User profile and settings page.' },
      { name: 'Login.tsx', path: 'src/pages/Login.tsx', purpose: 'Authentication page for users.' }
    ];

    // --- STEP 4e-1: Generate index.css based on Design System ---
    if (architecture.design_system) {
        Logger.info('   - Generating index.css (Design System Tokens)...');
        const ds = architecture.design_system;
        const cssContent = `:root {
  --primary: ${ds.colors.primary};
  --secondary: ${ds.colors.secondary};
  --bg: ${ds.colors.background};
  --surface: ${ds.colors.surface};
  --accent: ${ds.colors.accent};
  --text: ${ds.colors.background === '#000000' || ds.colors.background.includes('0f172a') ? '#f8fafc' : '#0f172a'};
  --radius: ${ds.effects.border_radius};
}

body {
  margin: 0;
  background-color: var(--bg);
  color: var(--text);
  font-family: ${ds.typography.font_family};
}

.glass {
  backdrop-filter: blur(${ds.effects.glassmorphism ? '12px' : '0px'});
  background: var(--surface);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius);
}

button {
  background: var(--primary);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.2s;
}

button:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
}`;
        frontendFiles.push({ path: 'src/index.css', content: cssContent });
    }

    for (const component of componentList) {
      Logger.info(`   - Generating ${component.name}...`);
      const systemPrompt = `You are an expert React developer. Generate the ${component.name}.
      
      STRICT RULES:
      - Return ONLY a JSON array containing THIS file.
      - AESTHETICS: Use the provided Design System (colors, fonts, glassmorphism).
      - TYPES: Use "interface IProps { children: React.ReactNode }" for props. NEVER use JSX.Element for children.
      - ICONS: Use "lucide-react".
      - LOGIC: Write full functional code. NO placeholders.
      
      DESIGN TOKENS: ${JSON.stringify(architecture.design_system)}
      
      ONE-SHOT EXAMPLE:
      Input: Component: App.tsx
      Output: [{"path": "src/components/App.tsx", "content": "import React from 'react';\\nimport { Layout } from 'lucide-react';\\ninterface IAppProps { children: React.ReactNode; }\\nexport default function App({ children }: IAppProps) { ... }"}]`;

      const prompt = `Component: ${component.name}\nPurpose: ${component.purpose}\nFull Architecture: ${JSON.stringify(architecture, null, 2)}`;
      const result = await this.generateWithRetry(component.name, prompt, systemPrompt);
      
      // Ensure path matches the defined list if the AI returned a flat name
      for (const res of result) {
          if (!res.path.includes('/')) {
              res.path = component.path;
          }
      }
      
      frontendFiles.push(...result);
    }
    
    return frontendFiles;
  }

  private parseFileArray(text: string, label: string): FileContent[] {
    try {
      let cleaned = text.trim();

      try {
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed)) return this.validateFileArray(parsed, label);
      } catch { /* proceed */ }

      const firstBracket = cleaned.indexOf('[');
      const firstBrace = cleaned.indexOf('{');
      const lastBracket = cleaned.lastIndexOf(']');
      const lastBrace = cleaned.lastIndexOf('}');

      let jsonStr = '';
      if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
        jsonStr = cleaned.substring(firstBracket, lastBracket + 1);
      } else if (firstBrace !== -1) {
        jsonStr = cleaned.substring(firstBrace, lastBrace + 1);
      } else {
        throw new Error('No JSON structures found');
      }

      jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      let parsed = JSON.parse(jsonStr);

      if (!Array.isArray(parsed) && typeof parsed === 'object' && parsed !== null) {
        if ('path' in parsed && 'content' in parsed) {
          parsed = [parsed];
        } else {
          const arrayKey = Object.keys(parsed).find(key => Array.isArray(parsed[key]));
          if (arrayKey) {
            parsed = parsed[arrayKey];
          } else {
            throw new Error('Object contains no arrays');
          }
        }
      }

      if (Array.isArray(parsed) && parsed.length > 0 && !('path' in parsed[0])) {
          throw new Error(`AI generated a definition list for ${label} instead of a list of FILES. Please rewrite as a JSON array of files.`);
      }

      return this.validateFileArray(parsed, label);

    } catch (err) {
      Logger.warn(`⚠️ Parse failed: ${label}.`, err);
      throw new Error(`Parse failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  private validateFileArray(arr: any[], label: string): FileContent[] {
    if (!Array.isArray(arr)) throw new Error('Input is not an array');
    
    const filtered = arr.filter(item => typeof item === 'object' && item !== null && 'path' in item && 'content' in item);
    
    if (filtered.length === 0 && arr.length > 0) {
        throw new Error(`Array of ${arr.length} items found, but 0 items matched the required {path, content} format.`);
    }

    const validatedFiles = FileArraySchema.parse(filtered);
    return validatedFiles.map(f => {
      // --- V17.1 HARD PLACEHOLDER BAN ---
      const forbiddenPlaceholders = ['...', '// TODO', '// logic', '// implement', '[...]'];
      for (const placeholder of forbiddenPlaceholders) {
          if (f.content.includes(placeholder)) {
              // Ignore valid spread operators or documentation examples
              const isSpread = placeholder === '...' && (f.content.includes('...') && (f.content.includes('...Array') || f.content.includes('...req') || f.content.includes('...props') || f.content.includes('...task') || f.content.includes('...user') || /\.\.\.\w+/.test(f.content)));
              
              if (!isSpread) {
                  const lines = f.content.split('\n');
                  const targetLine = lines.find(l => l.includes(placeholder));
                  if (targetLine && targetLine.length < 20) { // Placeholders are usually on short lines
                      throw new Error(`AI generated a literal placeholder "${placeholder}" in ${f.path}. This is strictly forbidden.`);
                  }
              }
          }
      }

      if (!f.path.includes('/')) {
        f.path = `src/${label}/${f.path.endsWith('.ts') || f.path.endsWith('.tsx') ? f.path : f.path + '.ts'}`;
      }
      return f;
    }).filter((f): f is FileContent => Boolean(f.path && f.content));
  }
  private verifyAndFixManifest(code: CodeOutput, architecture: ArchitectureOutput): CodeOutput {
    const criticalBackend = [
      { path: 'src/index.ts', template: (arch: any) => this.getBackendEntryTemplate(arch) },
      { path: 'src/routes/index.ts', template: (arch: any) => this.getBackendRouterTemplate(arch) }
    ];

    const criticalFrontend = [
      { path: 'src/main.tsx', template: () => this.getFrontendMainTemplate() },
      { path: 'src/App.tsx', template: (arch: any) => this.getFrontendAppTemplate(arch) },
      { path: 'src/index.css', template: (arch: any) => this.getFrontendCssTemplate(arch) }
    ];

    const fixedBackend = [...code.backend];
    const fixedFrontend = [...code.frontend];

    // Fix Backend
    for (const crit of criticalBackend) {
        const found = fixedBackend.find(f => f.path === crit.path);
        // Check if missing OR contains forbidden placeholders
        const isBroken = found && (found.content.includes('...') && !found.content.includes('...req') && !found.content.includes('...Array'));
        
        if (!found || isBroken) {
            Logger.warn(`🛠️ Missing or broken critical file: ${crit.path}. Injecting Golden Template.`);
            if (found) {
                found.content = crit.template(architecture);
            } else {
                fixedBackend.push({ path: crit.path, content: crit.template(architecture) });
            }
        }
    }

    // Fix Frontend
    for (const crit of criticalFrontend) {
        const found = fixedFrontend.find(f => f.path === crit.path);
        if (!found) {
            Logger.warn(`🛠️ Missing critical file: ${crit.path}. Injecting Golden Template.`);
            fixedFrontend.push({ path: crit.path, content: crit.template(architecture) });
        }
    }

    return { backend: fixedBackend, frontend: fixedFrontend };
  }

  private getBackendEntryTemplate(arch: ArchitectureOutput): string {
    return `import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import router from './routes/index';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

app.use('/api', router);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(\`🚀 Server running on port \${PORT}\`);
});`;
  }

  private getBackendRouterTemplate(arch: ArchitectureOutput): string {
    const controllers = arch.api_endpoints
      .map(e => e.controller)
      .filter((v, i, a) => v && a.indexOf(v) === i);

    const imports = controllers
      .map(c => `import ${c} from '../controllers/${c?.toLowerCase().replace('controller', '')}.controller';`)
      .join('\n');

    const usages = controllers
        .map(c => `router.use('/${c?.toLowerCase().replace('controller', '')}', ${c} as any);`)
        .join('\n');

    return `import { Router } from 'express';
${imports}

const router = Router();

${usages}

export default router;`;
  }

  private getFrontendMainTemplate(): string {
    return `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`;
  }

  private getFrontendAppTemplate(arch: ArchitectureOutput): string {
    return `import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './Dashboard';
import Login from './Login';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-transparent">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </div>
    </Router>
  );
}`;
  }

  private getFrontendCssTemplate(arch: ArchitectureOutput): string {
    return `:root {
  --primary: #6366f1;
  --bg: #0f172a;
  --surface: rgba(30, 41, 59, 0.7);
  --radius: 12px;
}
body {
  margin: 0;
  background: var(--bg);
  color: white;
  font-family: sans-serif;
}
.glass {
  background: var(--surface);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius);
}`;
  }
}

