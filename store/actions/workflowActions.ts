// Workflow execution actions

import { StateCreator } from 'zustand';
import { IterationRecord } from '@/types';
import { WorkflowStore } from '../types';
import { initialWorkflowState } from '../initialState';

export type WorkflowActions = Pick<
  WorkflowStore,
  | 'setConfig'
  | 'startWorkflow'
  | 'stopWorkflow'
  | 'setStatus'
  | 'startIteration'
  | 'completeMakerStep'
  | 'completeCheckerStep'
  | 'completeWorkflow'
  | 'setSelectedIteration'
  | 'resetWorkflow'
  | 'resetAll'
>;

export const createWorkflowActions: StateCreator<WorkflowStore, [], [], WorkflowActions> = (
  set,
  get
) => ({
  setConfig: (config) =>
    set((state) => ({
      config: { ...state.config, ...config },
    })),

  startWorkflow: (runId) =>
    set({
      runId,
      status: 'running',
      currentIteration: 0,
      iterationHistory: [],
      finalOutput: null,
      success: false,
      startTime: new Date(),
      endTime: null,
      feedback: null,
    }),

  stopWorkflow: () =>
    set({
      status: 'stopped',
      endTime: new Date(),
    }),

  setStatus: (status) => set({ status }),

  startIteration: (iteration) =>
    set({
      currentIteration: iteration,
    }),

  completeMakerStep: (iteration, outputFile, thumbnailUrls, duration) =>
    set((state) => {
      const partialRecord: IterationRecord = {
        iteration,
        timestamp: new Date(),
        makerDuration: duration,
        checkerDuration: 0,
        outputFileId: outputFile.id,
        outputFileUrl: outputFile.url,
        thumbnailUrls,
        passed: false,
        confidence: 0,
        feedback: '',
        issues: [],
      };

      return {
        currentOutput: outputFile,
        iterationHistory: [...state.iterationHistory, partialRecord],
        selectedIteration: iteration,
      };
    }),

  completeCheckerStep: (iteration, passed, confidence, feedback, issues, duration) =>
    set((state) => {
      const updatedHistory = state.iterationHistory.map((record) =>
        record.iteration === iteration
          ? { ...record, checkerDuration: duration, passed, confidence, feedback, issues }
          : record
      );

      return {
        iterationHistory: updatedHistory,
        feedback: passed ? null : feedback,
      };
    }),

  completeWorkflow: (success, finalOutput) =>
    set({
      status: success ? 'completed' : 'failed',
      success,
      finalOutput,
      endTime: new Date(),
    }),

  setSelectedIteration: (iteration) => set({ selectedIteration: iteration }),

  resetWorkflow: () =>
    set({
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
      selectedIteration: null,
    }),

  resetAll: () =>
    set({
      ...initialWorkflowState,
      makerPresets: get().makerPresets,
      checkerPresets: get().checkerPresets,
      selectedIteration: null,
    }),
});
