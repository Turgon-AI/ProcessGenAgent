// Manus API type definitions

export interface ManusConfig {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
}

export interface ManusFileInput {
  name: string;
  content: string; // Base64 encoded
  mimeType: string;
}

export interface ManusGenerateRequest {
  prompt: string;
  files?: ManusFileInput[];
  outputFormat: 'pptx';
  previousFeedback?: string;
}

export interface ManusGenerateResponse {
  success: boolean;
  output?: {
    content: string; // Base64 encoded PPTX
    filename: string;
    mimeType: string;
    slideCount: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface ManusClient {
  generatePresentation: (request: ManusGenerateRequest) => Promise<ManusGenerateResult>;
}

export interface ManusGenerateResult {
  buffer: Buffer;
  filename: string;
  slideCount: number;
}
