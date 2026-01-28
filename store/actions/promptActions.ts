// Prompt management actions

import { StateCreator } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { WorkflowStore } from '../types';

export type PromptActions = Pick<
  WorkflowStore,
  | 'setMakerPrompt'
  | 'setCheckerPrompt'
  | 'setGuidelines'
  | 'saveMakerPreset'
  | 'saveCheckerPreset'
  | 'loadMakerPreset'
  | 'loadCheckerPreset'
  | 'deleteMakerPreset'
  | 'deleteCheckerPreset'
>;

export const createPromptActions: StateCreator<WorkflowStore, [], [], PromptActions> = (
  set,
  get
) => ({
  setMakerPrompt: (prompt) => set({ makerPrompt: prompt }),
  setCheckerPrompt: (prompt) => set({ checkerPrompt: prompt }),
  setGuidelines: (guidelines) => set({ guidelines }),

  saveMakerPreset: (name) =>
    set((state) => ({
      makerPresets: [
        ...state.makerPresets,
        {
          id: uuidv4(),
          name,
          content: state.makerPrompt,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    })),

  saveCheckerPreset: (name) =>
    set((state) => ({
      checkerPresets: [
        ...state.checkerPresets,
        {
          id: uuidv4(),
          name,
          content: state.checkerPrompt,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    })),

  loadMakerPreset: (presetId) => {
    const preset = get().makerPresets.find((p) => p.id === presetId);
    if (preset) {
      set({ makerPrompt: preset.content });
    }
  },

  loadCheckerPreset: (presetId) => {
    const preset = get().checkerPresets.find((p) => p.id === presetId);
    if (preset) {
      set({ checkerPrompt: preset.content });
    }
  },

  deleteMakerPreset: (presetId) =>
    set((state) => ({
      makerPresets: state.makerPresets.filter((p) => p.id !== presetId),
    })),

  deleteCheckerPreset: (presetId) =>
    set((state) => ({
      checkerPresets: state.checkerPresets.filter((p) => p.id !== presetId),
    })),
});
