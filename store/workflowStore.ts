import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { WorkflowStore } from './types';
import { initialWorkflowState } from './initialState';
import {
  createFileActions,
  createPromptActions,
  createWorkflowActions,
} from './actions';

export const useWorkflowStore = create<WorkflowStore>()(
  persist(
    (set, get, store) => ({
      // Initial state
      ...initialWorkflowState,
      makerPresets: [],
      checkerPresets: [],
      selectedIteration: null,

      // Spread in modular actions
      ...createFileActions(set, get, store),
      ...createPromptActions(set, get, store),
      ...createWorkflowActions(set, get, store),
    }),
    {
      name: 'maker-checker-workflow',
      partialize: (state) => ({
        // Only persist presets and prompts
        makerPresets: state.makerPresets,
        checkerPresets: state.checkerPresets,
        makerPrompt: state.makerPrompt,
        checkerPrompt: state.checkerPrompt,
        guidelines: state.guidelines,
        config: state.config,
      }),
    }
  )
);

// Re-export types for convenience
export type { WorkflowStore } from './types';
