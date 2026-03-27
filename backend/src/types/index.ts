export interface IntentOutput {
  project_type: string;
  modules: string[];
  stack: {
    frontend: string;
    backend: string;
    database: string;
  };
  core_modules?: string[];
  recommended_stack?: {
    frontend: string;
    backend: string;
    database: string;
  };
  database?: string;
  authentication?: boolean;
  api_requirements?: string[];
}

export interface RequirementOutput {
  services: string[];
  entities: Entity[];
  workflows: Workflow[];
}

export interface Entity {
  name: string;
  fields: Field[];
}

export interface Field {
  name: string;
  type: string;
  required?: boolean;
}

export interface Workflow {
  name: string;
  steps: string[];
}

export interface ArchitectureOutput {
  architecture: {
    frontend: string;
    backend: string;
    database: string;
  };
  folder_structure: FolderStructure;
  api_endpoints: ApiEndpoint[];
  database_schema: DatabaseSchema;
  security_features?: string[];
}

export interface FolderStructure {
  backend: string[];
  frontend: string[];
}

export interface ApiEndpoint {
  method: string;
  path: string;
  description: string;
  controller?: string;
}

export interface DatabaseSchema {
  tables: Table[];
}

export interface Table {
  name: string;
  columns: Column[];
}

export interface Column {
  name: string;
  type: string;
  constraints?: string[];
}

export interface CodeOutput {
  backend: FileContent[];
  frontend: FileContent[];
}

export interface FileContent {
  path: string;
  content: string;
}

export interface TestOutput {
  tests: FileContent[];
}

export interface ValidationOutput {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

export interface ValidationError {
  file: string;
  line?: number;
  message: string;
  type: 'syntax' | 'security' | 'dependency';
}

export interface PipelineContext {
  userPrompt: string;
  intent?: IntentOutput;
  requirements?: RequirementOutput;
  architecture?: ArchitectureOutput;
  code?: CodeOutput;
  tests?: TestOutput;
  validation?: ValidationOutput;
  projectPath?: string;
}

export interface AgentResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}


