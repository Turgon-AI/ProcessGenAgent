// Workflow service - manages workflow execution and state

import { runWorkflowWithCallbacks, WorkflowCallbacks } from './workflow';
import { WorkflowState } from './state';
import { UploadedFile, SSEEvent } from '@/types';

interface WorkflowServiceConfig {
  manusApiKey: string;
  anthropicApiKey: string;
}

interface StartWorkflowParams {
  runId: string;
  inputFiles: UploadedFile[];
  makerPrompt: string;
  checkerPrompt: string;
  guidelines: string;
  sampleFiles: UploadedFile[];
  maxIterations: number;
  confidenceThreshold: number;
  autoStopOnPass: boolean;
}

type EventCallback = (event: SSEEvent) => void;

/** Execute workflow and emit SSE events */
export async function executeWorkflow(
  config: WorkflowServiceConfig,
  params: StartWorkflowParams,
  onEvent: EventCallback,
  shouldStop: () => boolean
): Promise<WorkflowState> {
  const callbacks: WorkflowCallbacks = {
    onIterationStart: (iteration) => {
      onEvent({ type: 'iteration_start', iteration });
    },

    onMakerComplete: (iteration, output, thumbnails) => {
      onEvent({
        type: 'maker_complete',
        iteration,
        timestamp: new Date().toISOString(),
        outputFileId: output.id,
        outputFileUrl: output.url,
        thumbnailUrls: thumbnails,
      });
    },

    onCheckerComplete: (iteration, passed, confidence, feedback, issues) => {
      onEvent({
        type: 'checker_complete',
        iteration,
        passed,
        confidence,
        feedback,
        issues,
      });
    },

    onWorkflowComplete: (success, finalOutput, totalIterations) => {
      onEvent({
        type: 'workflow_complete',
        success,
        totalIterations,
        finalOutputFileId: finalOutput?.id || '',
        finalOutputFileUrl: finalOutput?.url || '',
      });
    },

    onError: (error, iteration) => {
      onEvent({
        type: 'error',
        message: error.message,
        iteration,
      });
    },
  };

  return runWorkflowWithCallbacks(config, params, callbacks);
}

/** Get workflow configuration from environment */
export function getWorkflowConfig(): WorkflowServiceConfig {
  const manusApiKey = process.env.MANUS_API_KEY;
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

  if (!manusApiKey) {
    throw new Error('MANUS_API_KEY environment variable is required');
  }

  if (!anthropicApiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required');
  }

  return { manusApiKey, anthropicApiKey };
}
