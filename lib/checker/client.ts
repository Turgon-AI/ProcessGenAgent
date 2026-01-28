// Checker client using Anthropic Claude API

import Anthropic from '@anthropic-ai/sdk';
import { CheckerConfig, CheckerReviewRequest, CheckerReviewResult, CheckerClient } from './types';
import { CheckerError, ErrorCode } from '../errors';
import { createConversionService } from '../conversion';

const DEFAULT_MODEL = 'claude-sonnet-4-20250514';

/** Create a configured Checker client */
export function createCheckerClient(config: CheckerConfig): CheckerClient {
  const client = new Anthropic({ apiKey: config.apiKey });
  const model = config.model || DEFAULT_MODEL;
  const conversionService = createConversionService();

  return {
    reviewPresentation: (request) => reviewPresentation(client, model, conversionService, request),
  };
}

/** Review a presentation using Claude */
async function reviewPresentation(
  client: Anthropic,
  model: string,
  conversionService: ReturnType<typeof createConversionService>,
  request: CheckerReviewRequest
): Promise<CheckerReviewResult> {
  try {
    // Try to convert PPTX to PDF for better review
    const pdfResult = await conversionService.pptxToPdf(request.presentationBuffer);
    const canUsePdf = pdfResult.mimeType === 'application/pdf' && pdfResult.buffer.length > 0;

    const response = await client.messages.create({
      model,
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: canUsePdf
            ? buildContentWithDocument(request.prompt, pdfResult.buffer)
            : buildTextOnlyContent(request),
        },
      ],
    });

    return parseCheckerResponse(response);
  } catch (error) {
    throw wrapApiError(error);
  }
}

/** Build content with PDF document attachment */
function buildContentWithDocument(prompt: string, pdfBuffer: Buffer): Anthropic.MessageCreateParams['messages'][0]['content'] {
  return [
    {
      type: 'document',
      source: {
        type: 'base64',
        media_type: 'application/pdf',
        data: pdfBuffer.toString('base64'),
      },
    },
    {
      type: 'text',
      text: prompt,
    },
  ];
}

/** Build text-only content when PDF conversion not available */
function buildTextOnlyContent(request: CheckerReviewRequest): string {
  return `${request.prompt}

## Presentation File
Filename: ${request.presentationName}
File size: ${request.presentationBuffer.length} bytes

Note: PDF conversion not available. Please evaluate based on the structural requirements in the criteria above.`;
}

/** Parse Claude's response into CheckerReviewResult */
function parseCheckerResponse(response: Anthropic.Message): CheckerReviewResult {
  const textBlock = response.content.find((block) => block.type === 'text');

  if (!textBlock || textBlock.type !== 'text') {
    throw new CheckerError('No text response from checker', ErrorCode.CHECKER_INVALID_RESPONSE);
  }

  return parseJsonResponse(textBlock.text);
}

/** Parse JSON from response text */
function parseJsonResponse(text: string): CheckerReviewResult {
  const jsonMatch = text.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    throw new CheckerError('No JSON found in checker response', ErrorCode.CHECKER_PARSE_ERROR, { text });
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return validateCheckerResult(parsed);
  } catch {
    throw new CheckerError('Failed to parse checker JSON', ErrorCode.CHECKER_PARSE_ERROR, { text });
  }
}

/** Validate and normalize the parsed result */
function validateCheckerResult(data: unknown): CheckerReviewResult {
  const result = data as Record<string, unknown>;

  return {
    passed: typeof result.passed === 'boolean' ? result.passed : false,
    confidence: typeof result.confidence === 'number' ? clamp(result.confidence, 0, 1) : 0,
    feedback: typeof result.feedback === 'string' ? result.feedback : 'No feedback provided',
    issues: Array.isArray(result.issues) ? result.issues.filter((i) => typeof i === 'string') : [],
  };
}

/** Wrap API errors in CheckerError */
function wrapApiError(error: unknown): CheckerError {
  if (error instanceof CheckerError) return error;

  const message = error instanceof Error ? error.message : 'Unknown checker error';
  return new CheckerError(message, ErrorCode.CHECKER_API_ERROR);
}

/** Clamp a number between min and max */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
