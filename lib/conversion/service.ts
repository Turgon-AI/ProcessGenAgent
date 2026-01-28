// Document conversion service
// In production, use LibreOffice or a cloud conversion API

import { ConversionResult, ConversionService } from './types';

/** Create a conversion service */
export function createConversionService(): ConversionService {
  return {
    pptxToPdf: convertPptxToPdf,
    pptxToImages: convertPptxToImages,
  };
}

/** Convert PPTX to PDF */
async function convertPptxToPdf(pptxBuffer: Buffer): Promise<ConversionResult> {
  // Check if we have a conversion API configured
  const apiUrl = process.env.CONVERSION_API_URL;

  if (apiUrl) {
    return await cloudConvertToPdf(pptxBuffer, apiUrl);
  }

  // Fallback: Return a mock PDF for development
  // In production, set up LibreOffice or use a cloud service
  console.warn('No conversion service configured, using mock PDF');
  return createMockPdfResult(pptxBuffer);
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
  pptxBuffer: Buffer,
  apiUrl: string
): Promise<ConversionResult> {
  const response = await fetch(`${apiUrl}/convert/pdf`, {
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

/** Create mock PDF result for development */
function createMockPdfResult(pptxBuffer: Buffer): ConversionResult {
  // Return the original buffer with PDF metadata
  // This is just for development - checker will work with text-only review
  return {
    buffer: pptxBuffer,
    mimeType: 'application/pdf',
    pageCount: 1,
  };
}
