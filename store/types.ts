// Store types and interfaces

import {
  WorkflowState,
  WorkflowConfig,
  UploadedFile,
  WorkflowStatus,
  PromptPreset,
} from '@/types';

export interface WorkflowStore extends WorkflowState {
  // Prompt presets (persisted)
  makerPresets: PromptPreset[];
  checkerPresets: PromptPreset[];

  // Actions - File Management
  addInputFile: (file: UploadedFile) => void;
  removeInputFile: (fileId: string) => void;
  clearInputFiles: () => void;
  addSampleFile: (file: UploadedFile) => void;
  removeSampleFile: (fileId: string) => void;
  clearSampleFiles: () => void;

  // Actions - Prompt Management
  setMakerPrompt: (prompt: string) => void;
  setCheckerPrompt: (prompt: string) => void;
  setGuidelines: (guidelines: string) => void;

  // Actions - Prompt Presets
  saveMakerPreset: (name: string) => void;
  saveCheckerPreset: (name: string) => void;
  loadMakerPreset: (presetId: string) => void;
  loadCheckerPreset: (presetId: string) => void;
  deleteMakerPreset: (presetId: string) => void;
  deleteCheckerPreset: (presetId: string) => void;

  // Actions - Configuration
  setConfig: (config: Partial<WorkflowConfig>) => void;

  // Actions - Workflow Execution
  startWorkflow: (runId: string) => void;
  stopWorkflow: () => void;
  setStatus: (status: WorkflowStatus) => void;

  // Actions - Iteration Updates
  startIteration: (iteration: number) => void;
  completeMakerStep: (
    iteration: number,
    outputFile: UploadedFile,
    thumbnailUrls: string[],
    duration: number
  ) => void;
  completeCheckerStep: (
    iteration: number,
    passed: boolean,
    confidence: number,
    feedback: string,
    issues: string[],
    duration: number
  ) => void;
  completeWorkflow: (success: boolean, finalOutput: UploadedFile | null) => void;

  // Actions - Preview
  setSelectedIteration: (iteration: number | null) => void;
  selectedIteration: number | null;

  // Actions - Reset
  resetWorkflow: () => void;
  resetAll: () => void;
}
