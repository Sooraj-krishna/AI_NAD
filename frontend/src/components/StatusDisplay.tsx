import React from 'react';
import { ArchitecturePreview } from './ArchitecturePreview';
import { CheckCircle2, CircleDashed, Loader2, XCircle } from 'lucide-react';

interface Step {
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  message?: string;
}

interface StatusDisplayProps {
  status: {
    status: string;
    progress?: string;
    error?: string;
  };
  architecture?: any;
  steps?: Step[];
  currentStep?: string;
  stepNumber?: number;
  totalSteps?: number;
}

export const StatusDisplay: React.FC<StatusDisplayProps> = ({
  status,
  architecture,
  steps,
  stepNumber,
  totalSteps
}) => {
  const getStatusIcon = () => {
    switch (status.status) {
      case 'pending': return <CircleDashed className="h-8 w-8 text-muted-foreground" />;
      case 'processing': return <Loader2 className="h-8 w-8 text-brand animate-spin" />;
      case 'completed': return <CheckCircle2 className="h-8 w-8 text-green-500" />;
      case 'failed': return <XCircle className="h-8 w-8 text-destructive" />;
      default: return <CircleDashed className="h-8 w-8 text-muted-foreground" />;
    }
  };

  const getStepIcon = (stepStatus: string) => {
    switch (stepStatus) {
      case 'completed': return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'processing': return <Loader2 className="h-5 w-5 text-brand animate-spin" />;
      case 'failed': return <XCircle className="h-5 w-5 text-destructive" />;
      default: return <CircleDashed className="h-5 w-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="rounded-3xl border bg-card text-card-foreground shadow-xl animate-appear overflow-hidden relative">
      <div className="p-6 sm:p-10 flex flex-col gap-8 relative z-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-border/50 pb-8 gap-4">
          <div className="flex items-center gap-5">
            <div className={`p-3 rounded-full ${status.status === 'processing' ? 'bg-brand/10' : status.status === 'completed' ? 'bg-green-500/10' : status.status === 'failed' ? 'bg-destructive/10' : 'bg-muted'}`}>
              {getStatusIcon()}
            </div>
            <div>
              <h3 className="text-2xl font-bold tracking-tight">
                {status.status === 'processing' && status.progress
                  ? status.progress
                  : status.status.charAt(0).toUpperCase() + status.status.slice(1)}
              </h3>
              <p className="text-base text-muted-foreground mt-1 font-medium tracking-wide uppercase text-xs">Pipeline Status</p>
            </div>
          </div>
          {stepNumber !== undefined && totalSteps && (
            <div className="sm:text-right bg-muted/30 px-6 py-3 rounded-2xl border border-border/50">
              <div className="text-3xl font-black text-foreground">{stepNumber + 1}<span className="text-muted-foreground text-xl">/{totalSteps}</span></div>
              <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider font-semibold">Steps Completed</p>
            </div>
          )}
        </div>

        {status.error && (
          <div className="rounded-2xl border border-destructive/50 bg-destructive/10 p-5 text-destructive shadow-sm">
            <div className="flex items-center gap-2 font-bold mb-2 text-lg">
              <XCircle className="h-6 w-6" />
              Pipeline Error
            </div>
            <p className="text-base leading-relaxed text-destructive/90">{status.error}</p>
          </div>
        )}

        {steps && steps.length > 0 && (
          <div className="flex flex-col gap-5 pt-2">
            <h4 className="font-bold text-sm text-foreground uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
              Execution Execution Log
            </h4>
            <div className="flex flex-col gap-3">
              {steps.map((step, index) => {
                const isCurrent = index === stepNumber;
                return (
                  <div
                    key={index}
                    className={`flex items-start gap-4 p-4 rounded-2xl transition-all duration-300 ${
                      isCurrent 
                        ? 'bg-muted/50 border border-border/80 shadow-md transform scale-[1.01]' 
                        : 'opacity-70 hover:opacity-100 hover:bg-muted/30'
                    }`}
                  >
                    <div className="mt-0.5">{getStepIcon(step.status)}</div>
                    <div className="flex flex-col gap-1.5 w-full">
                      <span className={`text-base font-semibold ${isCurrent ? 'text-foreground' : 'text-muted-foreground'}`}>{step.name}</span>
                      {step.message && (
                        <span className="text-sm text-muted-foreground/90 bg-background/50 p-2 rounded-lg border border-border/30 font-mono inline-block">{step.message}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {architecture && status.status === 'processing' && (
          <div className="mt-6 pt-8 border-t border-border/50">
            <h4 className="font-bold text-sm text-foreground uppercase tracking-widest mb-6 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Architecture Preview
            </h4>
            <div className="rounded-2xl overflow-hidden border border-border bg-muted/20">
              <ArchitecturePreview architecture={architecture} />
            </div>
          </div>
        )}
      </div>

      {status.status === 'processing' && (
         <div className="absolute top-0 left-0 h-1 bg-brand animate-pulse w-full rounded-t-3xl" />
      )}
    </div>
  );
};
