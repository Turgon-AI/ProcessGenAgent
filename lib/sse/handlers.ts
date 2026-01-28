// SSE event handlers

import {
  SSEEvent,
  SSEIterationStartEvent,
  SSEMakerCompleteEvent,
  SSECheckerCompleteEvent,
  SSEWorkflowCompleteEvent,
  SSEErrorEvent,
  UploadedFile,
} from '@/types';

export interface SSEHandlers {
  onIterationStart: (iteration: number) => void;
  onMakerComplete: (iteration: number, file: UploadedFile, thumbnails: string[]) => void;
  onCheckerComplete: (iteration: number, passed: boolean, confidence: number, feedback: string, issues: string[]) => void;
  onWorkflowComplete: (success: boolean, finalOutput: UploadedFile | null) => void;
  onError: (message: string) => void;
}

/** Create SSE event handler from callbacks */
export function createSSEHandler(handlers: SSEHandlers) {
  return (event: SSEEvent) => {
    switch (event.type) {
      case 'iteration_start':
        handleIterationStart(event, handlers);
        break;
      case 'maker_complete':
        handleMakerComplete(event, handlers);
        break;
      case 'checker_complete':
        handleCheckerComplete(event, handlers);
        break;
      case 'workflow_complete':
        handleWorkflowComplete(event, handlers);
        break;
      case 'error':
        handleError(event, handlers);
        break;
    }
  };
}

function handleIterationStart(event: SSEIterationStartEvent, handlers: SSEHandlers) {
  handlers.onIterationStart(event.iteration);
}

function handleMakerComplete(event: SSEMakerCompleteEvent, handlers: SSEHandlers) {
  const file: UploadedFile = {
    id: event.outputFileId,
    name: `iteration_${event.iteration}_output.pptx`,
    size: 0,
    type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    url: event.outputFileUrl,
    uploadedAt: new Date(event.timestamp),
  };
  handlers.onMakerComplete(event.iteration, file, event.thumbnailUrls);
}

function handleCheckerComplete(event: SSECheckerCompleteEvent, handlers: SSEHandlers) {
  handlers.onCheckerComplete(
    event.iteration,
    event.passed,
    event.confidence,
    event.feedback,
    event.issues
  );
}

function handleWorkflowComplete(event: SSEWorkflowCompleteEvent, handlers: SSEHandlers) {
  const finalOutput: UploadedFile | null = event.finalOutputFileId
    ? {
        id: event.finalOutputFileId,
        name: 'final_output.pptx',
        size: 0,
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        url: event.finalOutputFileUrl,
        uploadedAt: new Date(),
      }
    : null;
  handlers.onWorkflowComplete(event.success, finalOutput);
}

function handleError(event: SSEErrorEvent, handlers: SSEHandlers) {
  handlers.onError(event.message);
}

/** Parse SSE message data safely */
export function parseSSEMessage(data: string): SSEEvent | null {
  try {
    return JSON.parse(data) as SSEEvent;
  } catch {
    console.error('Failed to parse SSE event:', data);
    return null;
  }
}
