// Checker node - validates presentations using Claude

import { WorkflowState } from '../state';
import { createCheckerClient } from '../../checker/client';
import { buildCheckerPrompt, PromptContext } from '../../checker/prompts';
import { IterationRecord } from '@/types';

interface CheckerNodeDeps {
  anthropicApiKey: string;
}

/** Create the checker node function */
export function createCheckerNode(deps: CheckerNodeDeps) {
  const client = createCheckerClient({ apiKey: deps.anthropicApiKey });

  return async (state: WorkflowState): Promise<Partial<WorkflowState>> => {
    if (!state.currentOutput) {
      throw new Error('No output to check');
    }

    const startTime = Date.now();

    // Build the checker prompt
    const promptContext: PromptContext = {
      userPrompt: state.checkerPrompt,
      guidelines: state.guidelines,
      iterationNumber: state.currentIteration,
      previousFeedback: state.feedback || undefined,
    };
    const prompt = buildCheckerPrompt(promptContext);

    // Fetch the presentation buffer
    const presentationBuffer = await fetchFileAsBuffer(state.currentOutput.url);

    // Review the presentation
    const result = await client.reviewPresentation({
      prompt,
      presentationBuffer,
      presentationName: state.currentOutput.name,
    });

    const duration = Date.now() - startTime;

    // Create iteration record
    const record: IterationRecord = {
      iteration: state.currentIteration,
      timestamp: new Date(),
      makerDuration: 0, // Set by maker node timing
      checkerDuration: duration,
      outputFileId: state.currentOutput.id,
      outputFileUrl: state.currentOutput.url,
      thumbnailUrls: state.currentThumbnails,
      passed: result.passed,
      confidence: result.confidence,
      feedback: result.feedback,
      issues: result.issues,
    };

    // Determine if we should stop
    const shouldStop = determineShouldStop(state, result.passed, result.confidence);

    return {
      iterationHistory: [record],
      feedback: result.passed ? null : formatFeedbackForMaker(result),
      shouldStop,
      success: result.passed && result.confidence >= state.confidenceThreshold,
      finalOutput: shouldStop ? state.currentOutput : null,
    };
  };
}

/** Determine if the workflow should stop */
function determineShouldStop(
  state: WorkflowState,
  passed: boolean,
  confidence: number
): boolean {
  // Stop if passed and auto-stop enabled
  if (passed && confidence >= state.confidenceThreshold && state.autoStopOnPass) {
    return true;
  }

  // Stop if max iterations reached
  if (state.currentIteration >= state.maxIterations) {
    return true;
  }

  return false;
}

/** Format feedback for the next maker iteration */
function formatFeedbackForMaker(result: { feedback: string; issues: string[] }): string {
  const parts = [result.feedback];

  if (result.issues.length > 0) {
    parts.push('\nSpecific issues to address:');
    result.issues.forEach((issue, i) => {
      parts.push(`${i + 1}. ${issue}`);
    });
  }

  return parts.join('\n');
}

/** Fetch file as Buffer */
async function fetchFileAsBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
