// Checker node - validates presentations using Claude

import { WorkflowState } from '../state';
import { createCheckerClient } from '../../checker/client';
import { buildCheckerPrompt, PromptContext } from '../../checker/prompts';
import { IterationRecord, UploadedFile } from '@/types';

interface CheckerNodeDeps {
  anthropicApiKey: string;
}

/** Create the checker node function */
export function createCheckerNode(deps: CheckerNodeDeps) {
  const client = createCheckerClient({ apiKey: deps.anthropicApiKey });

  return async (state: WorkflowState): Promise<Partial<WorkflowState>> => {
    if (!state.currentOutput) {
      throw new Error('No output to check');
    }

    const startTime = Date.now();

    // Build the checker prompt
    const promptContext: PromptContext = {
      userPrompt: state.checkerPrompt,
      guidelines: state.guidelines,
      iterationNumber: state.currentIteration,
      previousFeedback: state.feedback || undefined,
      confidenceThreshold: state.confidenceThreshold,
    };
    const prompt = buildCheckerPrompt(promptContext);

    // Fetch the presentation buffer
    const presentation = state.currentOutputPdf ?? state.currentOutput;
    if (!presentation) {
      throw new Error('No presentation output available for checker');
    }

    // Determine if presentation is from Manus sandbox (generated) vs uploads (input re-uploaded)
    const isManusOutput = presentation.url.includes('manuscdn.com');
    const isSandbox = presentation.url.includes('/sandbox/');
    const isUploads = presentation.url.includes('/uploads/');
    
    console.log('\n========== CHECKER: FILES BEING SENT TO CLAUDE ==========');
    console.log(`[PRESENTATION TO REVIEW]`);
    console.log(`  Name: ${presentation.name}`);
    console.log(`  Type: ${presentation.type}`);
    console.log(`  URL: ${presentation.url.substring(0, 120)}...`);
    if (isSandbox) {
      console.log(`  Source: MANUS SANDBOX (generated output - CORRECT!)`);
    } else if (isUploads) {
      console.log(`  Source: WARNING! MANUS UPLOADS (this is an INPUT file, not generated output!)`);
    } else if (isManusOutput) {
      console.log(`  Source: MANUS (check path manually)`);
    } else {
      console.log(`  Source: WARNING: NOT from Manus!`);
    }
    
    const presentationBuffer = await fetchFileAsBuffer(presentation.url);
    console.log(`  Size: ${presentationBuffer.length} bytes`);
    
    console.log(`\n[SOURCE FILES (for reference)]`);
    if (state.inputFiles.length === 0) {
      console.log('  (none)');
    } else {
      state.inputFiles.forEach((f, i) => {
        console.log(`  ${i + 1}. ${f.name} (${f.type}) - ${f.url.substring(0, 80)}...`);
      });
    }
    
    console.log(`\n[SAMPLE/STYLE FILES (for reference)]`);
    if (state.sampleFiles.length === 0) {
      console.log('  (none)');
    } else {
      state.sampleFiles.forEach((f, i) => {
        console.log(`  ${i + 1}. ${f.name} (${f.type}) - ${f.url.substring(0, 80)}...`);
      });
    }
    
    const attachments = await buildAttachments([
      ...state.inputFiles,
      ...state.sampleFiles,
    ]);
    
    console.log(`\n[TOTAL ATTACHMENTS FOR CLAUDE]`);
    console.log(`  Presentation: 1 file (${presentation.name})`);
    console.log(`  Source + Sample: ${attachments.length} file(s)`);
    if (attachments.length > 0) {
      attachments.forEach((a, i) => {
        console.log(`    ${i + 1}. ${a.name} (${a.mimeType}, ${a.buffer.length} bytes)`);
      });
    }
    console.log('==========================================================\n');

    // Review the presentation
    const result = await client.reviewPresentation({
      prompt,
      presentationBuffer,
      presentationName: presentation.name,
      presentationMimeType: presentation.type,
      attachments,
    });

    const duration = Date.now() - startTime;

    // Create iteration record
    const record: IterationRecord = {
      iteration: state.currentIteration,
      timestamp: new Date(),
      makerDuration: 0, // Set by maker node timing
      checkerDuration: duration,
      outputFileId: state.currentOutput.id,
      outputFileUrl: state.currentOutput.url,
      thumbnailUrls: state.currentThumbnails,
      passed: result.passed,
      confidence: result.confidence,
      feedback: result.feedback,
      issues: result.issues,
    };

    // Determine if we should stop
    const shouldStop = determineShouldStop(state, result.passed, result.confidence);

    return {
      iterationHistory: [record],
      feedback: result.passed ? null : formatFeedbackForMaker(result),
      shouldStop,
      success: result.passed && result.confidence >= state.confidenceThreshold,
      finalOutput: shouldStop ? state.currentOutput : null,
    };
  };
}

/** Determine if the workflow should stop */
function determineShouldStop(
  state: WorkflowState,
  passed: boolean,
  confidence: number
): boolean {
  // Stop if passed and auto-stop enabled
  if (passed && confidence >= state.confidenceThreshold && state.autoStopOnPass) {
    return true;
  }

  // Stop if max iterations reached
  if (state.currentIteration >= state.maxIterations) {
    return true;
  }

  return false;
}

/** Format feedback for the next maker iteration */
function formatFeedbackForMaker(result: { feedback: string; issues: string[] }): string {
  const parts = [result.feedback];

  if (result.issues.length > 0) {
    parts.push('\nSpecific issues to address:');
    result.issues.forEach((issue, i) => {
      parts.push(`${i + 1}. ${issue}`);
    });
  }

  return parts.join('\n');
}

/** Fetch file as Buffer */
async function fetchFileAsBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function buildAttachments(files: UploadedFile[]) {
  // Convert to array if it's an array-like object (can happen with LangGraph state serialization)
  const safeFiles = toArray(files);
  
  console.log(`[DEBUG buildAttachments] input type: ${typeof files}, isArray: ${Array.isArray(files)}, safeCount: ${safeFiles.length}`);
  
  const unique = new Map<string, UploadedFile>();
  for (const file of safeFiles) {
    if (!file || typeof file !== 'object') continue;
    // Use id if available, otherwise use url or name as fallback key
    const key = file.id || file.url || file.name;
    if (key && !unique.has(key)) {
      unique.set(key, file);
    }
  }

  const attachments = [];
  for (const file of unique.values()) {
    try {
      const buffer = await fetchFileAsBuffer(file.url);
      attachments.push({
        name: file.name,
        buffer,
        mimeType: file.type || 'application/octet-stream',
      });
    } catch (error) {
      console.warn(`[Checker] FAILED to fetch: ${file.name} - ${error}`);
    }
  }

  return attachments;
}

/** Convert array-like objects to actual arrays */
function toArray<T>(input: T[] | null | undefined): T[] {
  if (!input) return [];
  if (Array.isArray(input)) return input;
  // Handle array-like objects (e.g., from JSON serialization)
  if (typeof input === 'object' && input !== null) {
    // Check if it's iterable
    if (Symbol.iterator in input) {
      return Array.from(input as Iterable<T>);
    }
    // Check if it has numeric keys (array-like)
    const keys = Object.keys(input);
    if (keys.every(k => !isNaN(Number(k)))) {
      return Object.values(input) as T[];
    }
  }
  return [];
}
