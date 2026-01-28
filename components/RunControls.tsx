'use client';

import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared';

interface RunControlsProps {
  isRunning: boolean;
  canStart: boolean;
  onStart: () => void;
  onStop: () => void;
}

export function RunControls({
  isRunning,
  canStart,
  onStart,
  onStop,
}: RunControlsProps) {
  return (
    <div className="flex items-center gap-3">
      {!isRunning ? (
        <Button
          onClick={onStart}
          disabled={!canStart}
          size="lg"
          className="gap-2 min-w-[160px] transition-all"
        >
          <PlayIcon />
          Run Workflow
        </Button>
      ) : (
        <Button
          onClick={onStop}
          variant="destructive"
          size="lg"
          className="gap-2 min-w-[160px] transition-all"
        >
          <StopIcon />
          Stop
        </Button>
      )}

      {!canStart && !isRunning && (
        <p className="text-sm text-muted-foreground max-w-[200px]">
          Upload files and configure prompts to start
        </p>
      )}
    </div>
  );
}

function PlayIcon() {
  return (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
      <rect x="6" y="6" width="12" height="12" />
    </svg>
  );
}
