// Thumbnail generation service
// Uses conversion service to generate slide images

import { ThumbnailResult, ThumbnailService, ThumbnailConfig, DEFAULT_THUMBNAIL_CONFIG } from './types';
import { createConversionService } from '../conversion';

/** Create a thumbnail generation service */
export function createThumbnailService(config?: ThumbnailConfig): ThumbnailService {
  const conversionService = createConversionService();
  const thumbnailConfig = { ...DEFAULT_THUMBNAIL_CONFIG, ...config };

  return {
    generateThumbnails: (pptxBuffer) => generateThumbnails(conversionService, pptxBuffer, thumbnailConfig),
  };
}

/** Generate thumbnails from PPTX */
async function generateThumbnails(
  conversionService: ReturnType<typeof createConversionService>,
  pptxBuffer: Buffer,
  config: ThumbnailConfig
): Promise<ThumbnailResult[]> {
  try {
    const images = await conversionService.pptxToImages(pptxBuffer);

    return images.map((buffer, index) => ({
      slideNumber: index + 1,
      buffer,
      width: config.width || DEFAULT_THUMBNAIL_CONFIG.width!,
      height: config.height || DEFAULT_THUMBNAIL_CONFIG.height!,
    }));
  } catch (error) {
    console.warn('Thumbnail generation failed:', error);
    return [];
  }
}

/** Upload thumbnails to storage and return URLs */
export async function uploadThumbnails(
  thumbnails: ThumbnailResult[],
  runId: string,
  iteration: number,
  uploadFn: (buffer: Buffer, runId: string, iteration: number, slideNumber: number) => Promise<string>
): Promise<string[]> {
  const urls: string[] = [];

  for (const thumbnail of thumbnails) {
    try {
      const url = await uploadFn(thumbnail.buffer, runId, iteration, thumbnail.slideNumber);
      urls.push(url);
    } catch (error) {
      console.warn(`Failed to upload thumbnail ${thumbnail.slideNumber}:`, error);
    }
  }

  return urls;
}
