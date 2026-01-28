// Manus API client

import { ManusConfig, ManusGenerateRequest, ManusGenerateResult, ManusClient } from './types';
import { ManusError, ErrorCode } from '../errors';
import { MANUS_API_TIMEOUT_MS, API_RETRY_COUNT, API_RETRY_DELAY_MS } from '../constants';

const DEFAULT_BASE_URL = 'https://api.manus.ai/v1';

/** Create a configured Manus client */
export function createManusClient(config: ManusConfig): ManusClient {
  const baseUrl = config.baseUrl || DEFAULT_BASE_URL;
  const timeoutMs = config.timeoutMs || MANUS_API_TIMEOUT_MS;

  return {
    generatePresentation: (request) => generatePresentation(config.apiKey, baseUrl, timeoutMs, request),
  };
}

/** Generate a presentation with retry logic */
async function generatePresentation(
  apiKey: string,
  baseUrl: string,
  timeoutMs: number,
  request: ManusGenerateRequest
): Promise<ManusGenerateResult> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= API_RETRY_COUNT; attempt++) {
    try {
      return await makeGenerateRequest(apiKey, baseUrl, timeoutMs, request);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < API_RETRY_COUNT && isRetryable(error)) {
        await delay(API_RETRY_DELAY_MS * attempt);
        continue;
      }
      break;
    }
  }

  throw lastError || new ManusError('Unknown error during generation');
}

/** Make the actual API request */
async function makeGenerateRequest(
  apiKey: string,
  baseUrl: string,
  timeoutMs: number,
  request: ManusGenerateRequest
): Promise<ManusGenerateResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text();
      throw new ManusError(`Manus API error: ${response.status}`, { body: errorBody });
    }

    return parseGenerateResponse(await response.json());
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      throw new ManusError('Manus API timeout', { code: ErrorCode.MANUS_TIMEOUT });
    }
    throw error;
  }
}

/** Parse and validate the API response */
function parseGenerateResponse(data: unknown): ManusGenerateResult {
  const response = data as { success?: boolean; output?: { content?: string; filename?: string; slideCount?: number }; error?: { message?: string } };

  if (!response.success || !response.output?.content) {
    const message = response.error?.message || 'Invalid response from Manus API';
    throw new ManusError(message, { code: ErrorCode.MANUS_INVALID_RESPONSE });
  }

  const buffer = Buffer.from(response.output.content, 'base64');

  return {
    buffer,
    filename: response.output.filename || 'output.pptx',
    slideCount: response.output.slideCount || 0,
  };
}

/** Check if error is retryable */
function isRetryable(error: unknown): boolean {
  if (error instanceof ManusError) {
    return error.details?.code !== ErrorCode.MANUS_INVALID_RESPONSE;
  }
  return true;
}

/** Delay helper */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
