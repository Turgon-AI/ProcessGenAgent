// Initial state for workflow store

import {
  WorkflowState,
  WorkflowConfig,
  DEFAULT_WORKFLOW_CONFIG,
} from '@/types';

export const initialWorkflowState: Omit<WorkflowState, 'config'> & {
  config: WorkflowConfig;
} = {
  inputFiles: [],
  makerPrompt: '',
  checkerPrompt: '',
  guidelines: '',
  sampleFiles: [],
  config: DEFAULT_WORKFLOW_CONFIG,
  runId: null,
  status: 'idle',
  currentIteration: 0,
  currentOutput: null,
  feedback: null,
  iterationHistory: [],
  finalOutput: null,
  success: false,
  startTime: null,
  endTime: null,
};
