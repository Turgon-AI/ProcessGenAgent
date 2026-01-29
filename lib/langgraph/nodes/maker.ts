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
    const isFirstIteration = state.currentIteration === 0;
    const hasFeedback = state.currentIteration > 0 && !!state.feedback;

    console.log('\n========== MAKER: STARTING ITERATION ==========');
    console.log(`  Iteration: ${iteration}`);
    console.log(`  Is First: ${isFirstIteration}`);
    console.log(`  Has Feedback: ${hasFeedback}`);
    console.log(`  Existing Task ID: ${state.manusTaskId || 'none (will create new)'}`);
    console.log(`  Previous Output Signature: ${state.lastOutputSignature || 'none'}`);

    // Build the prompt: first iteration uses base prompt, later iterations only send feedback
    const prompt = hasFeedback
      ? buildFeedbackOnlyPrompt(state.feedback || '')
      : buildMakerPrompt(state.makerPrompt, state.guidelines);

    console.log(`\n[PROMPT TYPE]: ${hasFeedback ? 'FEEDBACK ONLY' : 'FULL MAKER PROMPT'}`);
    if (hasFeedback) {
      console.log(`[FEEDBACK PREVIEW]: ${state.feedback?.substring(0, 200)}...`);
    }

    // Convert input + sample files to Manus format (use URLs directly)
    // Only attach source files on the first iteration; Manus retains context afterward.
    console.log(`\n[DEBUG] inputFiles: ${JSON.stringify(state.inputFiles?.length ?? 'undefined')}`);
    console.log(`[DEBUG] sampleFiles: ${JSON.stringify(state.sampleFiles?.length ?? 'undefined')}`);
    
    const mergedFiles = isFirstIteration
      ? mergeFiles(state.inputFiles, state.sampleFiles)
      : [];
    
    console.log(`[DEBUG] mergedFiles count: ${mergedFiles.length}`);
    
    const files = prepareInputFiles(mergedFiles);
    
    console.log(`\n[FILES SENT TO MANUS]:`);
    if (files.length > 0) {
      files.forEach((f, i) => {
        console.log(`  ${i + 1}. ${f.name} (${f.mimeType})`);
      });
    } else {
      console.log(`  (none - Manus has context from previous iterations)`);
    }

    console.log(`\n[CALLING MANUS API...]`);
    
    // Generate presentation via Manus task API
    const result = await client.generatePresentation({
      prompt,
      files,
      taskId: state.manusTaskId || undefined,
      previousOutputSignature: state.lastOutputSignature || undefined,
      inputUrls: isFirstIteration ? files.map((file) => file.url) : undefined,
    });

    console.log(`\n[MANUS RESULT]:`);
    console.log(`  Task ID: ${result.taskId}`);
    console.log(`  Task URL: ${result.taskUrl}`);
    console.log(`  Continued Existing Task: ${Boolean(state.manusTaskId)}`);
    console.log(`  PPTX: ${result.filename}`);
    console.log(`  PPTX URL: ${result.outputUrl.substring(0, 100)}...`);
    console.log(`  PPTX is sandbox: ${result.outputUrl.includes('/sandbox/') ? 'YES (correct)' : 'NO (check!)'}`);
    console.log(`  PDF: ${result.pdfFilename || 'NOT FOUND'}`);
    if (result.pdfUrl) {
      console.log(`  PDF URL: ${result.pdfUrl.substring(0, 100)}...`);
      console.log(`  PDF is sandbox: ${result.pdfUrl.includes('/sandbox/') ? 'YES (correct)' : 'NO (input file!)'}`);
    } else {
      console.log(`  PDF URL: N/A`);
    }
    
    const signatureChanged = state.lastOutputSignature !== result.outputSignature;
    console.log(`  Signature Changed: ${signatureChanged ? 'YES (new output!)' : 'NO (same output)'}`);
    console.log('=================================================\n');

    // Create output file record from the Manus result URL
    const outputFile = createOutputFile(result.outputUrl, result.filename, iteration);
    const outputPdf = result.pdfUrl
      ? createOutputFile(result.pdfUrl, result.pdfFilename || 'presentation.pdf', iteration, 'application/pdf')
      : null;

    return {
      currentIteration: iteration,
      currentOutput: outputFile,
      currentOutputPdf: outputPdf,
      currentThumbnails: [], // Thumbnails generated separately
      manusTaskId: state.manusTaskId || result.taskId,
      lastOutputSignature: result.outputSignature || null,
    };
  };
}

/** Build maker prompt for the first iteration */
function buildMakerPrompt(basePrompt: string, guidelines: string): string {
  let prompt = basePrompt;

  if (guidelines?.trim()) {
    prompt += `\n\n## Written Guidelines\n\n${guidelines.trim()}`;
  }

  return prompt;
}

function buildFeedbackOnlyPrompt(feedback: string): string {
  return `##  Feedback to Address\n\n${feedback}\n\nPlease apply ONLY these fixes in this new version.`;
}

/** Prepare input files for Manus API (use URLs directly) */
function prepareInputFiles(files: UploadedFile[]): ManusFileInput[] {
  return files.map((file) => ({
    name: file.name,
    url: file.url,
    mimeType: file.type,
  }));
}

function mergeFiles(inputFiles: UploadedFile[], sampleFiles: UploadedFile[]): UploadedFile[] {
  const seen = new Set<string>();
  const merged: UploadedFile[] = [];

  // Safely combine arrays, filtering out undefined/null entries
  const allFiles = [
    ...(inputFiles || []),
    ...(sampleFiles || []),
  ].filter((file): file is UploadedFile => file != null && typeof file === 'object');

  for (const file of allFiles) {
    // Use id if available, otherwise use url or name as fallback key
    const key = file.id || file.url || file.name;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(file);
  }

  return merged;
}

/** Create an UploadedFile record from Manus output */
function createOutputFile(
  url: string,
  filename: string,
  iteration: number,
  mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
): UploadedFile {
  return {
    id: uuidv4(),
    name: filename || `iteration_${iteration}_output.pptx`,
    size: 0, // Size unknown from URL
    type: mimeType,
    url,
    uploadedAt: new Date(),
  };
}
