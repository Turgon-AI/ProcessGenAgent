// LangGraph state schema

import { Annotation } from '@langchain/langgraph';
import { UploadedFile, IterationRecord } from '@/types';

/** LangGraph state annotation */
export const WorkflowStateAnnotation = Annotation.Root({
  // Inputs (immutable during workflow)
  runId: Annotation<string>,
  inputFiles: Annotation<UploadedFile[]>,
  makerPrompt: Annotation<string>,
  checkerPrompt: Annotation<string>,
  guidelines: Annotation<string>,
  sampleFiles: Annotation<UploadedFile[]>,

  // Configuration
  maxIterations: Annotation<number>,
  confidenceThreshold: Annotation<number>,
  autoStopOnPass: Annotation<boolean>,

  // Runtime state (updated each iteration)
  currentIteration: Annotation<number>,
  currentOutput: Annotation<UploadedFile | null>,
  currentOutputPdf: Annotation<UploadedFile | null>,
  currentThumbnails: Annotation<string[]>,
  feedback: Annotation<string | null>,
  manusTaskId: Annotation<string | null>,
  lastOutputSignature: Annotation<string | null>,

  // History (appended each iteration)
  iterationHistory: Annotation<IterationRecord[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),

  // Result
  finalOutput: Annotation<UploadedFile | null>,
  success: Annotation<boolean>,
  shouldStop: Annotation<boolean>,
  errorMessage: Annotation<string | null>,
});

export type WorkflowState = typeof WorkflowStateAnnotation.State;

/** Create initial workflow state */
export function createInitialState(params: {
  runId: string;
  inputFiles: UploadedFile[];
  makerPrompt: string;
  checkerPrompt: string;
  guidelines: string;
  sampleFiles: UploadedFile[];
  maxIterations: number;
  confidenceThreshold: number;
  autoStopOnPass: boolean;
}): WorkflowState {
  return {
    ...params,
    currentIteration: 0,
    currentOutput: null,
    currentOutputPdf: null,
    currentThumbnails: [],
    feedback: null,
    manusTaskId: null,
    lastOutputSignature: null,
    iterationHistory: [],
    finalOutput: null,
    success: false,
    shouldStop: false,
    errorMessage: null,
  };
}
