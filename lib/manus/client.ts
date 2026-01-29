// Manus API client - task-based async API

import {
  ManusConfig,
  ManusClient,
  ManusFileResponse,
  ManusTaskCreateRequest,
  ManusTaskResponse,
  ManusGenerateRequest,
  ManusGenerateResult,
} from './types';
import { ManusError, ErrorCode } from '../errors';
import {
  MANUS_API_TIMEOUT_MS,
  MANUS_POLL_INTERVAL_MS,
} from '../constants';

const DEFAULT_BASE_URL = 'https://api.manus.ai/v1';

/** Create a configured Manus client */
export function createManusClient(config: ManusConfig): ManusClient {
  const baseUrl = config.baseUrl || DEFAULT_BASE_URL;
  const pollIntervalMs = config.pollIntervalMs || MANUS_POLL_INTERVAL_MS;

  const makeRequest = <T>(path: string, options: RequestInit) =>
    apiRequest<T>(config.apiKey, baseUrl, path, options);

  return {
    uploadFile: (filename, fileUrl, mimeType) => uploadFile(makeRequest, filename, fileUrl, mimeType),
    createTask: (request) => createTask(makeRequest, request),
    getTask: (taskId) => getTask(makeRequest, taskId),
    waitForTask: (taskId) => waitForTaskWithNewOutput(makeRequest, taskId, pollIntervalMs),
    generatePresentation: (request) =>
      generatePresentation(makeRequest, request, pollIntervalMs),
  };
}

type RequestFn = <T>(path: string, options: RequestInit) => Promise<T>;

/** Upload a file to Manus (requires publicly accessible URL) */
async function uploadFile(
  request: RequestFn,
  filename: string,
  fileUrl: string,
  mimeType?: string
): Promise<ManusFileResponse> {
  const record = await request<ManusFileResponse>('/files', {
    method: 'POST',
    body: JSON.stringify({ filename }),
  });

  if (!record.upload_url) {
    throw new ManusError('Manus file upload URL missing', {
      code: ErrorCode.MANUS_INVALID_RESPONSE,
    });
  }

  const fileResponse = await fetch(fileUrl);
  if (!fileResponse.ok) {
    throw new ManusError(`Failed to fetch file for upload: ${fileResponse.statusText}`, {
      code: ErrorCode.MANUS_API_ERROR,
    });
  }

  const contentType =
    mimeType || fileResponse.headers.get('content-type') || 'application/octet-stream';

  const uploadResponse = await fetch(record.upload_url, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
    },
    body: await fileResponse.arrayBuffer(),
  });

  if (!uploadResponse.ok) {
    throw new ManusError(`Failed to upload file to Manus: ${uploadResponse.statusText}`, {
      code: ErrorCode.MANUS_API_ERROR,
    });
  }

  return record;
}

/** Create a new task */
async function createTask(
  request: RequestFn,
  taskRequest: ManusTaskCreateRequest
): Promise<ManusTaskResponse> {
  const body = {
    prompt: taskRequest.prompt,
    attachments: taskRequest.attachments,
    task_mode: taskRequest.taskMode || 'agent',
    agent_profile: taskRequest.agentProfile || 'manus-1.6',
    connectors: taskRequest.connectors,
    create_shareable_link: taskRequest.createShareableLink ?? true,
    task_id: taskRequest.taskId,
  };

  const response = await request<ManusTaskResponse>('/tasks', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return normalizeTaskResponse(response);
}

/** Get task by ID */
async function getTask(request: RequestFn, taskId: string): Promise<ManusTaskResponse> {
  const response = await request<ManusTaskResponse>(`/tasks/${taskId}`, { method: 'GET' });
  return normalizeTaskResponse(response);
}

/** Poll task until completion and (optionally) new output */
async function waitForTaskWithNewOutput(
  request: RequestFn,
  taskId: string,
  pollIntervalMs: number,
  previousOutputSignature?: string
): Promise<ManusTaskResponse> {
  // Small initial delay to allow task to propagate (helps with eventual consistency on cloud)
  console.log(`[Manus] Waiting for task to propagate...`);
  await delay(1000);
  
  let notFoundRetries = 0;
  const maxNotFoundRetries = 5;
  
  while (true) {
    let task: ManusTaskResponse;
    try {
      task = await getTask(request, taskId);
    } catch (error) {
      // Handle 404 errors with retry (eventual consistency)
      if (error instanceof ManusError && error.message.includes('404')) {
        notFoundRetries++;
        console.log(`[Manus] Task not found (attempt ${notFoundRetries}/${maxNotFoundRetries}), retrying...`);
        if (notFoundRetries >= maxNotFoundRetries) {
          throw new ManusError(`Task ${taskId} not found after ${maxNotFoundRetries} attempts`, {
            code: ErrorCode.MANUS_API_ERROR,
          });
        }
        await delay(pollIntervalMs * 2); // Wait longer for 404s
        continue;
      }
      throw error;
    }
    
    // Reset retry counter on successful fetch
    notFoundRetries = 0;

    if (task.status === 'failed') {
      throw new ManusError(task.error?.message || 'Task failed', {
        code: ErrorCode.MANUS_TASK_FAILED,
      });
    }

    if (task.status === 'completed') {
      if (!previousOutputSignature) return task;
      const signature = buildOutputSignature(task);
      if (signature && signature !== previousOutputSignature) return task;
    }

    await delay(pollIntervalMs);
  }
}

/** High-level: generate presentation and wait for result */
async function generatePresentation(
  request: RequestFn,
  genRequest: ManusGenerateRequest,
  pollIntervalMs: number
): Promise<ManusGenerateResult> {
  // Build prompt with feedback if available
  const prompt = buildPrompt(genRequest);

  // Upload files to Manus and collect file IDs for attachments
  const attachments = genRequest.files?.length
    ? await Promise.all(
        genRequest.files.map(async (file) => {
          const uploaded = await uploadFile(request, file.name, file.url, file.mimeType);
          return {
            filename: file.name,
            file_id: uploaded.id,
          };
        })
      )
    : [];
  
  // Track input filenames to filter them out of output (Manus re-uploads inputs with new URLs)
  const inputFilenames = new Set(genRequest.files?.map((file) => file.name) || []);
  console.log(`[Manus] Input filenames to filter: ${Array.from(inputFilenames).join(', ') || 'none'}`);

  // Create the task
  const task = await createTask(request, {
    prompt,
    attachments,
    taskMode: genRequest.taskMode || 'agent',
    agentProfile: genRequest.agentProfile || 'manus-1.6',
    createShareableLink: true,
    taskId: genRequest.taskId,
  });

  console.log(`[Manus] Task created: ${task.id}, URL: ${task.url}`);

  // Wait for completion
  if (!task.id) {
    throw new ManusError('Manus task ID missing from create task response', {
      code: ErrorCode.MANUS_INVALID_RESPONSE,
    });
  }

  const completedTask = await waitForTaskWithNewOutput(
    request,
    task.id,
    pollIntervalMs,
    genRequest.previousOutputSignature
  );
  if (!completedTask.id) {
    throw new ManusError('Manus task ID missing from task status response', {
      code: ErrorCode.MANUS_INVALID_RESPONSE,
    });
  }

  // Extract PPTX output (filter out input files by checking /sandbox/ path and filename)
  let pptxOutput = findPptxOutput(completedTask, inputFilenames);
  let pdfOutput = findPdfOutput(completedTask, inputFilenames);

  if (!pptxOutput) {
    console.log('[Manus] PPTX not found, requesting export on same task');
    const exportTask = await createTask(request, {
      prompt: buildExportPrompt('pptx'),
      taskMode: genRequest.taskMode || 'agent',
      agentProfile: genRequest.agentProfile || 'manus-1.6',
      createShareableLink: true,
      taskId: completedTask.id,
    });

    if (!exportTask.id) {
      throw new ManusError('Manus task ID missing from export request response', {
        code: ErrorCode.MANUS_INVALID_RESPONSE,
      });
    }

    const exportCompleted = await waitForTaskWithNewOutput(
      request,
      exportTask.id,
      pollIntervalMs
    );
    pptxOutput = findPptxOutput(exportCompleted, inputFilenames);
  }

  if (!pdfOutput) {
    console.log('[Manus] PDF not found, requesting export on same task');
    const exportTask = await createTask(request, {
      prompt: buildExportPrompt('pdf'),
      taskMode: genRequest.taskMode || 'agent',
      agentProfile: genRequest.agentProfile || 'manus-1.6',
      createShareableLink: true,
      taskId: completedTask.id,
    });

    if (!exportTask.id) {
      throw new ManusError('Manus task ID missing from export request response', {
        code: ErrorCode.MANUS_INVALID_RESPONSE,
      });
    }

    const exportCompleted = await waitForTaskWithNewOutput(
      request,
      exportTask.id,
      pollIntervalMs
    );
    pdfOutput = findPdfOutput(exportCompleted, inputFilenames);
  }

  if (!pptxOutput) {
    throw new ManusError('No PPTX output found in task results', {
      code: ErrorCode.MANUS_INVALID_RESPONSE,
    });
  }

  // Build output signature from the final task state (for next iteration comparison)
  const outputSignature = buildOutputSignature(completedTask) || undefined;

  return {
    taskId: completedTask.id,
    taskUrl: completedTask.url || '',
    outputUrl: pptxOutput.url,
    filename: pptxOutput.filename || 'presentation.pptx',
    pdfUrl: pdfOutput?.url,
    pdfFilename: pdfOutput?.filename,
    outputSignature,
  };
}

/** Normalize task response fields across API variants */
function normalizeTaskResponse(task: ManusTaskResponse): ManusTaskResponse {
  return {
    ...task,
    id: task.id ?? task.task_id,
    url: task.url ?? task.task_url ?? task.share_url,
    title: task.title ?? task.task_title,
  };
}

/** Build the prompt for Manus */
function buildPrompt(request: ManusGenerateRequest): string {
  let prompt = request.prompt;

  // Add output format instruction
  prompt += '\n\nPlease provide both a PowerPoint (.pptx) file and a PDF export of the slides.';

  return prompt;
}

/**
 * Check if a URL is from Manus sandbox (generated output) vs uploads (input files re-uploaded)
 * Generated files: /sessionFile/{taskId}/sandbox/...
 * Uploaded inputs: /users/{userId}/uploads/...
 */
function isGeneratedOutput(url: string): boolean {
  return url.includes('/sandbox/') || url.includes('/sessionFile/');
}

function isUploadedInput(url: string): boolean {
  return url.includes('/uploads/');
}

/** Find PPTX output from task outputs - prefer generated files over uploaded inputs */
function findPptxOutput(
  task: ManusTaskResponse,
  inputFilenames: Set<string>
): { url: string; filename?: string } | null {
  const contents = task.output?.flatMap((item) => item.content || []) || [];
  
  // First pass: look for generated PPTX files (in /sandbox/)
  for (const content of contents) {
    if (!content.fileUrl) continue;
    const filename = content.fileName || '';
    const mimeType = content.mimeType || '';
    const isPptx = filename.endsWith('.pptx') || mimeType.includes('presentation');
    
    if (isPptx && isGeneratedOutput(content.fileUrl)) {
      console.log(`[Manus] Found generated PPTX: ${filename} (sandbox)`);
      return { url: content.fileUrl, filename: content.fileName };
    }
  }
  
  // Second pass: look for any PPTX that's not an input file by name
  for (const content of contents) {
    if (!content.fileUrl) continue;
    const filename = content.fileName || '';
    const mimeType = content.mimeType || '';
    const isPptx = filename.endsWith('.pptx') || mimeType.includes('presentation');
    
    if (isPptx && !inputFilenames.has(filename)) {
      console.log(`[Manus] Found PPTX by name filter: ${filename}`);
      return { url: content.fileUrl, filename: content.fileName };
    }
  }

  // Legacy outputs array
  const legacyOutput = task.outputs?.find(
    (o) =>
      (o.filename?.endsWith('.pptx') || o.mimeType?.includes('presentation')) &&
      !!o.url &&
      (isGeneratedOutput(o.url) || !inputFilenames.has(o.filename || ''))
  );

  if (legacyOutput?.url) {
    console.log(`[Manus] Found legacy PPTX: ${legacyOutput.filename}`);
    return { url: legacyOutput.url, filename: legacyOutput.filename };
  }

  return null;
}

/** Find PDF output from task outputs - prefer generated files over uploaded inputs */
function findPdfOutput(
  task: ManusTaskResponse,
  inputFilenames: Set<string>
): { url: string; filename?: string } | null {
  const contents = task.output?.flatMap((item) => item.content || []) || [];
  
  // First pass: look for generated PDF files (in /sandbox/) - these are exports of the presentation
  for (const content of contents) {
    if (!content.fileUrl) continue;
    const filename = content.fileName || '';
    const mimeType = content.mimeType || '';
    const isPdf = filename.endsWith('.pdf') || mimeType.includes('pdf');
    
    if (isPdf && isGeneratedOutput(content.fileUrl)) {
      console.log(`[Manus] Found generated PDF: ${filename} (sandbox)`);
      return { url: content.fileUrl, filename: content.fileName };
    }
  }
  
  // Second pass: look for any PDF that's not an input file by name
  // Skip this because PDFs in /uploads/ are likely the input source files
  for (const content of contents) {
    if (!content.fileUrl) continue;
    const filename = content.fileName || '';
    const mimeType = content.mimeType || '';
    const isPdf = filename.endsWith('.pdf') || mimeType.includes('pdf');
    
    // Only consider if NOT in uploads (which would be re-uploaded input files)
    if (isPdf && !isUploadedInput(content.fileUrl) && !inputFilenames.has(filename)) {
      console.log(`[Manus] Found PDF by path/name filter: ${filename}`);
      return { url: content.fileUrl, filename: content.fileName };
    }
  }

  // Legacy outputs array - only if generated
  const legacyOutput = task.outputs?.find(
    (o) =>
      (o.filename?.endsWith('.pdf') || o.mimeType?.includes('pdf')) &&
      !!o.url &&
      isGeneratedOutput(o.url)
  );
  
  if (legacyOutput?.url) {
    console.log(`[Manus] Found legacy PDF: ${legacyOutput.filename}`);
    return { url: legacyOutput.url, filename: legacyOutput.filename };
  }

  return null;
}

function buildExportPrompt(format: 'pptx' | 'pdf'): string {
  if (format === 'pdf') {
    return 'Please export the presentation to a PDF file and attach it.';
  }
  return 'Please export the presentation to a PowerPoint (.pptx) file and attach it.';
}

function buildOutputSignature(task: ManusTaskResponse): string | null {
  const urls: string[] = [];
  for (const item of task.output || []) {
    for (const content of item.content || []) {
      if (content.fileUrl) urls.push(content.fileUrl);
    }
  }
  for (const output of task.outputs || []) {
    if (output.url) urls.push(output.url);
  }
  if (urls.length === 0) return null;
  return urls.sort().join('|');
}

/** Make authenticated API request */
async function apiRequest<T>(
  apiKey: string,
  baseUrl: string,
  path: string,
  options: RequestInit
): Promise<T> {
  const url = `${baseUrl}${path}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), MANUS_API_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        API_KEY: apiKey,
        ...options.headers,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new ManusError(`Manus API error ${response.status}: ${errorText}`, {
        code: ErrorCode.MANUS_API_ERROR,
      });
    }

    return (await response.json()) as T;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof ManusError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ManusError('Manus API timeout', { code: ErrorCode.MANUS_TIMEOUT });
    }

    throw new ManusError(`Manus API request failed: ${error}`, {
      code: ErrorCode.MANUS_API_ERROR,
    });
  }
}

/** Delay helper */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
