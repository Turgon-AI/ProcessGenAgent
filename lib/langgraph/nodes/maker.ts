// Maker node - generates presentations using Manus API

import { WorkflowState } from '../state';
import { createManusClient } from '../../manus/client';
import { ManusFileInput } from '../../manus/types';
import { UploadedFile } from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface MakerNodeDeps {
  manusApiKey: string;
}

/** Create the maker node function */
export function createMakerNode(deps: MakerNodeDeps) {
  const client = createManusClient({ apiKey: deps.manusApiKey });

  return async (state: WorkflowState): Promise<Partial<WorkflowState>> => {
    const iteration = state.currentIteration + 1;

    console.log(`[Maker] Starting iteration ${iteration}`);

    // Build the prompt with feedback if available
    const prompt = buildMakerPrompt(state.makerPrompt, state.feedback);

    // Convert input files to Manus format (use URLs directly)
    const files = prepareInputFiles(state.inputFiles);

    // Generate presentation via Manus task API
    const result = await client.generatePresentation({
      prompt,
      files,
      previousFeedback: state.feedback || undefined,
    });

    console.log(`[Maker] Task completed: ${result.taskId}`);

    // Create output file record from the Manus result URL
    const outputFile = createOutputFile(result.outputUrl, result.filename, iteration);

    return {
      currentIteration: iteration,
      currentOutput: outputFile,
      currentThumbnails: [], // Thumbnails generated separately
    };
  };
}

/** Build maker prompt with optional feedback */
function buildMakerPrompt(basePrompt: string, feedback: string | null): string {
  if (!feedback) return basePrompt;

  return `${basePrompt}

## Previous Feedback to Address

The previous version had these issues that must be fixed:
${feedback}

Please ensure all issues are addressed in this version.`;
}

/** Prepare input files for Manus API (use URLs directly) */
function prepareInputFiles(files: UploadedFile[]): ManusFileInput[] {
  return files.map((file) => ({
    name: file.name,
    url: file.url,
    mimeType: file.type,
  }));
}

/** Create an UploadedFile record from Manus output */
function createOutputFile(
  url: string,
  filename: string,
  iteration: number
): UploadedFile {
  return {
    id: uuidv4(),
    name: filename || `iteration_${iteration}_output.pptx`,
    size: 0, // Size unknown from URL
    type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    url,
    uploadedAt: new Date(),
  };
}
