// File management actions

import { StateCreator } from 'zustand';
import { WorkflowStore } from '../types';

export type FileActions = Pick<
  WorkflowStore,
  | 'addInputFile'
  | 'removeInputFile'
  | 'clearInputFiles'
  | 'addSampleFile'
  | 'removeSampleFile'
  | 'clearSampleFiles'
>;

export const createFileActions: StateCreator<WorkflowStore, [], [], FileActions> = (set) => ({
  addInputFile: (file) =>
    set((state) => ({
      inputFiles: [...state.inputFiles, file],
    })),

  removeInputFile: (fileId) =>
    set((state) => ({
      inputFiles: state.inputFiles.filter((f) => f.id !== fileId),
    })),

  clearInputFiles: () => set({ inputFiles: [] }),

  addSampleFile: (file) =>
    set((state) => ({
      sampleFiles: [...state.sampleFiles, file],
    })),

  removeSampleFile: (fileId) =>
    set((state) => ({
      sampleFiles: state.sampleFiles.filter((f) => f.id !== fileId),
    })),

  clearSampleFiles: () => set({ sampleFiles: [] }),
});
