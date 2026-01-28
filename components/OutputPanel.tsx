'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { UploadedFile, WorkflowStatus, IterationRecord } from '@/types';

interface OutputPanelProps {
  status: WorkflowStatus;
  finalOutput: UploadedFile | null;
  success: boolean;
  totalIterations: number;
  lastIteration: IterationRecord | null;
}

export function OutputPanel({
  status,
  finalOutput,
  success,
  totalIterations,
  lastIteration,
}: OutputPanelProps) {
  if (status === 'idle' || status === 'running') {
    return null;
  }

  const isSuccess = status === 'completed' && success;

  return (
    <Card className="p-6">
      <div className="space-y-4">
        {isSuccess ? (
          <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
            <svg
              className="h-5 w-5 text-green-600 dark:text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <AlertTitle className="text-green-800 dark:text-green-200">
              Workflow Completed Successfully
            </AlertTitle>
            <AlertDescription className="text-green-700 dark:text-green-300">
              The presentation passed validation after {totalIterations} iteration
              {totalIterations !== 1 ? 's' : ''}.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert variant="destructive">
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <AlertTitle>
              {status === 'stopped' ? 'Workflow Stopped' : 'Validation Not Passed'}
            </AlertTitle>
            <AlertDescription>
              {status === 'stopped'
                ? 'The workflow was stopped manually.'
                : `Maximum iterations (${totalIterations}) reached without passing validation.`}
            </AlertDescription>
          </Alert>
        )}

        {/* Final Output Download */}
        {finalOutput && (
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <svg
                className="h-8 w-8 text-orange-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
              <div>
                <p className="font-medium">{finalOutput.name}</p>
                <p className="text-sm text-muted-foreground">
                  Final output • Iteration #{totalIterations}
                </p>
              </div>
            </div>
            <Button onClick={() => window.open(finalOutput.url, '_blank')}>
              <svg
                className="h-4 w-4 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Download
            </Button>
          </div>
        )}

        {/* Remaining Issues (if failed) */}
        {!isSuccess && lastIteration && lastIteration.issues.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Remaining Issues</h4>
            <ul className="space-y-1">
              {lastIteration.issues.map((issue, index) => (
                <li
                  key={index}
                  className="text-sm flex items-start gap-2 text-muted-foreground"
                >
                  <span className="text-destructive">•</span>
                  <span>{issue}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}
