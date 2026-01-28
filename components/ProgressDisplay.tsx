'use client';

import { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { WorkflowStatus } from '@/types';
import { LoadingSpinner } from '@/components/shared';

interface ProgressDisplayProps {
  status: WorkflowStatus;
  currentIteration: number;
  maxIterations: number;
  startTime: Date | null;
}

export function ProgressDisplay({
  status,
  currentIteration,
  maxIterations,
  startTime,
}: ProgressDisplayProps) {
  const [elapsedTime, setElapsedTime] = useState('0:00');

  useEffect(() => {
    if (status !== 'running' || !startTime) return;

    const updateElapsed = () => {
      const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      setElapsedTime(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [status, startTime]);

  if (status === 'idle') return null;

  const progress = maxIterations > 0 ? (currentIteration / maxIterations) * 100 : 0;
  const statusText = getStatusText(status, currentIteration);
  const badgeVariant = getStatusBadgeVariant(status);

  return (
    <div className="space-y-3 p-4 bg-muted/30 rounded-lg border border-muted transition-all duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {status === 'running' && <LoadingSpinner size="sm" />}
          <Badge variant={badgeVariant} className="transition-colors">
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
          <span className="text-sm text-muted-foreground">{statusText}</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground tabular-nums">
            {currentIteration} / {maxIterations}
          </span>
          {status === 'running' && (
            <span className="font-mono text-muted-foreground tabular-nums">{elapsedTime}</span>
          )}
        </div>
      </div>

      <Progress value={progress} className="h-2 transition-all duration-500" />
    </div>
  );
}

function getStatusText(status: WorkflowStatus, currentIteration: number): string {
  switch (status) {
    case 'idle':
      return 'Ready to start';
    case 'running':
      return currentIteration === 0 ? 'Initializing...' : `Iteration ${currentIteration} in progress...`;
    case 'completed':
      return 'Workflow completed successfully';
    case 'failed':
      return 'Workflow failed';
    case 'stopped':
      return 'Workflow stopped';
    default:
      return '';
  }
}

function getStatusBadgeVariant(status: WorkflowStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'running':
      return 'default';
    case 'completed':
      return 'secondary';
    case 'failed':
    case 'stopped':
      return 'destructive';
    default:
      return 'outline';
  }
}
