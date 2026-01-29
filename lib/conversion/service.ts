// Document conversion service
// In production, use LibreOffice or a cloud conversion API

import { ConversionResult, ConversionService } from './types';
import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/** Create a conversion service */
export function createConversionService(): ConversionService {
  return {
    pptxToPdf: convertPptxToPdf,
    pptxToImages: convertPptxToImages,
    fileToPdf: convertFileToPdf,
  };
}

/** Convert PPTX to PDF */
async function convertPptxToPdf(pptxBuffer: Buffer): Promise<ConversionResult> {
  return convertFileToPdf(
    pptxBuffer,
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  );
}

/** Convert any supported file to PDF */
async function convertFileToPdf(
  fileBuffer: Buffer,
  mimeType: string
): Promise<ConversionResult> {
  const apiUrl = process.env.CONVERSION_API_URL;
  const libreOfficePath = process.env.LIBREOFFICE_PATH;

  if (apiUrl) {
    return await cloudConvertToPdf(fileBuffer, apiUrl, mimeType);
  }

  if (libreOfficePath) {
    return await localConvertToPdf(fileBuffer, mimeType, libreOfficePath);
  }

  // Fallback: Return empty buffer to skip invalid PDF attachments
  console.warn('No conversion service configured, skipping PDF conversion');
  return createMockPdfResult(fileBuffer);
}

/** Convert PPTX to slide images */
async function convertPptxToImages(pptxBuffer: Buffer): Promise<Buffer[]> {
  const apiUrl = process.env.CONVERSION_API_URL;

  if (apiUrl) {
    return await cloudConvertToImages(pptxBuffer, apiUrl);
  }

  // Fallback: Return empty array for development
  console.warn('No conversion service configured, thumbnails not available');
  return [];
}

/** Cloud conversion to PDF */
async function cloudConvertToPdf(
  fileBuffer: Buffer,
  apiUrl: string,
  mimeType: string
): Promise<ConversionResult> {
  const response = await fetch(`${apiUrl}/convert/pdf`, {
    method: 'POST',
    headers: {
      'Content-Type': mimeType,
      'Authorization': `Bearer ${process.env.CONVERSION_API_KEY || ''}`,
    },
    body: new Uint8Array(fileBuffer),
  });

  if (!response.ok) {
    throw new Error(`Conversion failed: ${response.statusText}`);
  }

  const data = await response.json() as { pdf: string; pageCount: number };

  return {
    buffer: Buffer.from(data.pdf, 'base64'),
    mimeType: 'application/pdf',
    pageCount: data.pageCount,
  };
}

/** Cloud conversion to images */
async function cloudConvertToImages(
  pptxBuffer: Buffer,
  apiUrl: string
): Promise<Buffer[]> {
  const response = await fetch(`${apiUrl}/convert/images`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'Authorization': `Bearer ${process.env.CONVERSION_API_KEY || ''}`,
    },
    body: new Uint8Array(pptxBuffer),
  });

  if (!response.ok) {
    throw new Error(`Conversion failed: ${response.statusText}`);
  }

  const data = await response.json() as { images: string[] };
  return data.images.map((img) => Buffer.from(img, 'base64'));
}

async function localConvertToPdf(
  fileBuffer: Buffer,
  mimeType: string,
  libreOfficePath: string
): Promise<ConversionResult> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'conversion-'));
  const inputPath = path.join(tempDir, `input${extensionForMime(mimeType)}`);
  const outputPath = path.join(tempDir, 'input.pdf');

  try {
    await fs.writeFile(inputPath, fileBuffer);

    await execFileAsync(libreOfficePath, [
      '--headless',
      '--convert-to',
      'pdf',
      '--outdir',
      tempDir,
      inputPath,
    ]);

    const pdfBuffer = await fs.readFile(outputPath);

    return {
      buffer: pdfBuffer,
      mimeType: 'application/pdf',
      pageCount: 1,
    };
  } catch (error) {
    throw new Error(`Local conversion failed: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    await safeRemove(tempDir);
  }
}

function extensionForMime(mimeType: string): string {
  const mapping: Record<string, string> = {
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
    'application/vnd.ms-powerpoint': '.ppt',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/msword': '.doc',
    'text/plain': '.txt',
    'application/pdf': '.pdf',
  };

  return mapping[mimeType] || '.bin';
}

async function safeRemove(targetPath: string): Promise<void> {
  try {
    await fs.rm(targetPath, { recursive: true, force: true });
  } catch (error) {
    console.warn(`Failed to clean temp conversion dir: ${targetPath}`, error);
  }
}

/** Create mock PDF result for development */
function createMockPdfResult(pptxBuffer: Buffer): ConversionResult {
  // Return an empty buffer so callers skip attaching invalid PDFs.
  return {
    buffer: Buffer.alloc(0),
    mimeType: 'application/pdf',
    pageCount: 1,
  };
}
