// Document conversion types

export interface ConversionResult {
  buffer: Buffer;
  mimeType: string;
  pageCount: number;
}

export interface ConversionService {
  pptxToPdf: (pptxBuffer: Buffer) => Promise<ConversionResult>;
  pptxToImages: (pptxBuffer: Buffer) => Promise<Buffer[]>;
}

export interface ConversionConfig {
  // For cloud conversion services
  apiKey?: string;
  apiUrl?: string;
  // For local LibreOffice
  libreOfficePath?: string;
}
