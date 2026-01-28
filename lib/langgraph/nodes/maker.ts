// Maker node - generates presentations using Manus API

import { WorkflowState } from '../state';
import { createManusClient } from '../../manus/client';
import { ManusFileInput } from '../../manus/types';
import { uploadIterationOutput } from '../../storage/files';
import { UploadedFile } from '@/types';

interface MakerNodeDeps {
  manusApiKey: string;
}

/** Create the maker node function */
export function createMakerNode(deps: MakerNodeDeps) {
  const client = createManusClient({ apiKey: deps.manusApiKey });

  return async (state: WorkflowState): Promise<Partial<WorkflowState>> => {
    const iteration = state.currentIteration + 1;
    const startTime = Date.now();

    // Build the prompt with feedback if available
    const prompt = buildMakerPrompt(state.makerPrompt, state.feedback);

    // Convert input files to Manus format
    const files = await prepareInputFiles(state.inputFiles);

    // Generate presentation
    const result = await client.generatePresentation({
      prompt,
      files,
      outputFormat: 'pptx',
      previousFeedback: state.feedback || undefined,
    });

    // Upload to storage
    const outputFile = await uploadIterationOutput(
      result.buffer,
      state.runId,
      iteration,
      `iteration_${iteration}_output.pptx`
    );

    const duration = Date.now() - startTime;

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

/** Prepare input files for Manus API */
async function prepareInputFiles(files: UploadedFile[]): Promise<ManusFileInput[]> {
  const prepared: ManusFileInput[] = [];

  for (const file of files) {
    const content = await fetchFileAsBase64(file.url);
    prepared.push({
      name: file.name,
      content,
      mimeType: file.type,
    });
  }

  return prepared;
}

/** Fetch file and convert to base64 */
async function fetchFileAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer).toString('base64');
}
