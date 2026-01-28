// LangGraph workflow definition

import { StateGraph, END } from '@langchain/langgraph';
import { WorkflowStateAnnotation, WorkflowState, createInitialState } from './state';
import { createMakerNode } from './nodes/maker';
import { createCheckerNode } from './nodes/checker';
import { UploadedFile } from '@/types';

interface WorkflowConfig {
  manusApiKey: string;
  anthropicApiKey: string;
}

interface WorkflowInput {
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

/** Create the maker-checker workflow graph */
export function createWorkflow(config: WorkflowConfig) {
  const makerNode = createMakerNode({ manusApiKey: config.manusApiKey });
  const checkerNode = createCheckerNode({ anthropicApiKey: config.anthropicApiKey });

  const graph = new StateGraph(WorkflowStateAnnotation)
    .addNode('maker', makerNode)
    .addNode('checker', checkerNode)
    .addEdge('__start__', 'maker')
    .addEdge('maker', 'checker')
    .addConditionalEdges('checker', routeAfterChecker);

  return graph.compile();
}

/** Route after checker: continue or end */
function routeAfterChecker(state: WorkflowState): string {
  if (state.shouldStop) {
    return END;
  }
  return 'maker';
}

/** Create workflow input from request parameters */
export function createWorkflowInput(params: WorkflowInput): WorkflowState {
  return createInitialState(params);
}

/** Callback types for workflow events */
export interface WorkflowCallbacks {
  onIterationStart?: (iteration: number) => void;
  onMakerComplete?: (iteration: number, output: UploadedFile, thumbnails: string[]) => void;
  onCheckerComplete?: (iteration: number, passed: boolean, confidence: number, feedback: string, issues: string[]) => void;
  onWorkflowComplete?: (success: boolean, finalOutput: UploadedFile | null, totalIterations: number) => void;
  onError?: (error: Error, iteration: number) => void;
}

/** Run the workflow with callbacks for streaming events */
export async function runWorkflowWithCallbacks(
  config: WorkflowConfig,
  input: WorkflowInput,
  callbacks: WorkflowCallbacks
): Promise<WorkflowState> {
  const workflow = createWorkflow(config);
  const initialState = createWorkflowInput(input);

  let currentState = initialState;
  let lastIteration = 0;

  try {
    for await (const event of await workflow.stream(initialState)) {
      currentState = extractStateFromEvent(event, currentState);

      // Emit callbacks based on state changes
      if (currentState.currentIteration > lastIteration) {
        lastIteration = currentState.currentIteration;
        callbacks.onIterationStart?.(lastIteration);
      }

      if (event.maker && currentState.currentOutput) {
        callbacks.onMakerComplete?.(
          currentState.currentIteration,
          currentState.currentOutput,
          currentState.currentThumbnails
        );
      }

      if (event.checker) {
        const lastRecord = currentState.iterationHistory[currentState.iterationHistory.length - 1];
        if (lastRecord) {
          callbacks.onCheckerComplete?.(
            lastRecord.iteration,
            lastRecord.passed,
            lastRecord.confidence,
            lastRecord.feedback,
            lastRecord.issues
          );
        }
      }
    }

    callbacks.onWorkflowComplete?.(
      currentState.success,
      currentState.finalOutput,
      currentState.currentIteration
    );

    return currentState;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    callbacks.onError?.(err, currentState.currentIteration);
    throw error;
  }
}

/** Extract current state from stream event */
function extractStateFromEvent(
  event: Record<string, Partial<WorkflowState>>,
  currentState: WorkflowState
): WorkflowState {
  const updates = Object.values(event)[0];
  if (!updates) return currentState;

  return { ...currentState, ...updates };
}
