import React from 'react';
import { Button } from './ui/button';
import { Sparkles, Loader2 } from 'lucide-react';

interface IntentInputProps {
  prompt: string;
  onPromptChange: (prompt: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

export const IntentInput: React.FC<IntentInputProps> = ({
  prompt,
  onPromptChange,
  onGenerate,
  isGenerating
}) => {
  return (
    <div className="relative overflow-hidden rounded-3xl border bg-card text-card-foreground shadow-2xl">
      <div className="p-6 sm:p-10 flex flex-col gap-6 relative z-10">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">Describe Your Project</h2>
          <p className="text-muted-foreground text-lg">
            Tell AI-NAD what you want to build, and it will generate a complete, runnable application.
          </p>
        </div>
        
        <div className="relative">
          <textarea
            className="flex min-h-[180px] w-full rounded-xl border border-input bg-background/50 px-5 py-4 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all shadow-inner"
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            placeholder="Example: Create a task manager web app with login and dashboard"
            rows={6}
            disabled={isGenerating}
          />
        </div>

        <div className="flex justify-end">
          <Button
            size="lg"
            variant="glow"
            className="w-full sm:w-auto gap-3 text-base h-14 px-10 rounded-xl shadow-lg shadow-brand/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            onClick={onGenerate}
            disabled={isGenerating || !prompt.trim()}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin" />
                Generating Project...
              </>
            ) : (
              <>
                <Sparkles className="h-6 w-6" />
                Generate Project
              </>
            )}
          </Button>
        </div>
      </div>
      
      {/* Subtle background glow effect for the card */}
      <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-brand/10 blur-3xl pointer-events-none" />
      <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-brand/5 blur-3xl pointer-events-none" />
    </div>
  );
};
