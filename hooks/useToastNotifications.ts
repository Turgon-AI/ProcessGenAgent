'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useWorkflowStore } from '@/store/workflowStore';
import { WorkflowStatus } from '@/types';

/** Hook to show toast notifications for workflow events */
export function useToastNotifications() {
  const { status, iterationHistory, success } = useWorkflowStore();
  const prevStatusRef = useRef<WorkflowStatus>('idle');
  const prevIterationCountRef = useRef(0);

  useEffect(() => {
    const prevStatus = prevStatusRef.current;
    const prevIterationCount = prevIterationCountRef.current;

    // Workflow started
    if (prevStatus === 'idle' && status === 'running') {
      toast.info('Workflow started', {
        description: 'Generating presentation...',
      });
    }

    // Workflow completed successfully
    if (prevStatus === 'running' && status === 'completed' && success) {
      toast.success('Workflow completed!', {
        description: `Presentation passed validation after ${iterationHistory.length} iteration(s).`,
      });
    }

    // Workflow failed (max iterations)
    if (prevStatus === 'running' && status === 'failed') {
      toast.error('Workflow failed', {
        description: 'An error occurred during generation.',
      });
    }

    // Workflow completed but didn't pass
    if (prevStatus === 'running' && status === 'completed' && !success) {
      toast.warning('Max iterations reached', {
        description: 'Presentation did not pass validation.',
      });
    }

    // Workflow stopped manually
    if (prevStatus === 'running' && status === 'stopped') {
      toast.info('Workflow stopped', {
        description: 'You can download the last generated file.',
      });
    }

    // New iteration completed
    if (iterationHistory.length > prevIterationCount && iterationHistory.length > 0) {
      const latest = iterationHistory[iterationHistory.length - 1];
      if (latest.passed) {
        toast.success(`Iteration #${latest.iteration} passed!`, {
          description: `Confidence: ${(latest.confidence * 100).toFixed(0)}%`,
        });
      } else if (status === 'running') {
        toast.info(`Iteration #${latest.iteration} needs improvement`, {
          description: `Confidence: ${(latest.confidence * 100).toFixed(0)}%`,
        });
      }
    }

    prevStatusRef.current = status;
    prevIterationCountRef.current = iterationHistory.length;
  }, [status, iterationHistory, success]);
}
