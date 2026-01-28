// Core type definitions for the Maker-Checker Agent System

// ============================================================================
// File Types
// ============================================================================

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: Date;
}

// ============================================================================
// Workflow Configuration
// ============================================================================

export interface WorkflowConfig {
  maxIterations: number;
  confidenceThreshold: number;
  autoStopOnPass: boolean;
}

export const DEFAULT_WORKFLOW_CONFIG: WorkflowConfig = {
  maxIterations: 20,
  confidenceThreshold: 0.8,
  autoStopOnPass: true,
};

// ============================================================================
// Workflow State
// ============================================================================

export type WorkflowStatus =
  | 'idle'
  | 'running'
  | 'completed'
  | 'failed'
  | 'stopped';

export interface IterationRecord {
  iteration: number;
  timestamp: Date;
  makerDuration: number;
  checkerDuration: number;

  // Generated file for THIS iteration
  outputFileId: string;
  outputFileUrl: string;
  thumbnailUrls: string[];

  // Checker results
  passed: boolean;
  confidence: number;
  feedback: string;
  issues: string[];
}

export interface WorkflowState {
  // Inputs
  inputFiles: UploadedFile[];
  makerPrompt: string;
  checkerPrompt: string;
  guidelines: string;
  sampleFiles: UploadedFile[];

  // Configuration
  config: WorkflowConfig;

  // Runtime state
  runId: string | null;
  status: WorkflowStatus;
  currentIteration: number;
  currentOutput: UploadedFile | null;
  feedback: string | null;

  // History
  iterationHistory: IterationRecord[];

  // Result
  finalOutput: UploadedFile | null;
  success: boolean;

  // Timing
  startTime: Date | null;
  endTime: Date | null;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface WorkflowStartRequest {
  fileIds: string[];
  makerPrompt: string;
  checkerPrompt: string;
  guidelines: string;
  sampleFileIds: string[];
  config: WorkflowConfig;
}

export interface WorkflowStartResponse {
  runId: string;
  status: 'started';
}

// SSE Event Types
export type SSEEventType =
  | 'iteration_start'
  | 'maker_complete'
  | 'checker_complete'
  | 'workflow_complete'
  | 'error';

export interface SSEIterationStartEvent {
  type: 'iteration_start';
  iteration: number;
}

export interface SSEMakerCompleteEvent {
  type: 'maker_complete';
  iteration: number;
  timestamp: string;
  outputFileId: string;
  outputFileUrl: string;
  thumbnailUrls: string[];
}

export interface SSECheckerCompleteEvent {
  type: 'checker_complete';
  iteration: number;
  passed: boolean;
  confidence: number;
  feedback: string;
  issues: string[];
}

export interface SSEWorkflowCompleteEvent {
  type: 'workflow_complete';
  success: boolean;
  totalIterations: number;
  finalOutputFileId: string;
  finalOutputFileUrl: string;
}

export interface SSEErrorEvent {
  type: 'error';
  message: string;
  iteration: number;
}

export type SSEEvent =
  | SSEIterationStartEvent
  | SSEMakerCompleteEvent
  | SSECheckerCompleteEvent
  | SSEWorkflowCompleteEvent
  | SSEErrorEvent;

// ============================================================================
// Checker Response
// ============================================================================

export interface CheckerResponse {
  passed: boolean;
  confidence: number;
  feedback: string;
  issues: string[];
}

// ============================================================================
// Manus API Types
// ============================================================================

export interface ManusRequest {
  files: UploadedFile[];
  prompt: string;
  outputFormat: 'pptx';
  feedback?: string; // Feedback from previous iteration
}

export interface ManusResponse {
  outputFile: Buffer;
  metadata: {
    slideCount: number;
  };
}

// ============================================================================
// Prompt Presets
// ============================================================================

export interface PromptPreset {
  id: string;
  name: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// LangGraph State
// ============================================================================

export interface LangGraphState {
  // Inputs
  inputFiles: UploadedFile[];
  makerPrompt: string;
  checkerPrompt: string;
  guidelines: string;
  sampleFiles: UploadedFile[];

  // Configuration
  maxIterations: number;
  confidenceThreshold: number;
  autoStopOnPass: boolean;

  // Runtime state
  runId: string;
  currentIteration: number;
  currentOutput: UploadedFile | null;
  currentThumbnails: string[];
  feedback: string | null;

  // History
  iterationHistory: IterationRecord[];

  // Result
  finalOutput: UploadedFile | null;
  success: boolean;
  shouldStop: boolean;
}
