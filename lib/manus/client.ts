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
  MANUS_MAX_POLL_ATTEMPTS,
} from '../constants';

const DEFAULT_BASE_URL = 'https://api.manus.ai/v1';

/** Create a configured Manus client */
export function createManusClient(config: ManusConfig): ManusClient {
  const baseUrl = config.baseUrl || DEFAULT_BASE_URL;
  const pollIntervalMs = config.pollIntervalMs || MANUS_POLL_INTERVAL_MS;

  const makeRequest = <T>(path: string, options: RequestInit) =>
    apiRequest<T>(config.apiKey, baseUrl, path, options);

  return {
    uploadFile: (filename, fileUrl) => uploadFile(makeRequest, filename, fileUrl),
    createTask: (request) => createTask(makeRequest, request),
    getTask: (taskId) => getTask(makeRequest, taskId),
    waitForTask: (taskId) => waitForTask(makeRequest, taskId, pollIntervalMs),
    generatePresentation: (request) =>
      generatePresentation(makeRequest, request, pollIntervalMs),
  };
}

type RequestFn = <T>(path: string, options: RequestInit) => Promise<T>;

/** Upload a file to Manus (requires publicly accessible URL) */
async function uploadFile(
  request: RequestFn,
  filename: string,
  fileUrl: string
): Promise<ManusFileResponse> {
  return request<ManusFileResponse>('/files', {
    method: 'POST',
    body: JSON.stringify({ filename, file_url: fileUrl }),
  });
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
  };

  return request<ManusTaskResponse>('/tasks', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** Get task by ID */
async function getTask(request: RequestFn, taskId: string): Promise<ManusTaskResponse> {
  return request<ManusTaskResponse>(`/tasks/${taskId}`, { method: 'GET' });
}

/** Poll task until completion */
async function waitForTask(
  request: RequestFn,
  taskId: string,
  pollIntervalMs: number
): Promise<ManusTaskResponse> {
  for (let attempt = 0; attempt < MANUS_MAX_POLL_ATTEMPTS; attempt++) {
    const task = await getTask(request, taskId);

    if (task.status === 'completed') return task;
    if (task.status === 'failed') {
      throw new ManusError(task.error?.message || 'Task failed', {
        code: ErrorCode.MANUS_TASK_FAILED,
      });
    }

    await delay(pollIntervalMs);
  }

  throw new ManusError('Task polling timeout', { code: ErrorCode.MANUS_TIMEOUT });
}

/** High-level: generate presentation and wait for result */
async function generatePresentation(
  request: RequestFn,
  genRequest: ManusGenerateRequest,
  pollIntervalMs: number
): Promise<ManusGenerateResult> {
  // Build prompt with feedback if available
  const prompt = buildPrompt(genRequest);

  // Collect attachment URLs
  const attachments = genRequest.files?.map((f) => f.url) || [];

  // Create the task
  const task = await createTask(request, {
    prompt,
    attachments,
    taskMode: genRequest.taskMode || 'agent',
    agentProfile: genRequest.agentProfile || 'manus-1.6',
    createShareableLink: true,
  });

  console.log(`[Manus] Task created: ${task.id}, URL: ${task.url}`);

  // Wait for completion
  const completedTask = await waitForTask(request, task.id, pollIntervalMs);

  // Extract PPTX output
  const pptxOutput = findPptxOutput(completedTask);

  return {
    taskId: completedTask.id,
    taskUrl: completedTask.url || '',
    outputUrl: pptxOutput.url,
    filename: pptxOutput.filename || 'presentation.pptx',
  };
}

/** Build the prompt with optional feedback */
function buildPrompt(request: ManusGenerateRequest): string {
  let prompt = request.prompt;

  if (request.previousFeedback) {
    prompt += `\n\n## Previous Feedback to Address\n\n${request.previousFeedback}`;
  }

  // Add output format instruction
  prompt += '\n\nPlease generate the output as a PowerPoint (.pptx) file.';

  return prompt;
}

/** Find PPTX output from task outputs */
function findPptxOutput(task: ManusTaskResponse): { url: string; filename?: string } {
  const output = task.outputs?.find(
    (o) => o.filename?.endsWith('.pptx') || o.mimeType?.includes('presentation')
  );

  if (!output) {
    throw new ManusError('No PPTX output found in task results', {
      code: ErrorCode.MANUS_INVALID_RESPONSE,
    });
  }

  return { url: output.url, filename: output.filename };
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
        Authorization: `Bearer ${apiKey}`,
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
