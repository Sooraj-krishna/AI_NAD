import React, { useState, useEffect } from 'react';
import { generateProject, checkStatus } from '../services/api';
import { IntentInput } from '../components/IntentInput';
import { StatusDisplay } from '../components/StatusDisplay';
import { FolderGit2 } from 'lucide-react';

interface ProjectStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: string;
  currentStep?: string;
  stepNumber?: number;
  totalSteps?: number;
  steps?: Array<{
    name: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    message?: string;
  }>;
  context?: any;
  error?: string;
}

export const GeneratePage: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [status, setStatus] = useState<ProjectStatus | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (projectId) {
      const interval = setInterval(async () => {
        try {
          const statusData = await checkStatus(projectId);
          setStatus(statusData);
          
          if (statusData.status === 'completed' || statusData.status === 'failed') {
            setIsGenerating(false);
            clearInterval(interval);
          }
        } catch (error) {
          console.error('Status check error:', error);
          clearInterval(interval);
        }
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [projectId]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      alert('Please enter a project description');
      return;
    }

    setIsGenerating(true);
    setStatus(null);

    try {
      const response = await generateProject(prompt);
      setProjectId(response.projectId);
    } catch (error: any) {
      console.error('Generation error:', error);
      if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
        alert('Cannot connect to backend server. Please make sure the backend is running on port 5000.\n\nRun: npm run dev:backend');
      } else {
        alert(`Failed to start generation: ${error.message || 'Unknown error'}`);
      }
      setIsGenerating(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto py-12 px-4 sm:px-6 lg:px-8 space-y-12 animate-appear relative z-10">
      <div className="flex flex-col gap-10">
        <IntentInput
          prompt={prompt}
          onPromptChange={setPrompt}
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
        />

        {status && (
          <StatusDisplay
            status={status}
            architecture={status.context?.architecture}
            steps={status.steps}
            currentStep={status.currentStep}
            stepNumber={status.stepNumber}
            totalSteps={status.totalSteps}
          />
        )}

        {status?.status === 'completed' && status.context?.projectPath && (
          <div className="rounded-3xl border border-green-500/30 bg-green-500/10 p-8 sm:p-10 animate-appear-zoom shadow-2xl relative overflow-hidden">
            <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-green-500/10 blur-3xl pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-8 relative z-10">
              <div className="h-16 w-16 rounded-2xl bg-green-500/20 flex items-center justify-center p-0.5 shadow-inner">
                <div className="h-full w-full rounded-xl bg-green-500/20 flex items-center justify-center">
                  <FolderGit2 className="h-8 w-8 text-green-500" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-2xl sm:text-3xl font-bold text-green-500 tracking-tight">Project Generated Successfully!</h3>
                <p className="text-base text-green-500/80 mt-2 font-medium">
                  Your code has been written to the disk and is ready to run.
                </p>
              </div>
            </div>
            
            <div className="bg-background/80 rounded-2xl border border-border/50 p-6 sm:p-8 relative z-10 shadow-sm backdrop-blur-sm">
              <div className="flex flex-col gap-2 mb-8">
                <p className="font-semibold text-sm uppercase tracking-widest text-muted-foreground">Project Location</p>
                <div className="bg-muted px-4 py-3 rounded-xl font-mono text-sm border shadow-inner text-foreground overflow-x-auto">
                  {status.context.projectPath}
                </div>
              </div>

              <div>
                <h4 className="font-bold text-lg mb-4 text-foreground">Next Steps:</h4>
                <ol className="flex flex-col gap-4 text-base text-muted-foreground w-full">
                  <li className="flex gap-4 items-start">
                    <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-brand/10 text-brand font-bold">1</span>
                    <div className="w-full">
                      <p className="font-medium text-foreground mb-2">Install backend dependencies</p>
                      <code className="block bg-muted px-4 py-3 rounded-xl font-mono text-sm border text-foreground overflow-x-auto">cd {status.context.projectPath}/backend && npm install</code>
                    </div>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-brand/10 text-brand font-bold">2</span>
                    <div className="w-full">
                      <p className="font-medium text-foreground mb-2">Start the API server</p>
                      <code className="block bg-muted px-4 py-3 rounded-xl font-mono text-sm border text-foreground overflow-x-auto">npm run dev</code>
                    </div>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-brand/10 text-brand font-bold">3</span>
                    <div className="w-full">
                      <p className="font-medium text-foreground mb-2">Start the frontend client in a new terminal</p>
                      <code className="block bg-muted px-4 py-3 rounded-xl font-mono text-sm border text-foreground overflow-x-auto">cd {status.context.projectPath}/frontend && npm install && npm run dev</code>
                    </div>
                  </li>
                </ol>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
