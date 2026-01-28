'use client';

import { useCallback, useRef, useEffect, useMemo } from 'react';
import { useWorkflowStore } from '@/store/workflowStore';
import { createSSEHandler, parseSSEMessage, SSEHandlers } from '@/lib/sse';
import { UploadedFile } from '@/types';

interface UseWorkflowReturn {
  isRunning: boolean;
  canStart: boolean;
  startWorkflow: () => Promise<void>;
  stopWorkflow: () => Promise<void>;
  error: string | null;
}

export function useWorkflow(): UseWorkflowReturn {
  const eventSourceRef = useRef<EventSource | null>(null);
  const errorRef = useRef<string | null>(null);

  const {
    inputFiles,
    makerPrompt,
    checkerPrompt,
    guidelines,
    sampleFiles,
    config,
    status,
    runId,
    startWorkflow: storeStartWorkflow,
    stopWorkflow: storeStopWorkflow,
    startIteration,
    completeMakerStep,
    completeCheckerStep,
    completeWorkflow,
    setStatus,
  } = useWorkflowStore();

  const isRunning = status === 'running';

  const canStart =
    inputFiles.length > 0 &&
    makerPrompt.trim().length > 0 &&
    checkerPrompt.trim().length > 0 &&
    status !== 'running';

  // Create SSE handlers that integrate with store
  const sseHandlers: SSEHandlers = useMemo(() => ({
    onIterationStart: (iteration: number) => startIteration(iteration),
    onMakerComplete: (iteration: number, file: UploadedFile, thumbnails: string[]) => {
      completeMakerStep(iteration, file, thumbnails, 0);
    },
    onCheckerComplete: (iteration: number, passed: boolean, confidence: number, feedback: string, issues: string[]) => {
      completeCheckerStep(iteration, passed, confidence, feedback, issues, 0);
    },
    onWorkflowComplete: (success: boolean, finalOutput: UploadedFile | null) => {
      completeWorkflow(success, finalOutput);
      eventSourceRef.current?.close();
    },
    onError: (message: string) => {
      errorRef.current = message;
      setStatus('failed');
      eventSourceRef.current?.close();
    },
  }), [startIteration, completeMakerStep, completeCheckerStep, completeWorkflow, setStatus]);

  const handleSSEEvent = useMemo(() => createSSEHandler(sseHandlers), [sseHandlers]);

  // Start workflow
  const startWorkflowAction = useCallback(async () => {
    if (!canStart) return;

    errorRef.current = null;

    try {
      // Call the start API
      const response = await fetch('/api/workflow/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileIds: inputFiles.map((f) => f.id),
          makerPrompt,
          checkerPrompt,
          guidelines,
          sampleFileIds: sampleFiles.map((f) => f.id),
          config,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start workflow');
      }

      const { runId: newRunId } = await response.json();

      // Update store with run ID
      storeStartWorkflow(newRunId);

      // Connect to SSE for status updates
      const eventSource = new EventSource(`/api/workflow/status/${newRunId}`);
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        const data = parseSSEMessage(event.data);
        if (data) handleSSEEvent(data);
      };

      eventSource.onerror = () => {
        errorRef.current = 'Connection to server lost';
        setStatus('failed');
        eventSource.close();
      };
    } catch (err) {
      errorRef.current = err instanceof Error ? err.message : 'Failed to start workflow';
      setStatus('failed');
    }
  }, [
    canStart,
    inputFiles,
    makerPrompt,
    checkerPrompt,
    guidelines,
    sampleFiles,
    config,
    storeStartWorkflow,
    handleSSEEvent,
    setStatus,
  ]);

  // Stop workflow
  const stopWorkflowAction = useCallback(async () => {
    if (!runId) return;

    try {
      await fetch(`/api/workflow/stop/${runId}`, {
        method: 'POST',
      });
      storeStopWorkflow();
      eventSourceRef.current?.close();
    } catch (err) {
      console.error('Failed to stop workflow:', err);
    }
  }, [runId, storeStopWorkflow]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  return {
    isRunning,
    canStart,
    startWorkflow: startWorkflowAction,
    stopWorkflow: stopWorkflowAction,
    error: errorRef.current,
  };
}
