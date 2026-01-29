// Checker client using Anthropic Claude API

import Anthropic from '@anthropic-ai/sdk';
import {
  CheckerAttachment,
  CheckerConfig,
  CheckerReviewRequest,
  CheckerReviewResult,
  CheckerClient,
} from './types';
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
    const content = await buildContentBlocks(conversionService, request);

    console.log(
      `[Checker] Sending Claude request: model=${model}, blocks=${Array.isArray(content) ? content.length : 1}`
    );
    console.log(`[Checker] Claude request preview: ${summarizeClaudeContent(content)}`);
    const response = await client.messages.create({
      model,
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content,
        },
      ],
    });

    if ('usage' in response && response.usage) {
      console.log(
        `[Checker] Claude response usage: input=${response.usage.input_tokens}, output=${response.usage.output_tokens}`
      );
    }
    const responseText = response.content.find((block) => block.type === 'text');
    if (responseText && responseText.type === 'text') {
      console.log(`[Checker] Claude response text: ${truncateText(responseText.text, 4000)}`);
    }
    return parseCheckerResponse(response);
  } catch (error) {
    throw wrapApiError(error);
  }
}

async function buildContentBlocks(
  conversionService: ReturnType<typeof createConversionService>,
  request: CheckerReviewRequest
): Promise<Anthropic.MessageCreateParams['messages'][0]['content']> {
  console.log('\n---------- BUILDING CLAUDE REQUEST ----------');
  console.log(`[PRESENTATION TO REVIEW]:`);
  console.log(`  File: ${request.presentationName}`);
  console.log(`  Type: ${request.presentationMimeType}`);
  console.log(`  Size: ${request.presentationBuffer.length} bytes`);
  
  const blocks: ClaudeContentBlock[] = [];
  const skipped: string[] = [];
  const included: string[] = [];

  const presentationBlock = await toDocumentBlock(
    conversionService,
    request.presentationBuffer,
    request.presentationMimeType,
    request.presentationName
  );

  if (presentationBlock) {
    blocks.push(presentationBlock);
    included.push(`PRESENTATION: ${request.presentationName} (${presentationBlock.type})`);
  } else {
    skipped.push(`PRESENTATION: ${request.presentationName}`);
  }

  const summary: Record<string, number> = {
    document: 0,
    image: 0,
    text: 0,
  };

  console.log(`\n[ADDITIONAL ATTACHMENTS]:`);
  if (!request.attachments || request.attachments.length === 0) {
    console.log('  (none)');
  }
  
  for (const attachment of request.attachments || []) {
    console.log(`  Processing: ${attachment.name} (${attachment.mimeType}, ${attachment.buffer.length} bytes)`);
    const block = await toAttachmentBlock(conversionService, attachment);
    if (block) {
      blocks.push(block);
      summary[block.type] = (summary[block.type] || 0) + 1;
      included.push(`ATTACHMENT: ${attachment.name} -> ${block.type}`);
      console.log(`    -> INCLUDED as ${block.type}`);
    } else {
      skipped.push(attachment.name);
      console.log(`    -> SKIPPED (unsupported or conversion failed)`);
    }
  }

  const prompt = skipped.length
    ? `${request.prompt}\n\nNote: Some attachments could not be converted and were skipped: ${skipped.join(', ')}`
    : request.prompt;

  const promptBlock = {
    type: 'text',
    text: prompt,
  } as const;
  blocks.push(promptBlock);
  summary.text += 1;

  console.log(`\n[FINAL CLAUDE REQUEST SUMMARY]:`);
  console.log(`  Total blocks: ${blocks.length}`);
  console.log(`  Documents (PDF): ${summary.document}`);
  console.log(`  Images: ${summary.image}`);
  console.log(`  Text blocks: ${summary.text}`);
  console.log(`\n[INCLUDED IN REQUEST]:`);
  included.forEach((item, i) => console.log(`  ${i + 1}. ${item}`));
  if (skipped.length > 0) {
    console.log(`\n[SKIPPED (not sent to Claude)]:`);
    skipped.forEach((item, i) => console.log(`  ${i + 1}. ${item}`));
  }
  console.log('---------------------------------------------\n');
  
  if (blocks.length === 1) {
    return buildTextOnlyContent(request);
  }

  return blocks as Anthropic.MessageCreateParams['messages'][0]['content'];
}

function buildTextOnlyContent(request: CheckerReviewRequest): string {
  return `${request.prompt}

## Presentation File
Filename: ${request.presentationName}
File size: ${request.presentationBuffer.length} bytes

Note: PDF conversion not available. Please evaluate based on the structural requirements in the criteria above.`;
}

async function toAttachmentBlock(
  conversionService: ReturnType<typeof createConversionService>,
  attachment: CheckerAttachment
): Promise<ClaudeContentBlock | null> {
  if (attachment.mimeType === 'application/pdf') {
    return {
      type: 'document',
      source: {
        type: 'base64',
        media_type: 'application/pdf',
        data: attachment.buffer.toString('base64'),
      },
    };
  }

  if (attachment.mimeType.startsWith('text/')) {
    const text = attachment.buffer.toString('utf-8');
    const trimmed = truncateText(text, 12000);
    return {
      type: 'text',
      text: `Attachment: ${attachment.name}\n\n${trimmed}`,
    };
  }

  if (attachment.mimeType.startsWith('image/')) {
    const imageMime = normalizeImageMime(attachment.mimeType);
    if (!imageMime) {
      console.log(
        `[Checker] Unsupported image type for Claude: ${attachment.name} (${attachment.mimeType})`
      );
      return null;
    }
    return {
      type: 'image',
      source: {
        type: 'base64',
        media_type: imageMime,
        data: attachment.buffer.toString('base64'),
      },
    };
  }

  if (isConvertibleOfficeMime(attachment.mimeType)) {
    return toDocumentBlock(conversionService, attachment.buffer, attachment.mimeType, attachment.name);
  }

  console.log(
    `[Checker] Unsupported attachment for Claude: ${attachment.name} (${attachment.mimeType})`
  );
  return null;
}

async function toDocumentBlock(
  conversionService: ReturnType<typeof createConversionService>,
  buffer: Buffer,
  mimeType: string,
  name: string
): Promise<ClaudeContentBlock | null> {
  if (mimeType === 'application/pdf') {
    console.log(`[Checker] Using existing PDF for ${name}`);
    return {
      type: 'document',
      source: {
        type: 'base64',
        media_type: 'application/pdf',
        data: buffer.toString('base64'),
      },
    };
  }

  if (!isConvertibleOfficeMime(mimeType)) {
    console.log(`[Checker] Skipping conversion for ${name} (${mimeType})`);
    return null;
  }

  try {
    console.log(`[Checker] Converting ${name} to PDF from ${mimeType}`);
    const pdfResult = await conversionService.fileToPdf(buffer, mimeType);
    if (pdfResult.mimeType === 'application/pdf' && pdfResult.buffer.length > 0) {
      console.log(`[Checker] PDF conversion ok for ${name} (${pdfResult.buffer.length} bytes)`);
      return {
        type: 'document',
        source: {
          type: 'base64',
          media_type: 'application/pdf',
          data: pdfResult.buffer.toString('base64'),
        },
      };
    }
    console.log(`[Checker] PDF conversion skipped for ${name} (empty or invalid result)`);
  } catch (error) {
    console.warn(`Failed to convert attachment ${name} to PDF:`, error);
  }

  return null;
}

function isConvertibleOfficeMime(mimeType: string): boolean {
  return (
    mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
    mimeType === 'application/vnd.ms-powerpoint' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword'
  );
}

function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n\n[truncated ${text.length - maxChars} chars]`;
}

function summarizeClaudeContent(
  content: Anthropic.MessageCreateParams['messages'][0]['content']
): string {
  if (typeof content === 'string') {
    return `text(${Math.min(content.length, 2000)} chars)`;
  }
  if (!Array.isArray(content)) {
    return 'unknown';
  }

  return (content as unknown as Array<Record<string, unknown>>)
    .map((block) => {
      const type = typeof block.type === 'string' ? block.type : 'unknown';
      if (type === 'text' && typeof block.text === 'string') {
        return `text(${Math.min(block.text.length, 2000)} chars)`;
      }
      if (type === 'image') {
        const source = block.source as { media_type?: string } | undefined;
        return `image(${source?.media_type || 'unknown'})`;
      }
      if (type === 'document') {
        const source = block.source as { media_type?: string } | undefined;
        return `document(${source?.media_type || 'unknown'})`;
      }
      return type;
    })
    .join(', ');
}

function normalizeImageMime(mimeType: string): 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' | null {
  if (mimeType === 'image/jpeg' || mimeType === 'image/png' || mimeType === 'image/gif' || mimeType === 'image/webp') {
    return mimeType;
  }
  return null;
}

type ClaudeContentBlock =
  | { type: 'text'; text: string }
  | {
      type: 'image';
      source: {
        type: 'base64';
        media_type: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
        data: string;
      };
    }
  | {
      type: 'document';
      source: {
        type: 'base64';
        media_type: 'application/pdf';
        data: string;
      };
    };

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
