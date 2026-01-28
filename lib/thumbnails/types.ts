// Thumbnail generation types

export interface ThumbnailResult {
  slideNumber: number;
  buffer: Buffer;
  width: number;
  height: number;
}

export interface ThumbnailService {
  generateThumbnails: (pptxBuffer: Buffer) => Promise<ThumbnailResult[]>;
}

export interface ThumbnailConfig {
  width?: number;
  height?: number;
  format?: 'png' | 'jpeg';
  quality?: number;
}

export const DEFAULT_THUMBNAIL_CONFIG: ThumbnailConfig = {
  width: 320,
  height: 180,
  format: 'png',
  quality: 80,
};
