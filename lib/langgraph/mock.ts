// Mock workflow for UI testing without API calls

import { SSEEvent, WorkflowStartRequest } from '@/types';
import { SSE_HEARTBEAT_INTERVAL_MS } from '../constants';

type SendEvent = (event: SSEEvent) => void;
type ShouldStop = () => boolean;

/** Run mock workflow for testing */
export async function runMockWorkflow(
  runId: string,
  request: WorkflowStartRequest,
  sendEvent: SendEvent,
  shouldStop: ShouldStop
): Promise<void> {
  const { maxIterations, confidenceThreshold } = request.config;
  const mockIterations = Math.min(3, maxIterations);

  for (let iteration = 1; iteration <= mockIterations; iteration++) {
    if (shouldStop()) {
      sendWorkflowStopped(sendEvent, iteration);
      return;
    }

    await runMockIteration(runId, iteration, sendEvent);

    const result = evaluateMockResult(iteration, mockIterations, confidenceThreshold);
    sendCheckerResult(sendEvent, iteration, result);

    if (shouldComplete(result, request.config.autoStopOnPass, iteration, maxIterations)) {
      sendWorkflowComplete(sendEvent, runId, iteration, result.passed);
      return;
    }
  }

  sendWorkflowComplete(sendEvent, runId, mockIterations, false);
}

/** Run a single mock iteration */
async function runMockIteration(
  runId: string,
  iteration: number,
  sendEvent: SendEvent
): Promise<void> {
  sendEvent({ type: 'iteration_start', iteration });
  await delay(1000);

  sendEvent({
    type: 'maker_complete',
    iteration,
    timestamp: new Date().toISOString(),
    outputFileId: `mock-file-${runId}-${iteration}`,
    outputFileUrl: `https://example.com/mock-output-${iteration}.pptx`,
    thumbnailUrls: [],
  });
  await delay(1000);
}

/** Evaluate mock checker result */
function evaluateMockResult(
  iteration: number,
  maxMockIterations: number,
  threshold: number
): { passed: boolean; confidence: number } {
  const isLast = iteration === maxMockIterations;
  const confidence = isLast ? 0.85 : 0.5 + iteration * 0.1;
  const passed = isLast && confidence >= threshold;
  return { passed, confidence };
}

/** Send checker result event */
function sendCheckerResult(
  sendEvent: SendEvent,
  iteration: number,
  result: { passed: boolean; confidence: number }
): void {
  sendEvent({
    type: 'checker_complete',
    iteration,
    passed: result.passed,
    confidence: result.confidence,
    feedback: result.passed
      ? 'The presentation meets all quality standards.'
      : `Iteration ${iteration}: Improvements needed in content structure.`,
    issues: result.passed
      ? []
      : [`Mock issue ${iteration}.1: Content needs more detail`, `Mock issue ${iteration}.2: Visual consistency`],
  });
}

/** Check if workflow should complete */
function shouldComplete(
  result: { passed: boolean },
  autoStopOnPass: boolean,
  iteration: number,
  maxIterations: number
): boolean {
  return (result.passed && autoStopOnPass) || iteration >= maxIterations;
}

/** Send workflow stopped event */
function sendWorkflowStopped(sendEvent: SendEvent, iteration: number): void {
  sendEvent({
    type: 'workflow_complete',
    success: false,
    totalIterations: iteration - 1,
    finalOutputFileId: '',
    finalOutputFileUrl: '',
  });
}

/** Send workflow complete event */
function sendWorkflowComplete(
  sendEvent: SendEvent,
  runId: string,
  iteration: number,
  success: boolean
): void {
  sendEvent({
    type: 'workflow_complete',
    success,
    totalIterations: iteration,
    finalOutputFileId: `mock-file-${runId}-${iteration}`,
    finalOutputFileUrl: `https://example.com/mock-output-${iteration}.pptx`,
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
