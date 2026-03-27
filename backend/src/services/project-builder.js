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
exports.ProjectBuilder = void 0;
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const logger_1 = require("../utils/logger");
class ProjectBuilder {
    constructor() {
        this.basePath = path.join(process.cwd(), 'generated-projects');
    }
    async prepareProject(context) {
        const projectName = this.generateProjectName(context.userPrompt);
        const projectPath = path.join(this.basePath, projectName);
        // Create project directory structure
        await fs.ensureDir(projectPath);
        await fs.ensureDir(path.join(projectPath, 'backend', 'src'));
        await fs.ensureDir(path.join(projectPath, 'frontend', 'src'));
        return projectPath;
    }
    async buildProject(context) {
        if (!context.code || !context.architecture) {
            throw new Error('Missing code or architecture in context');
        }
        const projectName = this.generateProjectName(context.userPrompt);
        const projectPath = path.join(this.basePath, projectName);
        logger_1.Logger.info('Building project', { projectPath });
        // Write backend files
        await this.writeBackendFiles(projectPath, context.code, context.architecture);
        // Write frontend files
        await this.writeFrontendFiles(projectPath, context.code, context.architecture);
        // Write test files
        if (context.tests) {
            await this.writeTestFiles(projectPath, context.tests);
        }
        // Create package.json files — pass generated code so we can scan for imports
        await this.createPackageFiles(projectPath, context.architecture, context.code.backend, context.code.frontend);
        // Create configuration files
        await this.createConfigFiles(projectPath, context.architecture);
        // Create README
        await this.createREADME(projectPath, context);
        // Create database migration files
        if (context.architecture.database_schema) {
            await this.createDatabaseFiles(projectPath, context.architecture);
        }
        logger_1.Logger.info('Project built successfully', { projectPath });
        return projectPath;
    }
    async writeBackendFiles(projectPath, code, architecture) {
        const backendPath = path.join(projectPath, 'backend');
        for (const file of code.backend) {
            // Skip AI-generated package.json — project-builder manages that itself
            if (file.path === 'package.json' || file.path.endsWith('/package.json'))
                continue;
            const filePath = path.join(backendPath, file.path);
            await fs.ensureDir(path.dirname(filePath));
            await fs.writeFile(filePath, this.normaliseContent(file.content), 'utf-8');
        }
        // Create main server file if it doesn't exist
        const serverPath = path.join(backendPath, 'src', 'index.ts');
        if (!await fs.pathExists(serverPath)) {
            await fs.writeFile(serverPath, this.generateServerFile(architecture), 'utf-8');
        }
    }
    async writeFrontendFiles(projectPath, code, architecture) {
        const frontendPath = path.join(projectPath, 'frontend');
        for (const file of code.frontend) {
            // Skip AI-generated package.json — project-builder manages that itself
            if (file.path === 'package.json' || file.path.endsWith('/package.json'))
                continue;
            const filePath = path.join(frontendPath, file.path);
            await fs.ensureDir(path.dirname(filePath));
            await fs.writeFile(filePath, this.normaliseContent(file.content), 'utf-8');
        }
        // Create main entry file if it doesn't exist
        const mainPath = path.join(frontendPath, 'src', 'main.tsx');
        if (!await fs.pathExists(mainPath)) {
            await fs.writeFile(mainPath, this.generateMainFile(), 'utf-8');
        }
        // Create index.html
        const indexPath = path.join(frontendPath, 'index.html');
        if (!await fs.pathExists(indexPath)) {
            await fs.writeFile(indexPath, this.generateIndexHTML(), 'utf-8');
        }
    }
    async writeTestFiles(projectPath, tests) {
        for (const test of tests.tests) {
            const filePath = path.join(projectPath, test.path);
            await fs.ensureDir(path.dirname(filePath));
            await fs.writeFile(filePath, test.content, 'utf-8');
        }
    }
    async createPackageFiles(projectPath, architecture, backendFiles = [], frontendFiles = []) {
        // --- Scan generated code for missing imports ---
        const scannedBackendDeps = this.scanImportsForPackages(backendFiles, 'backend');
        const scannedFrontendDeps = this.scanImportsForPackages(frontendFiles, 'frontend');
        // --- Merge any ai-generated package.json files ---
        const aiBackendPkg = this.extractAiPackageJson(backendFiles);
        const aiFrontendPkg = this.extractAiPackageJson(frontendFiles);
        // Backend package.json
        const backendPackage = {
            name: path.basename(projectPath) + '-backend',
            version: '1.0.0',
            main: 'dist/index.js',
            scripts: {
                dev: 'tsx watch src/index.ts',
                build: 'tsc',
                start: 'node dist/index.js',
                test: 'jest'
            },
            dependencies: {
                express: '^4.18.2',
                cors: '^2.8.5',
                dotenv: '^16.3.1',
                ...scannedBackendDeps.dependencies,
                ...(aiBackendPkg?.dependencies || {})
            },
            devDependencies: {
                '@types/express': '^4.17.21',
                '@types/cors': '^2.8.17',
                '@types/node': '^20.10.0',
                typescript: '^5.3.3',
                tsx: '^4.7.0',
                jest: '^29.7.0',
                '@types/jest': '^29.5.8',
                ...scannedBackendDeps.devDependencies,
                ...(aiBackendPkg?.devDependencies || {})
            }
        };
        logger_1.Logger.info(`📦 Backend deps auto-detected: ${Object.keys(scannedBackendDeps.dependencies).join(', ') || 'none'}`);
        await fs.writeFile(path.join(projectPath, 'backend', 'package.json'), JSON.stringify(backendPackage, null, 2), 'utf-8');
        // Frontend package.json
        const frontendPackage = {
            name: path.basename(projectPath) + '-frontend',
            version: '1.0.0',
            type: 'module',
            scripts: {
                dev: 'vite',
                build: 'tsc && vite build',
                preview: 'vite preview'
            },
            dependencies: {
                react: '^18.2.0',
                'react-dom': '^18.2.0',
                axios: '^1.6.2',
                ...scannedFrontendDeps.dependencies,
                ...(aiFrontendPkg?.dependencies || {})
            },
            devDependencies: {
                '@types/react': '^18.2.43',
                '@types/react-dom': '^18.2.17',
                '@vitejs/plugin-react': '^4.2.1',
                typescript: '^5.3.3',
                vite: '^5.0.8',
                ...scannedFrontendDeps.devDependencies,
                ...(aiFrontendPkg?.devDependencies || {})
            }
        };
        logger_1.Logger.info(`📦 Frontend deps auto-detected: ${Object.keys(scannedFrontendDeps.dependencies).join(', ') || 'none'}`);
        await fs.writeFile(path.join(projectPath, 'frontend', 'package.json'), JSON.stringify(frontendPackage, null, 2), 'utf-8');
    }
    /**
     * Scans generated source files for bare import/require statements and maps
     * them to known npm package versions using a curated dependency map.
     */
    scanImportsForPackages(files, context) {
        // Node.js built-ins — never add these to package.json
        const nodeBuiltins = new Set([
            'fs', 'path', 'crypto', 'http', 'https', 'os', 'url', 'util', 'events',
            'stream', 'buffer', 'child_process', 'cluster', 'dns', 'net', 'tls',
            'zlib', 'readline', 'repl', 'vm', 'assert', 'querystring', 'string_decoder',
            'timers', 'tty', 'worker_threads', 'v8', 'perf_hooks', 'async_hooks'
        ]);
        // Curated map: package name → { version, devVersion?, type }
        //   type = 'dep' | 'devDep' | 'both'
        const depMap = {
            // Auth & security
            'bcrypt': { version: '^5.1.1', devVersion: '^5.0.2', type: 'both' },
            'bcryptjs': { version: '^2.4.3', type: 'dep' },
            'jsonwebtoken': { version: '^9.0.2', devVersion: '^9.0.5', type: 'both' },
            'passport': { version: '^0.7.0', type: 'dep' },
            'passport-local': { version: '^1.0.0', devVersion: '^1.0.1', type: 'both' },
            'passport-jwt': { version: '^4.0.1', type: 'dep' },
            'helmet': { version: '^7.1.0', type: 'dep' },
            'express-rate-limit': { version: '^7.1.5', type: 'dep' },
            // Database
            'pg': { version: '^8.11.3', devVersion: '^8.10.9', type: 'both' },
            'mysql2': { version: '^3.6.5', type: 'dep' },
            'mongoose': { version: '^8.0.3', type: 'dep' },
            'sequelize': { version: '^6.35.2', type: 'dep' },
            'typeorm': { version: '^0.3.17', type: 'dep' },
            'prisma': { version: '^5.7.1', type: 'devDep' },
            '@prisma/client': { version: '^5.7.1', type: 'dep' },
            'redis': { version: '^4.6.12', type: 'dep' },
            'ioredis': { version: '^5.3.2', type: 'dep' },
            // File handling
            'multer': { version: '^1.4.5-lts.1', devVersion: '^1.4.11', type: 'both' },
            'sharp': { version: '^0.33.2', type: 'dep' },
            'fs-extra': { version: '^11.2.0', devVersion: '^11.0.0', type: 'both' },
            // Utilities
            'uuid': { version: '^9.0.1', devVersion: '^9.0.7', type: 'both' },
            'lodash': { version: '^4.17.21', devVersion: '^4.14.202', type: 'both' },
            'date-fns': { version: '^3.3.1', type: 'dep' },
            'dayjs': { version: '^1.11.10', type: 'dep' },
            'zod': { version: '^3.22.4', type: 'dep' },
            'joi': { version: '^17.12.0', type: 'dep' },
            'class-validator': { version: '^0.14.1', type: 'dep' },
            // Networking / Real-time
            'axios': { version: '^1.6.2', type: 'dep' },
            'socket.io': { version: '^4.6.1', type: 'dep' },
            'socket.io-client': { version: '^4.6.1', type: 'dep' },
            'ws': { version: '^8.16.0', devVersion: '^8.18.0', type: 'both' },
            'node-fetch': { version: '^3.3.2', type: 'dep' },
            // Email
            'nodemailer': { version: '^6.9.8', devVersion: '^6.9.8', type: 'both' },
            // Middleware
            'morgan': { version: '^1.10.0', devVersion: '^1.9.1', type: 'both' },
            'compression': { version: '^1.7.4', devVersion: '^1.7.4', type: 'both' },
            'express-validator': { version: '^7.0.1', type: 'dep' },
            'express-async-handler': { version: '^1.2.0', type: 'dep' },
            // Frontend — React ecosystem
            'react-router-dom': { version: '^6.21.1', devVersion: '^5.3.3', type: 'both' },
            'zustand': { version: '^4.4.7', type: 'dep' },
            '@tanstack/react-query': { version: '^5.17.9', type: 'dep' },
            'react-hook-form': { version: '^7.49.3', type: 'dep' },
            'formik': { version: '^2.4.5', type: 'dep' },
            'yup': { version: '^1.3.3', type: 'dep' },
            'react-toastify': { version: '^10.0.4', type: 'dep' },
            'react-hot-toast': { version: '^2.4.1', type: 'dep' },
            'react-icons': { version: '^5.0.1', type: 'dep' },
            'lucide-react': { version: '^0.323.0', type: 'dep' },
            'clsx': { version: '^2.1.0', type: 'dep' },
            'tailwind-merge': { version: '^2.2.1', type: 'dep' },
            // CSS-in-JS / Styling
            'styled-components': { version: '^6.1.8', type: 'dep' },
            '@emotion/react': { version: '^11.11.3', type: 'dep' },
            '@emotion/styled': { version: '^11.11.0', type: 'dep' },
        };
        // Type-def-only packages (@types/*) that some imports pull in via a scoped name
        const typeOnlyMap = {
            'bcrypt': { '@types/bcrypt': '^5.0.2' },
            'bcryptjs': { '@types/bcryptjs': '^2.4.6' },
            'jsonwebtoken': { '@types/jsonwebtoken': '^9.0.5' },
            'multer': { '@types/multer': '^1.4.11' },
            'pg': { '@types/pg': '^8.10.9' },
            'uuid': { '@types/uuid': '^9.0.7' },
            'lodash': { '@types/lodash': '^4.14.202' },
            'morgan': { '@types/morgan': '^1.9.9' },
            'compression': { '@types/compression': '^1.7.5' },
            'nodemailer': { '@types/nodemailer': '^6.4.14' },
            'ws': { '@types/ws': '^8.18.0' },
            'fs-extra': { '@types/fs-extra': '^11.0.4' },
            'passport': { '@types/passport': '^1.0.16' },
            'passport-local': { '@types/passport-local': '^1.0.38' },
            'react-router-dom': { '@types/react-router-dom': '^5.3.3' },
            'styled-components': { '@types/styled-components': '^5.1.34' },
        };
        const foundDeps = {};
        const foundDevDeps = {};
        // Regex to extract bare package names from import/require statements
        const importRegex = /(?:import\s+(?:[^'"]+\s+from\s+)?['"]([^'"]+)['"]|require\s*\(\s*['"]([^'"]+)['"]\s*\))/g;
        for (const file of files) {
            // Skip AI-generated package.json files (handled separately)
            if (file.path === 'package.json')
                continue;
            // Only scan TS/JS source files
            if (!/\.(ts|tsx|js|jsx|mjs)$/.test(file.path))
                continue;
            let match;
            while ((match = importRegex.exec(file.content)) !== null) {
                const rawPkg = (match[1] || match[2] || '').trim();
                if (!rawPkg)
                    continue;
                // Strip relative imports
                if (rawPkg.startsWith('.'))
                    continue;
                // Extract bare package name (handles scoped packages like @org/pkg)
                const pkgName = rawPkg.startsWith('@')
                    ? rawPkg.split('/').slice(0, 2).join('/')
                    : rawPkg.split('/')[0];
                if (!pkgName || nodeBuiltins.has(pkgName))
                    continue;
                const entry = depMap[pkgName];
                if (!entry)
                    continue; // Unknown package — skip (we won't add untrusted dep versions)
                if (entry.type === 'dep' || entry.type === 'both') {
                    foundDeps[pkgName] = entry.version;
                }
                else if (entry.type === 'devDep') {
                    foundDevDeps[pkgName] = entry.version;
                }
                // Add corresponding @types/* if available
                if (typeOnlyMap[pkgName]) {
                    Object.assign(foundDevDeps, typeOnlyMap[pkgName]);
                }
            }
            // Reset regex lastIndex for next file
            importRegex.lastIndex = 0;
        }
        return { dependencies: foundDeps, devDependencies: foundDevDeps };
    }
    /**
     * If the AI included a package.json in its generated file list, parse and return it.
     * Returns null if none found or if parsing fails.
     */
    extractAiPackageJson(files) {
        const pkgFile = files.find(f => f.path === 'package.json' || f.path.endsWith('/package.json'));
        if (!pkgFile)
            return null;
        try {
            const parsed = JSON.parse(pkgFile.content);
            return {
                dependencies: parsed.dependencies || {},
                devDependencies: parsed.devDependencies || {}
            };
        }
        catch {
            logger_1.Logger.warn('⚠️ Could not parse AI-generated package.json, ignoring it');
            return null;
        }
    }
    async createConfigFiles(projectPath, architecture) {
        // Backend tsconfig.json
        const backendTsconfig = {
            compilerOptions: {
                target: 'ES2020',
                module: 'commonjs',
                lib: ['ES2020'],
                outDir: './dist',
                rootDir: './src',
                strict: true,
                esModuleInterop: true,
                skipLibCheck: true,
                forceConsistentCasingInFileNames: true,
                resolveJsonModule: true,
                moduleResolution: 'node'
            },
            include: ['src/**/*'],
            exclude: ['node_modules', 'dist']
        };
        await fs.writeFile(path.join(projectPath, 'backend', 'tsconfig.json'), JSON.stringify(backendTsconfig, null, 2), 'utf-8');
        // Frontend tsconfig.json
        const frontendTsconfig = {
            compilerOptions: {
                target: 'ES2020',
                useDefineForClassFields: true,
                lib: ['ES2020', 'DOM', 'DOM.Iterable'],
                module: 'ESNext',
                skipLibCheck: true,
                moduleResolution: 'bundler',
                allowImportingTsExtensions: true,
                resolveJsonModule: true,
                isolatedModules: true,
                noEmit: true,
                jsx: 'react-jsx',
                strict: true
            },
            include: ['src'],
            references: [{ path: './tsconfig.node.json' }]
        };
        await fs.writeFile(path.join(projectPath, 'frontend', 'tsconfig.json'), JSON.stringify(frontendTsconfig, null, 2), 'utf-8');
        // Frontend tsconfig.node.json — required by Vite; tsconfig.json references it
        const frontendTsconfigNode = {
            compilerOptions: {
                composite: true,
                skipLibCheck: true,
                module: 'ESNext',
                moduleResolution: 'bundler',
                allowSyntheticDefaultImports: true,
                strict: true
            },
            include: ['vite.config.ts']
        };
        await fs.writeFile(path.join(projectPath, 'frontend', 'tsconfig.node.json'), JSON.stringify(frontendTsconfigNode, null, 2), 'utf-8');
        // Frontend vite.config.ts
        const viteConfig = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true
      }
    }
  }
})`;
        await fs.writeFile(path.join(projectPath, 'frontend', 'vite.config.ts'), viteConfig, 'utf-8');
    }
    async createDatabaseFiles(projectPath, architecture) {
        const dbPath = path.join(projectPath, 'database');
        await fs.ensureDir(dbPath);
        let schemaSQL = '-- Database Schema\n\n';
        for (const table of architecture.database_schema.tables) {
            schemaSQL += `CREATE TABLE ${table.name} (\n`;
            for (const column of table.columns) {
                schemaSQL += `  ${column.name} ${column.type}`;
                if (column.constraints) {
                    schemaSQL += ' ' + column.constraints.join(' ');
                }
                schemaSQL += ',\n';
            }
            schemaSQL = schemaSQL.slice(0, -2) + '\n);\n\n';
        }
        await fs.writeFile(path.join(dbPath, 'schema.sql'), schemaSQL, 'utf-8');
    }
    async createREADME(projectPath, context) {
        const readme = `# ${this.generateProjectName(context.userPrompt)}

Generated by AI-NAD

## Project Overview

${context.userPrompt}

## Architecture

- Frontend: ${context.architecture?.architecture.frontend || 'React'}
- Backend: ${context.architecture?.architecture.backend || 'Node.js + Express'}
- Database: ${context.architecture?.architecture.database || 'PostgreSQL'}

## Getting Started

### Backend

\`\`\`bash
cd backend
npm install
npm run dev
\`\`\`

### Frontend

\`\`\`bash
cd frontend
npm install
npm run dev
\`\`\`

## API Endpoints

${context.architecture?.api_endpoints.map(e => `- ${e.method} ${e.path}: ${e.description}`).join('\n') || 'No endpoints defined'}

## Database

See \`database/schema.sql\` for database schema.

## Validation

${context.validation?.valid ? '✅ Code validation passed' : '⚠️ Code validation found issues'}
${context.validation?.errors.length ? `\nErrors: ${context.validation.errors.length}` : ''}
${context.validation?.warnings.length ? `\nWarnings: ${context.validation.warnings.length}` : ''}
`;
        await fs.writeFile(path.join(projectPath, 'README.md'), readme, 'utf-8');
    }
    generateServerFile(architecture) {
        return `import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());
app.use('/api', routes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});
`;
    }
    generateMainFile() {
        return `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './components/App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`;
    }
    generateIndexHTML() {
        return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Generated App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;
    }
    generateProjectName(prompt) {
        // Extract a simple project name from the prompt
        const words = prompt.toLowerCase().split(/\s+/);
        const filtered = words.filter(w => !['create', 'build', 'make', 'generate', 'a', 'an', 'the', 'with', 'and', 'or'].includes(w));
        return filtered.slice(0, 3).join('-') || 'generated-project';
    }
    /**
     * Ensures file content is always a string before writing.
     * The AI sometimes returns package.json content as a parsed JSON object
     * rather than a raw string, which causes fs.writeFile to throw ERR_INVALID_ARG_TYPE.
     */
    normaliseContent(content) {
        if (typeof content === 'string')
            return content;
        if (content === null || content === undefined)
            return '';
        return JSON.stringify(content, null, 2);
    }
}
exports.ProjectBuilder = ProjectBuilder;
