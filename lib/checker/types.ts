// Checker type definitions

export interface CheckerConfig {
  apiKey: string;
  model?: string;
  timeoutMs?: number;
}

export interface CheckerReviewRequest {
  prompt: string;
  presentationBuffer: Buffer;
  presentationName: string;
}

export interface CheckerReviewResult {
  passed: boolean;
  confidence: number;
  feedback: string;
  issues: string[];
}

export interface CheckerClient {
  reviewPresentation: (request: CheckerReviewRequest) => Promise<CheckerReviewResult>;
}
